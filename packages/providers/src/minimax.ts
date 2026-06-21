import type { Logger } from '@agent-runner/shared'
import { OpenAICompatibleProvider } from './openai-compatible.js'

export class MiniMaxProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, model: string, systemPrompt: string, logger?: Logger) {
    super({
      apiKey, model, systemPrompt,
      baseURL: 'https://api.minimax.chat/v1',
      ...(logger !== undefined ? { logger } : {}),
    })
  }
}
