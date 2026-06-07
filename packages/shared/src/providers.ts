/**
 * ModelProvider — the interface the runtime uses to talk to LLMs.
 * The runtime never imports from @anthropic-ai/sdk or @google/genai directly.
 */

import type { Message, AssistantContentBlock, StopReason } from './session.js'
import type { ToolSchema } from './tools.js'

export interface LLMMessage {
  role: 'assistant'
  content: AssistantContentBlock[]
  stopReason: StopReason
}

export interface StreamingResponse {
  /** Yields tokens as they stream in */
  tokens(): AsyncGenerator<string>
  /** Resolves to the complete message once streaming finishes */
  complete(): Promise<LLMMessage>
}

export interface ModelProvider {
  readonly model: string
  stream(messages: Message[], tools: ToolSchema[]): StreamingResponse
}
