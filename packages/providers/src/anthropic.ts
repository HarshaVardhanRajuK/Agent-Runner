import Anthropic from '@anthropic-ai/sdk'
import type {
  ModelProvider,
  StreamingResponse,
  LLMMessage,
  Message,
  ToolSchema,
  AssistantContentBlock,
} from '@agent-runner/shared'

export class AnthropicProvider implements ModelProvider {
  readonly model: string
  readonly #client: Anthropic
  readonly #systemPrompt: string

  constructor(apiKey: string, model: string, systemPrompt: string) {
    this.model = model
    this.#client = new Anthropic({ apiKey })
    this.#systemPrompt = systemPrompt
  }

  stream(messages: Message[], tools: ToolSchema[]): StreamingResponse {
    const anthropicMessages = toAnthropicMessages(messages)
    const anthropicTools = toAnthropicTools(tools)

    // Create the stream lazily — it starts when tokens() or complete() is called
    const streamPromise = this.#client.messages.stream({
      model: this.model,
      max_tokens: 8096,
      system: this.#systemPrompt,
      tools: anthropicTools,
      messages: anthropicMessages,
    })

    return {
      tokens: async function* () {
        const stream = await streamPromise
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            yield event.delta.text
          }
        }
      },

      complete: async (): Promise<LLMMessage> => {
        const stream = await streamPromise
        const msg = await stream.finalMessage()
        return {
          role: 'assistant',
          content: toSharedContent(msg.content),
          stopReason:
            msg.stop_reason === 'tool_use'
              ? 'tool_use'
              : msg.stop_reason === 'max_tokens'
                ? 'max_tokens'
                : 'end_turn',
        }
      },
    }
  }
}

// ---------------------------------------------------------------------------
// Format translators
// ---------------------------------------------------------------------------

function toAnthropicMessages(
  messages: Message[],
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = []

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({ role: 'user', content: msg.content })
    } else if (msg.role === 'assistant') {
      result.push({
        role: 'assistant',
        content: msg.content.map((block) => {
          if (block.type === 'text') {
            return { type: 'text' as const, text: block.text }
          }
          return {
            type: 'tool_use' as const,
            id: block.id,
            name: block.name,
            input: block.input,
          }
        }),
      })
    } else if (msg.role === 'tool') {
      // Tool results go back as role=user in Anthropic's API
      result.push({
        role: 'user',
        content: [
          {
            type: 'tool_result' as const,
            tool_use_id: msg.toolCallId,
            content: msg.content,
          },
        ],
      })
    } else if (msg.role === 'summary') {
      result.push({ role: 'user', content: `[CONTEXT SUMMARY]\n${msg.content}` })
    }
  }

  return result
}

function toAnthropicTools(tools: ToolSchema[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
  }))
}

function toSharedContent(
  content: Anthropic.ContentBlock[],
): AssistantContentBlock[] {
  const result: AssistantContentBlock[] = []
  for (const block of content) {
    if (block.type === 'text') {
      result.push({ type: 'text' as const, text: block.text })
    } else if (block.type === 'tool_use') {
      result.push({
        type: 'tool_use' as const,
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      })
    }
    // 'thinking' blocks are internal reasoning — skip, not needed by runtime
  }
  return result
}
