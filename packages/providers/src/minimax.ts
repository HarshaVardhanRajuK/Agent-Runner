import { OpenAICompatibleProvider } from './openai-compatible.js'

export class MiniMaxProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, model: string, systemPrompt: string) {
    super({ apiKey, model, systemPrompt, baseURL: 'https://api.minimax.chat/v1' })
  }
}
