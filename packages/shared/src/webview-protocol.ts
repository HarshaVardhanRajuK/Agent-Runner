/**
 * Message protocol between the VS Code Webview and Extension Host.
 * Both directions are strictly typed.
 */

import type { RuntimeEvent } from './events.js'

/** Webview → Extension Host */
export type WebviewMessage =
  | { type: 'user_message'; text: string }
  | { type: 'tool_approved'; id: string }
  | { type: 'tool_rejected'; id: string }
  | { type: 'cancel_task' }
  | { type: 'ready' } // webview signals it has loaded

/** Extension Host → Webview */
export type ExtensionMessage =
  | { type: 'runtime_event'; event: RuntimeEvent }
  | { type: 'session_loaded'; taskCount: number }
  | { type: 'error'; message: string }
