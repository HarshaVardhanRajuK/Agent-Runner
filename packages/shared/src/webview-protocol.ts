/**
 * Message protocol between the VS Code Webview and Extension Host.
 * Both directions are strictly typed.
 */

import type { RuntimeEvent } from './events.js'

export interface ProviderSettingsEntry {
  id: string
  label: string
  hasKey: boolean
  models: { id: string; label: string }[]
}

export interface SettingsState {
  selectedModel: string
  providers: ProviderSettingsEntry[]
}

/** Webview → Extension Host */
export type WebviewMessage =
  | { type: 'user_message'; text: string }
  | { type: 'tool_approved'; id: string }
  | { type: 'tool_rejected'; id: string }
  | { type: 'cancel_task' }
  | { type: 'ready' }
  | { type: 'get_settings' }
  | { type: 'set_api_key'; provider: string; key: string }
  | { type: 'set_model'; model: string }

/** Extension Host → Webview */
export type ExtensionMessage =
  | { type: 'runtime_event'; event: RuntimeEvent }
  | { type: 'session_loaded'; taskCount: number }
  | { type: 'error'; message: string }
  | { type: 'settings'; settings: SettingsState }
  | { type: 'navigate'; view: string }
