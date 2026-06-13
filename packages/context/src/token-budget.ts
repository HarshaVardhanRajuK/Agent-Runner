import type { Message } from '@agent-runner/shared'

/** Tokens to keep free for the model's response */
const RESPONSE_RESERVE = 4_096

/** Compression triggers at this fraction of budget consumed */
export const COMPRESSION_THRESHOLD = 0.70

/** How many recent messages to keep verbatim during compression */
export const KEEP_LAST_N = 6

const MODEL_LIMITS: Record<string, number> = {
  'claude-sonnet-4-5': 200_000,
  'claude-opus-4-5': 200_000,
  'claude-haiku-4-5': 200_000,
  'gemini-2.0-flash': 1_000_000,
  'gemini-1.5-flash': 1_000_000,
  'deepseek-chat': 64_000,
  'deepseek-reasoner': 64_000,
  'MiniMax-Text-01': 1_000_000,
  'abab6.5s-chat': 245_760,
}

export class TokenBudget {
  used: number = 0
  readonly limit: number

  constructor(model: string) {
    this.limit = MODEL_LIMITS[model] ?? 128_000
  }

  get available(): number {
    return this.limit - this.used - RESPONSE_RESERVE
  }

  get pressure(): number {
    const usable = this.limit - RESPONSE_RESERVE
    return usable > 0 ? this.used / usable : 1
  }

  get needsCompression(): boolean {
    return this.pressure >= COMPRESSION_THRESHOLD
  }

  toString(): string {
    return (
      `tokens: ${this.used.toLocaleString()} / ${this.limit.toLocaleString()} ` +
      `(${Math.round(this.pressure * 100)}% used, ` +
      `${this.available.toLocaleString()} remaining)`
    )
  }
}

/**
 * Rough token estimate — 1 token per 4 characters of JSON.
 * Fast, no API call. Good enough for compression decisions.
 */
export function estimateTokens(messages: Message[]): number {
  return Math.ceil(JSON.stringify(messages).length / 4)
}
