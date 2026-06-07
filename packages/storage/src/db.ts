import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Minimal JSON file-based storage for v0.1.
 *
 * Stores all data as a single JSON file per storage directory.
 * No native addons — works in any Node.js version including VS Code's
 * internal runtime.
 *
 * When the retrieval index is added (v0.2+), this will be replaced with
 * a proper SQLite solution using sql.js (WASM) or a similar pure-JS library.
 */

export interface Store {
  sessions: Record<string, unknown>
}

const DEFAULT_STORE: Store = { sessions: {} }

let _storePath: string | null = null
let _store: Store | null = null

export function initStore(storagePath: string): void {
  mkdirSync(storagePath, { recursive: true })
  _storePath = join(storagePath, 'agent-runner.json')

  if (existsSync(_storePath)) {
    try {
      _store = JSON.parse(readFileSync(_storePath, 'utf-8')) as Store
    } catch {
      _store = { ...DEFAULT_STORE }
    }
  } else {
    _store = { ...DEFAULT_STORE }
    flush()
  }
}

export function getStore(): Store {
  if (!_store) throw new Error('Store not initialised — call initStore() first')
  return _store
}

export function flush(): void {
  if (!_storePath || !_store) return
  writeFileSync(_storePath, JSON.stringify(_store, null, 2), 'utf-8')
}
