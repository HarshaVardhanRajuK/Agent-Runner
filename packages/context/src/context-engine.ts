import type { Message, Logger } from '@agent-runner/shared'
import { silentLogger } from '@agent-runner/shared'
import { TokenBudget, estimateTokens, COMPRESSION_THRESHOLD } from './token-budget.js'
import { compressHistory } from './compressor.js'

export interface ContextResult {
  messages: Message[]
  budget: TokenBudget
  compressed: boolean
}

/**
 * Build the messages array to send to the LLM for this iteration.
 */
export function buildContext(messages: Message[], model: string, logger?: Logger): ContextResult {
  const log = logger ?? silentLogger
  const budget = new TokenBudget(model)
  budget.used = estimateTokens(messages)
  log.debug(`Context: ${messages.length} messages, ${budget.used} tokens (${budget.pressure.toFixed(2)} pressure)`)

  if (budget.pressure >= COMPRESSION_THRESHOLD) {
    log.info(`Context compression triggered at ${(budget.pressure * 100).toFixed(0)}% pressure`)
    const compressed = compressHistory(messages)
    budget.used = estimateTokens(compressed)
    log.info(`Context compressed: ${messages.length} → ${compressed.length} messages, ${budget.used} tokens`)
    return { messages: compressed, budget, compressed: true }
  }

  return { messages, budget, compressed: false }
}
