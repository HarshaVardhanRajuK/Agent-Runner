import type { Logger } from '@agent-runner/shared'
import { OpenAICompatibleProvider } from './openai-compatible.js'

export class CommandCodeProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, model: string, systemPrompt: string, logger?: Logger) {
    super({
      apiKey,
      model,
      systemPrompt,
      baseURL: 'https://api.commandcode.ai/provider/v1',
      ...(logger !== undefined ? { logger } : {}),
    })
  }
}
