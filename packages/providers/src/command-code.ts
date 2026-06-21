import { OpenAICompatibleProvider } from './openai-compatible.js'

export class CommandCodeProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, model: string, systemPrompt: string) {
    super({
      apiKey,
      model,
      systemPrompt,
      baseURL: 'https://api.commandcode.ai/provider/v1',
    })
  }
}
