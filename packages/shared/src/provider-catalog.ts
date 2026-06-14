export interface ModelInfo {
  id: string
  label: string
}

export interface ProviderInfo {
  id: 'anthropic' | 'deepseek' | 'minimax'
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
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
      { id: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    secretKey: 'agent-runner.deepseekApiKey',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek-V3 (fast)' },
      { id: 'deepseek-reasoner', label: 'DeepSeek-R1 (reasoning)' },
    ],
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    secretKey: 'agent-runner.minimaxApiKey',
    models: [
      { id: 'MiniMax-Text-01', label: 'MiniMax Text-01 (1M ctx)' },
      { id: 'abab6.5s-chat', label: 'MiniMax abab6.5s (fast)' },
    ],
  },
]

export function providerForModel(modelId: string): ProviderInfo | undefined {
  return PROVIDER_CATALOG.find((p) => p.models.some((m) => m.id === modelId))
}
