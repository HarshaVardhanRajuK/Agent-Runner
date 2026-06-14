import React from 'react'

export interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolName?: string
  durationMs?: number
  isStreaming?: boolean
}

export function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div style={{
        alignSelf: 'flex-end',
        maxWidth: '80%',
        background: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        padding: '8px 12px',
        borderRadius: 8,
      }}>
        {msg.content}
      </div>
    )
  }

  if (msg.role === 'tool') {
    return (
      <div style={{
        fontFamily: 'monospace',
        fontSize: '0.85em',
        padding: '6px 10px',
        background: 'var(--vscode-textBlockQuote-background)',
        borderLeft: '3px solid var(--vscode-textBlockQuote-border)',
        borderRadius: 2,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}>
        <span style={{ opacity: 0.6 }}>⚙ {msg.toolName ?? ''} ({msg.durationMs ?? 0}ms)</span>
        <br />
        {msg.content.slice(0, 300)}{msg.content.length > 300 ? '…' : ''}
      </div>
    )
  }

  // assistant
  return (
    <div style={{ maxWidth: '90%', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
      {msg.content}
      {msg.isStreaming && <span style={{ opacity: 0.4 }}>▋</span>}
    </div>
  )
}
