export interface ModelInfo {
  id: string
  label: string
}

export interface ProviderInfo {
  id: 'anthropic' | 'deepseek' | 'minimax' | 'command-code'
  label: string
  secretKey: string
  models: ModelInfo[]
}

export const PROVIDER_CATALOG: ProviderInfo[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    secretKey: 'agent-runner.anthropicApiKey',
    models: [
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
      { id: 'claude-fable-5', label: 'Claude Fable 5' },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    secretKey: 'agent-runner.deepseekApiKey',
    models: [
      { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash (fast)' },
      { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro (premium)' },
    ],
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    secretKey: 'agent-runner.minimaxApiKey',
    models: [
      { id: 'MiniMax-M3', label: 'MiniMax M3' },
      { id: 'MiniMax-M2.7', label: 'MiniMax M2.7' },
    ],
  },
  {
    id: 'command-code',
    label: 'Command Code',
    secretKey: 'agent-runner.commandCodeApiKey',
    models: [
      { id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash (via Command Code)' },
      { id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro (via Command Code)' },
    ],
  },
]

export function providerForModel(modelId: string): ProviderInfo | undefined {
  return PROVIDER_CATALOG.find((p) => p.models.some((m) => m.id === modelId))
}
