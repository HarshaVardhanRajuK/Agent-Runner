import * as vscode from 'vscode'
import { ChatPanel } from './panel/ChatPanel.js'
import { log } from './log.js'

export function activate(context: vscode.ExtensionContext): void {
  log.info('Activating Agent Runner extension...')

  try {
    context.subscriptions.push(
      vscode.commands.registerCommand('agent-runner.openChat', () => {
        log.info('Command: agent-runner.openChat')
        ChatPanel.createOrShow(context)
      }),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('agent-runner.newSession', () => {
        log.info('Command: agent-runner.newSession')
        ChatPanel.createOrShow(context, { newSession: true })
      }),
    )

    log.info('Registered 2 commands')

    if (context.globalState.get('firstActivation') !== false) {
      log.info('First activation detected — opening chat panel')
      void context.globalState.update('firstActivation', false)
      ChatPanel.createOrShow(context)
    }

    log.info('Agent Runner extension activated successfully')
  } catch (err) {
    log.error('Failed to activate extension', err)
  }
}

export function deactivate(): void {
  log.info('Deactivating Agent Runner extension')
  ChatPanel.dispose()
  log.info('Agent Runner extension deactivated')
}
