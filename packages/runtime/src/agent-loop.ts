import type { RuntimeEvent, ModelProvider, Message } from '@agent-runner/shared'
import type { ToolRegistry } from '@agent-runner/tools'
import { buildContext } from '@agent-runner/context'
import type { SessionManager } from './session-manager.js'

export interface RunOptions {
  task: string
  sessionManager: SessionManager
  provider: ModelProvider
  tools: ToolRegistry
  maxIterations?: number
}

const DEFAULT_MAX_ITERATIONS = 30

/**
 * The agent loop — the heart of the runtime.
 *
 * Yields RuntimeEvents as it works. Clients consume this async generator
 * and render each event (tokens to chat panel, tool calls as cards, etc).
 *
 * The loop:
 *  1. Append the user task to session history
 *  2. Build context (compress if needed)
 *  3. Call LLM — stream tokens
 *  4. If stop_reason == end_turn → save session, yield task_completed, return
 *  5. If stop_reason == tool_use → execute tools, append results, loop
 *  6. Hard cap at maxIterations → yield task_failed, return
 */
export async function* run(options: RunOptions): AsyncGenerator<RuntimeEvent> {
  const { task, sessionManager, provider, tools, maxIterations = DEFAULT_MAX_ITERATIONS } =
    options

  // Append this task to the session
  sessionManager.addMessage({ role: 'user', content: task })
  sessionManager.incrementTaskCount()

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // ── Build context (handles token budget + compression) ────────────────
    const { messages, budget, compressed } = buildContext(
      sessionManager.messages,
      provider.model,
    )

    if (compressed) {
      yield {
        type: 'context_compressed',
        tokensBefore: budget.used,
        tokensAfter: budget.used,
      }
    }

    // ── Stream LLM response ───────────────────────────────────────────────
    const streaming = provider.stream(messages, tools.schemas())

    for await (const token of streaming.tokens()) {
      yield { type: 'assistant_token', token }
    }

    const llmMessage = await streaming.complete()

    // Append to session
    sessionManager.addMessage({
      role: 'assistant',
      content: llmMessage.content,
      stopReason: llmMessage.stopReason,
    })

    // ── Check termination ─────────────────────────────────────────────────
    if (llmMessage.stopReason === 'end_turn') {
      const summary =
        llmMessage.content
          .filter((b) => b.type === 'text')
          .map((b) => (b.type === 'text' ? b.text : ''))
          .join('') || 'Task completed.'

      sessionManager.save()
      yield { type: 'task_completed', summary }
      return
    }

    // ── Execute tool calls ────────────────────────────────────────────────
    for (const block of llmMessage.content) {
      if (block.type !== 'tool_use') continue

      yield { type: 'tool_started', name: block.name, input: block.input }

      const result = await tools.execute(block.name, block.input)

      yield {
        type: 'tool_completed',
        name: block.name,
        result: result.output,
        durationMs: result.durationMs,
      }

      // Append tool result to session
      const toolMsg: Message = {
        role: 'tool',
        toolCallId: block.id,
        toolName: block.name,
        content: result.output,
      }
      sessionManager.addMessage(toolMsg)
    }
  }

  // ── Iteration cap ─────────────────────────────────────────────────────
  sessionManager.save()
  yield {
    type: 'task_failed',
    error: `Reached maximum iterations (${maxIterations}). Task may be incomplete.`,
  }
}
