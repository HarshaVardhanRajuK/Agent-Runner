import * as vscode from 'vscode'
import { SidebarViewProvider } from './panel/SidebarViewProvider.js'
import { ConfigService } from './services/ConfigService.js'
import { log } from './log.js'

export function activate(context: vscode.ExtensionContext): void {
  log.info('Activating Agent Runner extension...')

  try {
    const config = new ConfigService(context)

    // Run migration from legacy settings.json keys on first launch
    void config.migrateFromSettings()

    const provider = new SidebarViewProvider(context, config)

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        SidebarViewProvider.viewType,
        provider,
        { webviewOptions: { retainContextWhenHidden: true } },
      ),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('agent-runner.openChat', () => {
        log.info('Command: agent-runner.openChat')
        void vscode.commands.executeCommand('agent-runner.sidebar.focus')
      }),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('agent-runner.newSession', () => {
        log.info('Command: agent-runner.newSession')
        provider.resetSession()
      }),
    )

    log.info('Agent Runner extension activated successfully')
  } catch (err) {
    log.error('Failed to activate extension', err)
  }
}

export function deactivate(): void {
  log.info('Deactivating Agent Runner extension')
}
