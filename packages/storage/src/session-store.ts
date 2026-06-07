import type Database from 'better-sqlite3'
import type { Session } from '@agent-runner/shared'

interface SessionRow {
  id: string
  workspace: string
  created_at: string
  updated_at: string
  total_tasks: number
  messages: string
}

export class SessionStore {
  constructor(private readonly db: Database.Database) {}

  load(workspaceRoot: string): Session | null {
    const row = this.db
      .prepare<[string], SessionRow>(
        'SELECT * FROM sessions WHERE workspace = ? ORDER BY created_at DESC LIMIT 1',
      )
      .get(workspaceRoot)

    if (!row) return null
    return this.#toSession(row)
  }

  save(session: Session): void {
    this.db
      .prepare(`
        INSERT INTO sessions (id, workspace, created_at, updated_at, total_tasks, messages)
        VALUES (@id, @workspace, @created_at, @updated_at, @total_tasks, @messages)
        ON CONFLICT(id) DO UPDATE SET
          updated_at  = excluded.updated_at,
          total_tasks = excluded.total_tasks,
          messages    = excluded.messages
      `)
      .run({
        id: session.id,
        workspace: session.workspaceRoot,
        created_at: session.createdAt,
        updated_at: session.updatedAt,
        total_tasks: session.totalTasks,
        messages: JSON.stringify(session.messages),
      })
  }

  delete(workspaceRoot: string): void {
    this.db.prepare('DELETE FROM sessions WHERE workspace = ?').run(workspaceRoot)
  }

  #toSession(row: SessionRow): Session {
    return {
      id: row.id,
      workspaceRoot: row.workspace,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalTasks: row.total_tasks,
      messages: JSON.parse(row.messages) as Session['messages'],
    }
  }
}
