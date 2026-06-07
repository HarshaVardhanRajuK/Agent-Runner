import * as vscode from 'vscode'

let _channel: vscode.OutputChannel | undefined

function channel(): vscode.OutputChannel {
  if (!_channel) {
    _channel = vscode.window.createOutputChannel('Agent Runner')
  }
  return _channel
}

const prefix = (): string => {
  const d = new Date()
  return d.toLocaleTimeString('en-US', { hour12: false })
}

export const log = {
  info(msg: string): void {
    const line = `[${prefix()}] [INFO] ${msg}`
    console.log(line)
    channel().appendLine(line)
  },

  warn(msg: string): void {
    const line = `[${prefix()}] [WARN] ${msg}`
    console.warn(line)
    channel().appendLine(line)
  },

  error(msg: string, err?: unknown): void {
    const detail = err instanceof Error ? `\n  ${err.stack ?? err.message}` : ''
    const line = `[${prefix()}] [ERROR] ${msg}${detail}`
    console.error(line)
    channel().appendLine(line)
  },

  show(): void {
    channel().show()
  },
}
