import Database from 'better-sqlite3'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

let _db: Database.Database | null = null

/**
 * Get (or create) the SQLite database at the given storage path.
 * Call once during extension/CLI activation.
 */
export function getDb(storagePath: string): Database.Database {
  if (_db) return _db

  mkdirSync(storagePath, { recursive: true })
  const dbPath = join(storagePath, 'agent-runner.db')
  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  runMigrations(_db)
  return _db
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id           TEXT PRIMARY KEY,
      workspace    TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      total_tasks  INTEGER NOT NULL DEFAULT 0,
      messages     TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_workspace
      ON sessions (workspace);
  `)
}
