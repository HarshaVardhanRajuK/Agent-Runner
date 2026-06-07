import type { Message } from '@agent-runner/shared'
import { KEEP_LAST_N } from './token-budget.js'

/**
 * Sliding window compression.
 *
 * Keeps:
 *  - messages[0]  — the original user task (north star, never dropped)
 *  - messages[-keepLastN..] — the most recent N messages verbatim
 *
 * Replaces everything in between with a trim marker so the LLM knows
 * context was removed.
 */
export function compressHistory(
  messages: Message[],
  keepLastN: number = KEEP_LAST_N,
): Message[] {
  if (messages.length <= keepLastN + 1) {
    return messages // nothing to compress
  }

  const first = messages[0]!
  const recent = messages.slice(-keepLastN)
  const droppedCount = messages.length - 1 - keepLastN

  const trimMarker: Message = {
    role: 'summary',
    content:
      `[CONTEXT TRIMMED: ${droppedCount} earlier messages were removed to stay within ` +
      `the context window. The original task and recent messages follow.]`,
    replacedCount: droppedCount,
  }

  return [first, trimMarker, ...recent]
}
