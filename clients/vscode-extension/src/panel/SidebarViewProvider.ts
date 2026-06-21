import * as vscode from 'vscode'
import { run, SessionManager } from '@agent-runner/runtime'
import { AnthropicProvider, DeepSeekProvider, MiniMaxProvider, CommandCodeProvider } from '@agent-runner/providers'
import { createDefaultRegistry } from '@agent-runner/tools'
import { initStore, SessionStore } from '@agent-runner/storage'
import { providerForModel } from '@agent-runner/shared'
import { VsCodeAdapter } from '../adapter/VsCodeAdapter.js'
import { log } from '../log.js'
import { ConfigService } from '../services/ConfigService.js'
import type { WebviewMessage, ExtensionMessage } from '@agent-runner/shared'

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'agent-runner.sidebar'

  #view: vscode.WebviewView | undefined
  readonly #context: vscode.ExtensionContext
  readonly #config: ConfigService
  #sessionManager: SessionManager | undefined
  #isRunning = false

  constructor(context: vscode.ExtensionContext, config: ConfigService) {
    this.#context = context
    this.#config = config
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.#view = view

    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.#context.extensionUri, 'dist', 'webview'),
        vscode.Uri.joinPath(this.#context.extensionUri, 'media'),
      ],
    }

    view.webview.html = this.#getHtml(view.webview)

    view.webview.onDidReceiveMessage((msg: WebviewMessage) => {
      log.info(`Received webview message: ${msg.type}`)
      void this.#handleWebviewMessage(msg)
    })

    log.info('SidebarViewProvider resolved')
  }

  resetSession(): void {
    const workspaceRoot = this.#getWorkspaceRoot()
    if (!workspaceRoot) {
      log.warn('resetSession: no workspace root')
      return
    }
    log.info(`Resetting session for ${workspaceRoot}`)
    const store = this.#getSessionStore()
    store.delete(workspaceRoot)
    this.#sessionManager = undefined
    this.#send({ type: 'session_loaded', taskCount: 0 })
  }

  async #handleWebviewMessage(msg: WebviewMessage): Promise<void> {
    if (msg.type === 'ready') {
      const store = this.#getSessionStore()
      const workspaceRoot = this.#getWorkspaceRoot()
      if (!workspaceRoot) {
        log.warn('handleWebviewMessage(ready): no workspace root')
        return
      }
      const sm = new SessionManager(store)
      const session = sm.loadOrCreate(workspaceRoot)
      this.#sessionManager = sm
      this.#send({ type: 'session_loaded', taskCount: session.totalTasks })
      log.info(`Session loaded with ${session.totalTasks} existing task(s)`)
      return
    }

    if (msg.type === 'get_settings') {
      const settings = await this.#config.getSettingsState()
      this.#send({ type: 'settings', settings })
      return
    }

    if (msg.type === 'set_api_key') {
      const provider = msg.provider
      const catalog = await import('@agent-runner/shared').then((m) => m.PROVIDER_CATALOG)
      const entry = catalog.find((p) => p.id === provider)
      if (entry) {
        await this.#config.setApiKey(entry.secretKey, msg.key)
        log.info(`API key ${msg.key ? 'set' : 'cleared'} for ${provider}`)
      }
      const settings = await this.#config.getSettingsState()
      this.#send({ type: 'settings', settings })
      return
    }

    if (msg.type === 'set_model') {
      await this.#config.setModel(msg.model)
      log.info(`Model set to ${msg.model}`)
      const settings = await this.#config.getSettingsState()
      this.#send({ type: 'settings', settings })
      return
    }

    if (msg.type === 'user_message') {
      if (this.#isRunning) {
        log.warn('Ignoring user_message — task already running')
        return
      }
      log.info(`Running task (${msg.text.length} chars)`)
      await this.#runTask(msg.text)
    }
  }

  async #runTask(task: string): Promise<void> {
    const workspaceRoot = this.#getWorkspaceRoot()
    if (!workspaceRoot) {
      log.warn('runTask: no workspace folder open')
      this.#send({ type: 'error', message: 'No workspace folder open.' })
      return
    }

    const model = this.#config.getModel()
    log.info(`Starting task with model=${model}`)

    const provider = await this.#resolveProvider(model)
    if (!provider) return

    const adapter = new VsCodeAdapter()
    const tools = createDefaultRegistry(adapter, workspaceRoot)

    if (!this.#sessionManager) {
      const store = this.#getSessionStore()
      this.#sessionManager = new SessionManager(store)
      this.#sessionManager.loadOrCreate(workspaceRoot)
    }

    this.#isRunning = true

    try {
      for await (const event of run({
        task,
        sessionManager: this.#sessionManager,
        provider,
        tools,
      })) {
        this.#send({ type: 'runtime_event', event })
      }
      log.info('Task completed successfully')
    } catch (err) {
      log.error('Task failed with error', err)
      this.#send({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      this.#isRunning = false
    }
  }

  async #resolveProvider(
    model: string,
  ): Promise<AnthropicProvider | DeepSeekProvider | MiniMaxProvider | CommandCodeProvider | null> {
    const providerInfo = providerForModel(model)
    if (!providerInfo) {
      this.#send({ type: 'error', message: `Unknown model: ${model}` })
      return null
    }

    const apiKey = await this.#config.getApiKey(providerInfo.secretKey)
    if (!apiKey) {
      this.#send({
        type: 'error',
        message: `No API key set for ${providerInfo.label}. Please configure it in Settings.`,
      })
      this.#send({ type: 'navigate', view: 'settings' })
      return null
    }

    if (providerInfo.id === 'command-code') {
      return new CommandCodeProvider(apiKey, model, SYSTEM_PROMPT)
    }
    if (providerInfo.id === 'deepseek') {
      return new DeepSeekProvider(apiKey, model, SYSTEM_PROMPT)
    }
    if (providerInfo.id === 'minimax') {
      return new MiniMaxProvider(apiKey, model, SYSTEM_PROMPT)
    }
    return new AnthropicProvider(apiKey, model, SYSTEM_PROMPT)
  }

  #send(msg: ExtensionMessage): void {
    void this.#view?.webview.postMessage(msg)
  }

  #getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  }

  #getSessionStore(): SessionStore {
    const storagePath = this.#context.globalStorageUri.fsPath
    initStore(storagePath)
    return new SessionStore()
  }

  #getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.#context.extensionUri, 'dist', 'webview', 'index.js'),
    )
    const nonce = getNonce()

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             script-src 'nonce-${nonce}';
             style-src 'unsafe-inline';
             img-src ${webview.cspSource} https:;
             font-src ${webview.cspSource};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agent Runner</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const SYSTEM_PROMPT = `You are an autonomous coding agent. You help users complete programming tasks by reading, writing, and running code in their workspace.

## Tools available

- **read_file(path)** — Read the contents of a file. Always read before modifying.
- **write_file(path, content)** — Write content to a file. Creates if it doesn't exist.
- **run_command(command)** — Run a shell command. Returns stdout, stderr, exit code.
- **list_directory(path)** — List files in a directory. Use to explore the workspace.

## How to work

1. Think through what you need to do before calling any tool.
2. Call one tool at a time. Wait for the result before deciding the next step.
3. Always verify your work — after writing code, run it to confirm it works.
4. If a command fails, read the error and fix it before giving up.
5. When the task is fully complete and verified, respond with a plain text summary.

## Rules

- Never delete files unless explicitly asked.
- Do not run commands that modify system state outside the workspace.
- Keep responses concise — think, act, observe.`
