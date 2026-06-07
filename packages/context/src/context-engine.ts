import type { Message } from '@agent-runner/shared'
import { TokenBudget, estimateTokens, COMPRESSION_THRESHOLD } from './token-budget.js'
import { compressHistory } from './compressor.js'

export interface ContextResult {
  messages: Message[]
  budget: TokenBudget
  compressed: boolean
}

/**
 * Build the messages array to send to the LLM for this iteration.
 *
 * v0.1: returns session history, compressing if token pressure is too high.
 * v0.2+: will inject retrieved codebase context before returning.
 * v0.3+: will inject memory (user preferences) into the system prompt prefix.
 */
export function buildContext(messages: Message[], model: string): ContextResult {
  const budget = new TokenBudget(model)
  budget.used = estimateTokens(messages)

  if (budget.pressure >= COMPRESSION_THRESHOLD) {
    const compressed = compressHistory(messages)
    budget.used = estimateTokens(compressed)
    return { messages: compressed, budget, compressed: true }
  }

  return { messages, budget, compressed: false }
}
