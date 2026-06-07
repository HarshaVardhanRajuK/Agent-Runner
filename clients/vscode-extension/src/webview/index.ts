import type { ExtensionMessage, WebviewMessage, RuntimeEvent } from '@agent-runner/shared'

// VS Code webview API — injected by VS Code
declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewMessage): void
}

const vscode = acquireVsCodeApi()

// ── State ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolName?: string
  durationMs?: number
  isStreaming?: boolean
}

let messages: Message[] = []
let isRunning = false
let currentStreamIndex = -1

// ── DOM refs ─────────────────────────────────────────────────────────────────

const root = document.getElementById('root')!

root.innerHTML = /* html */ `
  <div id="messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;"></div>
  <div id="input-bar" style="display:flex;padding:8px;gap:8px;border-top:1px solid var(--vscode-panel-border);">
    <input
      id="task-input"
      type="text"
      placeholder="Describe what you want to build or change…"
      style="flex:1;padding:8px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;outline:none;"
    />
    <button
      id="send-btn"
      style="padding:8px 16px;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:4px;cursor:pointer;"
    >Send</button>
  </div>
`

const messagesEl = document.getElementById('messages')!
const inputEl = document.getElementById('task-input') as HTMLInputElement
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement

// ── Send message ─────────────────────────────────────────────────────────────

function sendMessage(): void {
  const text = inputEl.value.trim()
  if (!text || isRunning) return

  inputEl.value = ''
  isRunning = true
  sendBtn.disabled = true
  sendBtn.textContent = 'Running…'

  appendMessage({ role: 'user', content: text })
  vscode.postMessage({ type: 'user_message', text })
}

sendBtn.addEventListener('click', sendMessage)
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) sendMessage()
})

// ── Render messages ───────────────────────────────────────────────────────────

function appendMessage(msg: Message): void {
  messages.push(msg)
  renderMessage(msg, messages.length - 1)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function renderMessage(msg: Message, index: number): void {
  const existing = document.getElementById(`msg-${index}`)
  if (existing) {
    existing.innerHTML = messageHtml(msg)
    return
  }

  const el = document.createElement('div')
  el.id = `msg-${index}`
  el.innerHTML = messageHtml(msg)
  messagesEl.appendChild(el)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function messageHtml(msg: Message): string {
  if (msg.role === 'user') {
    return /* html */ `
      <div style="align-self:flex-end;max-width:80%;background:var(--vscode-button-background);
                  color:var(--vscode-button-foreground);padding:8px 12px;border-radius:8px;">
        ${escHtml(msg.content)}
      </div>`
  }

  if (msg.role === 'tool') {
    return /* html */ `
      <div style="font-family:monospace;font-size:0.85em;padding:6px 10px;
                  background:var(--vscode-textBlockQuote-background);
                  border-left:3px solid var(--vscode-textBlockQuote-border);
                  border-radius:2px;white-space:pre-wrap;word-break:break-all;">
        <span style="opacity:0.6;">⚙ ${escHtml(msg.toolName ?? '')} (${msg.durationMs ?? 0}ms)</span>
        <br/>${escHtml(msg.content.slice(0, 300))}${msg.content.length > 300 ? '…' : ''}
      </div>`
  }

  // assistant
  return /* html */ `
    <div style="max-width:90%;white-space:pre-wrap;line-height:1.5;">
      ${escHtml(msg.content)}${msg.isStreaming ? '<span style="opacity:0.4;">▋</span>' : ''}
    </div>`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Handle events from extension host ─────────────────────────────────────────

window.addEventListener('message', (e: MessageEvent<ExtensionMessage>) => {
  const msg = e.data
  handleExtensionMessage(msg)
})

function handleExtensionMessage(msg: ExtensionMessage): void {
  if (msg.type === 'session_loaded') {
    // Session info — could show task count in header
    return
  }

  if (msg.type === 'error') {
    appendMessage({ role: 'assistant', content: `⚠️ ${msg.message}` })
    resetRunning()
    return
  }

  if (msg.type === 'runtime_event') {
    handleRuntimeEvent(msg.event)
  }
}

function handleRuntimeEvent(event: RuntimeEvent): void {
  switch (event.type) {
    case 'assistant_token': {
      if (currentStreamIndex === -1) {
        currentStreamIndex = messages.length
        appendMessage({ role: 'assistant', content: event.token, isStreaming: true })
      } else {
        const msg = messages[currentStreamIndex]
        if (msg) {
          msg.content += event.token
          renderMessage(msg, currentStreamIndex)
        }
      }
      break
    }

    case 'tool_started': {
      // Finalise any in-progress stream
      if (currentStreamIndex !== -1) {
        const msg = messages[currentStreamIndex]
        if (msg) {
          msg.isStreaming = false
          renderMessage(msg, currentStreamIndex)
        }
        currentStreamIndex = -1
      }
      break
    }

    case 'tool_completed': {
      appendMessage({
        role: 'tool',
        content: event.result,
        toolName: event.name,
        durationMs: event.durationMs,
      })
      break
    }

    case 'task_completed': {
      if (currentStreamIndex !== -1) {
        const msg = messages[currentStreamIndex]
        if (msg) {
          msg.isStreaming = false
          renderMessage(msg, currentStreamIndex)
        }
        currentStreamIndex = -1
      }
      resetRunning()
      break
    }

    case 'task_failed': {
      appendMessage({ role: 'assistant', content: `⚠️ ${event.error}` })
      resetRunning()
      break
    }

    case 'context_compressed': {
      // Could show a subtle indicator — for now do nothing
      break
    }
  }
}

function resetRunning(): void {
  isRunning = false
  currentStreamIndex = -1
  sendBtn.disabled = false
  sendBtn.textContent = 'Send'
}

// Signal to extension host that the webview is ready
vscode.postMessage({ type: 'ready' })
