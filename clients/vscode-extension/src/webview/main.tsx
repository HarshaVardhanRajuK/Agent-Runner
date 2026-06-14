import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import { postMessage } from './lib/vscodeApi.js'

const root = document.getElementById('root')!
createRoot(root).render(<App />)

postMessage({ type: 'ready' })
