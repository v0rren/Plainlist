import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { MIGRATIONS, type Migration } from './migrations'

export type DB = Database.Database

export class SchemaTooNewError extends Error {
  constructor(
    readonly found: number,
    readonly supported: number
  ) {
    super(
      `Il database è stato creato da una versione più recente di Plainlist (schema ${found}, questa versione arriva al ${supported}). ` +
        'Installa la versione più recente: i dati non sono stati toccati.'
    )
    this.name = 'SchemaTooNewError'
  }
}

export interface OpenOptions {
  migrations?: Migration[]
  /** Cartella in cui salvare una copia del database prima di applicare migrazioni a dati esistenti. */
  backupDir?: string
  now?: Date
}

export interface OpenResult {
  db: DB
  /** Percorso della copia fatta prima delle migrazioni, se è servita. */
  backupPath: string | null
}

export function openDatabase(file: string, options: OpenOptions = {}): OpenResult {
  const migrations = options.migrations ?? MIGRATIONS
  const db = new Database(file)
  try {
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    const current = schemaVersion(db)
    const latest = latestVersion(migrations)
    if (current > latest) throw new SchemaTooNewError(current, latest)

    let backupPath: string | null = null
    if (current > 0 && current < latest && options.backupDir && file !== ':memory:') {
      mkdirSync(options.backupDir, { recursive: true })
      const stamp = (options.now ?? new Date()).toISOString().replace(/[:.]/g, '-').slice(0, 19)
      backupPath = join(options.backupDir, `tasks-schema${current}-prima-dell-aggiornamento-${stamp}.db`)
      db.prepare('VACUUM INTO ?').run(backupPath)
    }

    migrate(db, migrations)
    return { db, backupPath }
  } catch (err) {
    db.close()
    throw err
  }
}

export function schemaVersion(db: DB): number {
  return db.pragma('user_version', { simple: true }) as number
}

export function latestVersion(migrations: Migration[] = MIGRATIONS): number {
  return Math.max(0, ...migrations.map((m) => m.version))
}

export function migrate(db: DB, migrations: Migration[] = MIGRATIONS): void {
  const current = schemaVersion(db)
  if (current > latestVersion(migrations)) throw new SchemaTooNewError(current, latestVersion(migrations))
  for (const m of [...migrations].sort((a, b) => a.version - b.version)) {
    if (m.version <= current) continue
    db.transaction(() => {
      db.exec(m.sql)
      db.pragma(`user_version = ${m.version}`)
    })()
  }
}
