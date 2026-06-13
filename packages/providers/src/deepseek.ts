import { OpenAICompatibleProvider } from './openai-compatible.js'

export class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, model: string, systemPrompt: string) {
    super({ apiKey, model, systemPrompt, baseURL: 'https://api.deepseek.com/v1' })
  }
}
