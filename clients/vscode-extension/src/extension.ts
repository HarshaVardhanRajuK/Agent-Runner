import * as vscode from 'vscode'
import { ChatPanel } from './panel/ChatPanel.js'

export function activate(context: vscode.ExtensionContext): void {
  // Open chat panel command
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-runner.openChat', () => {
      ChatPanel.createOrShow(context)
    }),
  )

  // New session command
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-runner.newSession', () => {
      ChatPanel.createOrShow(context, { newSession: true })
    }),
  )

  // Open automatically on first install
  if (context.globalState.get('firstActivation') !== false) {
    void context.globalState.update('firstActivation', false)
    ChatPanel.createOrShow(context)
  }
}

export function deactivate(): void {
  ChatPanel.dispose()
}
