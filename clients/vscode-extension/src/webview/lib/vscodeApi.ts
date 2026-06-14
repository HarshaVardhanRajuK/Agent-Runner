import type { WebviewMessage, ExtensionMessage } from '@agent-runner/shared'

declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewMessage): void
  getState(): unknown
  setState(state: unknown): void
}

const api = acquireVsCodeApi()

export function postMessage(msg: WebviewMessage): void {
  api.postMessage(msg)
}

export function onMessage(handler: (msg: ExtensionMessage) => void): () => void {
  const listener = (e: MessageEvent<ExtensionMessage>) => handler(e.data)
  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}
