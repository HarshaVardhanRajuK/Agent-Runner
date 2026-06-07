import * as vscode from 'vscode'

// LogOutputChannel gives structured levels + filtering in the Output panel
// dropdown. VS Code adds timestamps automatically — no manual prefix needed.
let _channel: vscode.LogOutputChannel | undefined

function channel(): vscode.LogOutputChannel {
  if (!_channel) {
    _channel = vscode.window.createOutputChannel('Agent Runner', { log: true })
  }
  return _channel
}

export const log = {
  trace(msg: string): void {
    channel().trace(msg)
  },

  debug(msg: string): void {
    channel().debug(msg)
  },

  info(msg: string): void {
    channel().info(msg)
  },

  warn(msg: string): void {
    channel().warn(msg)
  },

  error(msg: string, err?: unknown): void {
    const detail = err instanceof Error ? err.stack ?? err.message : String(err ?? '')
    channel().error(detail ? `${msg}\n  ${detail}` : msg)
  },

  show(): void {
    channel().show()
  },
}
