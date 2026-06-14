import * as vscode from 'vscode'
import { PROVIDER_CATALOG } from '@agent-runner/shared'
import type { SettingsState } from '@agent-runner/shared'
import { log } from '../log.js'

const MIGRATION_DONE_KEY = 'agent-runner.secretsMigrated'
const SELECTED_MODEL_KEY = 'agent-runner.selectedModel'
const DEFAULT_MODEL = 'claude-sonnet-4-5'

export class ConfigService {
  readonly #secrets: vscode.SecretStorage
  readonly #globalState: vscode.Memento

  constructor(context: vscode.ExtensionContext) {
    this.#secrets = context.secrets
    this.#globalState = context.globalState
  }

  async getApiKey(secretKey: string): Promise<string | undefined> {
    return this.#secrets.get(secretKey)
  }

  async setApiKey(secretKey: string, value: string): Promise<void> {
    if (value === '') {
      await this.#secrets.delete(secretKey)
    } else {
      await this.#secrets.store(secretKey, value)
    }
  }

  getModel(): string {
    return this.#globalState.get<string>(SELECTED_MODEL_KEY) ?? DEFAULT_MODEL
  }

  async setModel(model: string): Promise<void> {
    await this.#globalState.update(SELECTED_MODEL_KEY, model)
  }

  async getSettingsState(): Promise<SettingsState> {
    const selectedModel = this.getModel()
    const providers = await Promise.all(
      PROVIDER_CATALOG.map(async (p) => ({
        id: p.id,
        label: p.label,
        hasKey: !!(await this.#secrets.get(p.secretKey)),
        models: p.models,
      })),
    )
    return { selectedModel, providers }
  }

  async migrateFromSettings(): Promise<void> {
    if (this.#globalState.get<boolean>(MIGRATION_DONE_KEY)) return

    const config = vscode.workspace.getConfiguration('agent-runner')
    let migrated = false

    for (const provider of PROVIDER_CATALOG) {
      // Derive the config key name from the secretKey
      // e.g. 'agent-runner.anthropicApiKey' → 'anthropicApiKey'
      const configProp = provider.secretKey.replace('agent-runner.', '')
      const legacyKey = config.get<string>(configProp)
      if (legacyKey) {
        await this.#secrets.store(provider.secretKey, legacyKey)
        try {
          await config.update(configProp, undefined, vscode.ConfigurationTarget.Global)
          await config.update(configProp, undefined, vscode.ConfigurationTarget.Workspace)
        } catch {
          // Best-effort clear; not all configs are writable
        }
        log.info(`Migrated legacy ${configProp} into SecretStorage`)
        migrated = true
      }
    }

    await this.#globalState.update(MIGRATION_DONE_KEY, true)
    if (migrated) log.info('Legacy API key migration complete')
  }
}
