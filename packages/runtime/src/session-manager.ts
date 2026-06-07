import type { Session, Message } from '@agent-runner/shared'
import type { SessionStore } from '@agent-runner/storage'
import { randomUUID } from 'node:crypto'

export class SessionManager {
  readonly #store: SessionStore
  #session: Session | null = null

  constructor(store: SessionStore) {
    this.#store = store
  }

  /**
   * Load an existing session for this workspace, or create a new one.
   */
  loadOrCreate(workspaceRoot: string): Session {
    const existing = this.#store.load(workspaceRoot)
    if (existing) {
      this.#session = existing
      return existing
    }

    const now = new Date().toISOString()
    this.#session = {
      id: randomUUID(),
      workspaceRoot,
      createdAt: now,
      updatedAt: now,
      totalTasks: 0,
      messages: [],
    }
    return this.#session
  }

  /**
   * Reset the session for this workspace (--new-session equivalent).
   */
  reset(workspaceRoot: string): Session {
    this.#store.delete(workspaceRoot)
    return this.loadOrCreate(workspaceRoot)
  }

  addMessage(message: Message): void {
    if (!this.#session) throw new Error('No active session — call loadOrCreate first')
    this.#session.messages.push(message)
  }

  incrementTaskCount(): void {
    if (!this.#session) return
    this.#session.totalTasks++
  }

  save(): void {
    if (!this.#session) return
    this.#session.updatedAt = new Date().toISOString()
    this.#store.save(this.#session)
  }

  get session(): Session {
    if (!this.#session) throw new Error('No active session')
    return this.#session
  }

  get messages(): Message[] {
    return this.#session?.messages ?? []
  }
}
