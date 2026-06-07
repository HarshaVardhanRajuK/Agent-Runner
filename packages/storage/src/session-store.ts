import type { Session } from '@agent-runner/shared'
import { getStore, flush } from './db.js'

/**
 * SessionStore — persists sessions to the JSON store.
 * Key: workspaceRoot (absolute path)
 *
 * Call initStore() before creating a SessionStore instance.
 */
export class SessionStore {
  load(workspaceRoot: string): Session | null {
    const sessions = getStore().sessions
    const data = sessions[workspaceRoot]
    if (!data) return null
    return data as Session
  }

  save(session: Session): void {
    getStore().sessions[session.workspaceRoot] = session
    flush()
  }

  delete(workspaceRoot: string): void {
    const sessions = getStore().sessions
    if (workspaceRoot in sessions) {
      delete sessions[workspaceRoot]
      flush()
    }
  }
}
