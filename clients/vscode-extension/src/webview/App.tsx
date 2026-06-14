import React, { useEffect } from 'react'
import { useRouter, RouterProvider } from './state/RouterContext.js'
import { ChatView } from './views/ChatView.js'
import { SettingsView } from './views/SettingsView.js'
import { HistoryView } from './views/HistoryView.js'
import { ProfilesView } from './views/ProfilesView.js'
import { AgentSettingsView } from './views/AgentSettingsView.js'
import { onMessage } from './lib/vscodeApi.js'
import type { View } from './state/RouterContext.js'

const NAV_ITEMS: { view: View; label: string }[] = [
  { view: 'chat', label: 'Chat' },
  { view: 'settings', label: 'Settings' },
  { view: 'history', label: 'History' },
  { view: 'profiles', label: 'Profiles' },
  { view: 'agent-settings', label: 'Agent' },
]

function AppInner() {
  const { view, navigate } = useRouter()

  useEffect(() => {
    return onMessage((msg) => {
      if (msg.type === 'navigate') {
        navigate(msg.view as View)
      }
    })
  }, [navigate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <nav style={{
        display: 'flex',
        borderBottom: '1px solid var(--vscode-panel-border)',
        flexShrink: 0,
      }}>
        {NAV_ITEMS.map(({ view: v, label }) => (
          <button
            key={v}
            onClick={() => navigate(v)}
            style={{
              flex: 1,
              padding: '8px 4px',
              background: view === v ? 'var(--vscode-tab-activeBackground)' : 'transparent',
              color: view === v ? 'var(--vscode-tab-activeForeground)' : 'var(--vscode-tab-inactiveForeground)',
              border: 'none',
              borderBottom: view === v ? '2px solid var(--vscode-focusBorder)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.8em',
              fontWeight: view === v ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'chat' && <ChatView />}
        {view === 'settings' && <SettingsView />}
        {view === 'history' && <HistoryView />}
        {view === 'profiles' && <ProfilesView />}
        {view === 'agent-settings' && <AgentSettingsView />}
      </div>
    </div>
  )
}

export function App() {
  return (
    <RouterProvider>
      <AppInner />
    </RouterProvider>
  )
}
