import * as vscode from 'vscode'
import * as path from 'node:path'
import { run, SessionManager } from '@agent-runner/runtime'
import { AnthropicProvider } from '@agent-runner/providers'
import { createDefaultRegistry } from '@agent-runner/tools'
import { getDb, SessionStore } from '@agent-runner/storage'
import { VsCodeAdapter } from '../adapter/VsCodeAdapter.js'
import type { WebviewMessage, ExtensionMessage } from '@agent-runner/shared'

interface CreateOptions {
  newSession?: boolean
}

/**
 * ChatPanel — manages the VS Code WebviewPanel for the agent chat UI.
 *
 * Responsibilities:
 * - Create/show the webview panel
 * - Bridge messages between webview and the runtime
 * - Construct RuntimeConfig (provider, tools, session)
 */
export class ChatPanel {
  static #current: ChatPanel | undefined
  readonly #panel: vscode.WebviewPanel
  readonly #context: vscode.ExtensionContext
  #sessionManager: SessionManager | undefined
  #isRunning = false

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.#panel = panel
    this.#context = context

    this.#panel.onDidDispose(() => {
      ChatPanel.#current = undefined
    })

    this.#panel.webview.onDidReceiveMessage((msg: WebviewMessage) => {
      void this.#handleWebviewMessage(msg)
    })

    this.#panel.webview.html = this.#getHtml()
  }

  static createOrShow(
    context: vscode.ExtensionContext,
    options: CreateOptions = {},
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    if (ChatPanel.#current) {
      ChatPanel.#current.#panel.reveal(column)
      if (options.newSession) {
        ChatPanel.#current.#resetSession()
      }
      return
    }

    const panel = vscode.window.createWebviewPanel(
      'agentRunnerChat',
      'Agent Runner',
      column ?? vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
        ],
      },
    )

    ChatPanel.#current = new ChatPanel(panel, context)

    if (options.newSession) {
      ChatPanel.#current.#resetSession()
    }
  }

  static dispose(): void {
    const current = ChatPanel.#current
    if (current) current.#panel.dispose()
    ChatPanel.#current = undefined
  }

  #resetSession(): void {
    const workspaceRoot = this.#getWorkspaceRoot()
    if (!workspaceRoot) return
    const store = this.#getSessionStore()
    store.delete(workspaceRoot)
    this.#sessionManager = undefined
    this.#send({ type: 'session_loaded', taskCount: 0 })
  }

  async #handleWebviewMessage(msg: WebviewMessage): Promise<void> {
    if (msg.type === 'ready') {
      const store = this.#getSessionStore()
      const workspaceRoot = this.#getWorkspaceRoot()
      if (!workspaceRoot) return

      const sm = new SessionManager(store)
      const session = sm.loadOrCreate(workspaceRoot)
      this.#sessionManager = sm
      this.#send({ type: 'session_loaded', taskCount: session.totalTasks })
      return
    }

    if (msg.type === 'user_message') {
      if (this.#isRunning) return // ignore while a task is running
      await this.#runTask(msg.text)
    }
  }

  async #runTask(task: string): Promise<void> {
    const workspaceRoot = this.#getWorkspaceRoot()
    if (!workspaceRoot) {
      this.#send({ type: 'error', message: 'No workspace folder open.' })
      return
    }

    const config = vscode.workspace.getConfiguration('agent-runner')
    const apiKey = config.get<string>('anthropicApiKey') ?? ''
    const model = config.get<string>('model') ?? 'claude-sonnet-4-5'

    if (!apiKey) {
      this.#send({
        type: 'error',
        message:
          'Anthropic API key not set. Add it in Settings → Agent Runner → Anthropic Api Key.',
      })
      return
    }

    const provider = new AnthropicProvider(apiKey, model, SYSTEM_PROMPT)
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
    } finally {
      this.#isRunning = false
    }
  }

  #send(msg: ExtensionMessage): void {
    void this.#panel.webview.postMessage(msg)
  }

  #getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  }

  #getSessionStore(): SessionStore {
    const storagePath = this.#context.globalStorageUri.fsPath
    const db = getDb(storagePath)
    return new SessionStore(db)
  }

  #getHtml(): string {
    const webviewUri = this.#panel.webview.asWebviewUri(
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
             font-src ${this.#panel.webview.cspSource};" />
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
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${webviewUri}"></script>
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
