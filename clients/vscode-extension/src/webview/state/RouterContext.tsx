import React, { createContext, useContext, useState } from 'react'

export type View = 'chat' | 'settings' | 'history' | 'profiles' | 'agent-settings'

interface RouterContextValue {
  view: View
  navigate: (v: View) => void
}

const RouterContext = createContext<RouterContextValue>({
  view: 'chat',
  navigate: () => {},
})
 
export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<View>('chat')
  return (
    <RouterContext.Provider value={{ view, navigate: setView }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useRouter() {
  return useContext(RouterContext)
}
 