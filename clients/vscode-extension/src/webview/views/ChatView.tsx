import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageBubble } from '../components/MessageBubble.js'
import { postMessage, onMessage } from '../lib/vscodeApi.js'
import type { Message } from '../components/MessageBubble.js'
import type { RuntimeEvent } from '@agent-runner/shared'

const TYPING_SPEED_MS = 12

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [inputText, setInputText] = useState('')
  const streamIndexRef = useRef(-1)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const charBufferRef = useRef<string[]>([])
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function flushBuffer() {
    if (typingIntervalRef.current !== null) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }
    const remaining = charBufferRef.current.join('')
    charBufferRef.current = []
    if (!remaining) return
    setMessages((prev) => {
      if (streamIndexRef.current === -1) {
        streamIndexRef.current = prev.length
        return [...prev, { role: 'assistant', content: remaining, isStreaming: true }]
      }
      const next = [...prev]
      const msg = next[streamIndexRef.current]
      if (msg) next[streamIndexRef.current] = { ...msg, content: msg.content + remaining }
      return next
    })
  }

  function startTyping() {
    if (typingIntervalRef.current !== null) return
    typingIntervalRef.current = setInterval(() => {
      const char = charBufferRef.current.shift()
      if (!char) return
      setMessages((prev) => {
        if (streamIndexRef.current === -1) {
          streamIndexRef.current = prev.length
          return [...prev, { role: 'assistant', content: char, isStreaming: true }]
        }
        const next = [...prev]
        const msg = next[streamIndexRef.current]
        if (msg) next[streamIndexRef.current] = { ...msg, content: msg.content + char }
        return next
      })
    }, TYPING_SPEED_MS)
  }

  function finalizeStreamingMessage() {
    setMessages((prev) => {
      if (streamIndexRef.current === -1) return prev
      const next = [...prev]
      const msg = next[streamIndexRef.current]
      if (msg) next[streamIndexRef.current] = { ...msg, isStreaming: false }
      streamIndexRef.current = -1
      return next
    })
  }

  function handleRuntimeEvent(event: RuntimeEvent) {
    switch (event.type) {
      case 'assistant_token': {
        for (const char of event.token) {
          charBufferRef.current.push(char)
        }
        startTyping()
        break
      }
      case 'tool_started': {
        flushBuffer()
        finalizeStreamingMessage()
        break
      }
      case 'tool_completed': {
        setMessages((prev) => [
          ...prev,
          { role: 'tool', content: event.result, toolName: event.name, durationMs: event.durationMs },
        ])
        break
      }
      case 'task_completed': {
        flushBuffer()
        finalizeStreamingMessage()
        setIsRunning(false)
        break
      }
      case 'task_failed': {
        flushBuffer()
        setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${event.error}` }])
        setIsRunning(false)
        streamIndexRef.current = -1
        break
      }
      default:
        break
    }
  }

  useEffect(() => {
    return onMessage((msg) => {
      if (msg.type === 'session_loaded') {
        flushBuffer()
        setMessages([])
        streamIndexRef.current = -1
        return
      }
      if (msg.type === 'error') {
        flushBuffer()
        setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${msg.message}` }])
        setIsRunning(false)
        streamIndexRef.current = -1
        return
      }
      if (msg.type === 'runtime_event') {
        handleRuntimeEvent(msg.event)
      }
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current !== null) {
        clearInterval(typingIntervalRef.current)
      }
    }
  }, [])

  const sendMessage = useCallback(() => {
    const text = inputText.trim()
    if (!text || isRunning) return
    setInputText('')
    setIsRunning(true)
    streamIndexRef.current = -1
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    postMessage({ type: 'user_message', text })
  }, [inputText, isRunning])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {messages.length === 0 && (
          <div style={{ opacity: 0.5, textAlign: 'center', marginTop: 32 }}>
            Describe what you want to build or change…
          </div>
        )}
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        <div ref={messagesEndRef} />
      </div>
      <div style={{
        display: 'flex',
        padding: 8,
        gap: 8,
        borderTop: '1px solid var(--vscode-panel-border)',
      }}>
        <input
          type="text"
          value={inputText}
          placeholder="Describe what you want to build or change…"
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) sendMessage() }}
          style={{
            flex: 1,
            padding: '8px',
            background: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: 4,
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={isRunning || !inputText.trim()}
          style={{
            padding: '8px 16px',
            background: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            border: 'none',
            borderRadius: 4,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.6 : 1,
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
        >
          {isRunning ? 'Running…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
