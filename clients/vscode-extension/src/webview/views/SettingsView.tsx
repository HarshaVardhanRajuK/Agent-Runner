import React, { useState, useEffect } from 'react'
import { postMessage, onMessage } from '../lib/vscodeApi.js'
import type { SettingsState, ProviderSettingsEntry } from '@agent-runner/shared'

export function SettingsView() {
  const [settings, setSettings] = useState<SettingsState | null>(null)
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    postMessage({ type: 'get_settings' })
    return onMessage((msg) => {
      if (msg.type === 'settings') setSettings(msg.settings)
    })
  }, [])

  function handleModelChange(model: string) {
    postMessage({ type: 'set_model', model })
  }

  function handleSaveKey(provider: ProviderSettingsEntry) {
    const key = keyInputs[provider.id] ?? ''
    postMessage({ type: 'set_api_key', provider: provider.id, key })
    setKeyInputs((prev) => ({ ...prev, [provider.id]: '' }))
    setSaved((prev) => ({ ...prev, [provider.id]: true }))
    setTimeout(() => setSaved((prev) => ({ ...prev, [provider.id]: false })), 2000)
  }

  function handleClearKey(provider: ProviderSettingsEntry) {
    postMessage({ type: 'set_api_key', provider: provider.id, key: '' })
  }

  if (!settings) {
    return <div style={{ padding: 16, opacity: 0.6 }}>Loading settings…</div>
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '6px 8px',
    background: 'var(--vscode-input-background)',
    color: 'var(--vscode-input-foreground)',
    border: '1px solid var(--vscode-input-border)',
    borderRadius: 4,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    outline: 'none',
  }

  const btnStyle: React.CSSProperties = {
    padding: '6px 12px',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 'inherit',
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
      <section>
        <h3 style={{ marginBottom: 8, fontSize: '0.9em', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Model
        </h3>
        <select
          value={settings.selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
          style={{ ...inputStyle, width: '100%' }}
        >
          {settings.providers.map((p) => (
            <optgroup key={p.id} label={p.label}>
              {p.models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </section>

      <section>
        <h3 style={{ marginBottom: 12, fontSize: '0.9em', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          API Keys
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {settings.providers.map((p) => (
            <div key={p.id}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>{p.label}</div>
              {p.hasKey && (
                <div style={{ marginBottom: 6, color: 'var(--vscode-testing-iconPassed)', fontSize: '0.85em' }}>
                  ✓ Key set
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="password"
                  placeholder={p.hasKey ? 'Enter new key to update…' : 'Paste API key…'}
                  value={keyInputs[p.id] ?? ''}
                  onChange={(e) => setKeyInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  style={inputStyle}
                />
                <button
                  onClick={() => handleSaveKey(p)}
                  disabled={!keyInputs[p.id]}
                  style={{
                    ...btnStyle,
                    background: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    opacity: keyInputs[p.id] ? 1 : 0.5,
                  }}
                >
                  {saved[p.id] ? '✓' : 'Save'}
                </button>
                {p.hasKey && (
                  <button
                    onClick={() => handleClearKey(p)}
                    style={{
                      ...btnStyle,
                      background: 'var(--vscode-button-secondaryBackground)',
                      color: 'var(--vscode-button-secondaryForeground)',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
