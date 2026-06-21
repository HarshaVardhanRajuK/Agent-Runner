import React, { useMemo } from 'react'
import { marked } from 'marked'

export interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolName?: string
  durationMs?: number
  isStreaming?: boolean
}

const MD_STYLES = `
.md-content p { margin: 0.4em 0; }
.md-content pre {
  background: var(--vscode-textCodeBlock-background);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.85em;
  line-height: 1.4;
  margin: 0.5em 0;
}
.md-content code {
  font-family: var(--vscode-editor-font-family);
  font-size: 0.9em;
}
.md-content pre code { font-size: inherit; }
.md-content table { border-collapse: collapse; width: 100%; margin: 0.5em 0; font-size: 0.9em; }
.md-content th, .md-content td { border: 1px solid var(--vscode-panel-border); padding: 6px 10px; }
.md-content th { background: var(--vscode-editor-lineHighlightBackground); text-align: left; }
.md-content ul, .md-content ol { margin: 0.4em 0; padding-left: 24px; }
.md-content li { margin: 0.2em 0; }
.md-content blockquote {
  border-left: 3px solid var(--vscode-textBlockQuote-border);
  background: var(--vscode-textBlockQuote-background);
  margin: 0.5em 0;
  padding: 8px 12px;
  border-radius: 2px;
}
.md-content h1 { font-size: 1.4em; font-weight: 700; margin: 0.6em 0 0.3em; }
.md-content h2 { font-size: 1.2em; font-weight: 700; margin: 0.5em 0 0.25em; }
.md-content h3 { font-size: 1.1em; font-weight: 600; margin: 0.4em 0 0.2em; }
.md-content hr { border: none; border-top: 1px solid var(--vscode-panel-border); margin: 0.8em 0; }
.md-content a { color: var(--vscode-textLink-foreground); }
.md-content img { max-width: 100%; border-radius: 4px; }
`

function MarkdownContent({ content }: { content: string }) {
  const html = useMemo(() => marked.parse(content, { async: false }), [content])
  return (
    <>
      <style>{MD_STYLES}</style>
      <div className="md-content" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
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
        whiteSpace: 'pre-wrap',
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
    <div style={{ maxWidth: '90%', lineHeight: 1.6, overflowWrap: 'break-word' }}>
      <MarkdownContent content={msg.content} />
      {msg.isStreaming && <span style={{ opacity: 0.4 }}>▋</span>}
    </div>
  )
}
