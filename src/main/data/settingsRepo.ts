import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { DEFAULT_SETTINGS, type Settings } from '../../shared/types'
import type { DB } from './db'

const KEYS = Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>

/**
 * Legge un'impostazione salvata senza aprire il database per l'app: serve prima di "ready",
 * quando Chromium deve già sapere la lingua. `null` = nessun database (primo avvio).
 */
export function peekSetting<K extends keyof Settings>(file: string, key: K): Settings[K] | null {
  if (!existsSync(file)) return null
  try {
    const db = new Database(file, { readonly: true, fileMustExist: true })
    try {
      const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get(key) as { value_json: string } | undefined
      return row ? (JSON.parse(row.value_json) as Settings[K]) : DEFAULT_SETTINGS[key]
    } finally {
      db.close()
    }
  } catch {
    return DEFAULT_SETTINGS[key]
  }
}

export class SettingsRepo {
  constructor(private readonly db: DB) {}

  getAll(): Settings {
    const rows = this.db.prepare('SELECT key, value_json FROM settings').all() as Array<{ key: string; value_json: string }>
    const stored = Object.fromEntries(
      rows.filter((r) => (KEYS as string[]).includes(r.key)).map((r) => [r.key, JSON.parse(r.value_json)])
    ) as Partial<Settings>
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...stored.notifications },
      autoBackup: { ...DEFAULT_SETTINGS.autoBackup, ...stored.autoBackup }
    }
  }

  set(partial: Partial<Settings>): Settings {
    const current = this.getAll()
    const next: Settings = {
      ...current,
      ...partial,
      notifications: { ...current.notifications, ...partial.notifications },
      autoBackup: { ...current.autoBackup, ...partial.autoBackup }
    }
    const upsert = this.db.prepare(
      'INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json'
    )
    this.db.transaction(() => {
      for (const key of KEYS) {
        if (key in partial) upsert.run(key, JSON.stringify(next[key]))
      }
    })()
    return next
  }

  /** Stato interno dell'app (non esposto come impostazione), es. la data dell'ultimo riepilogo. */
  getState<T>(key: string): T | undefined {
    const row = this.db.prepare('SELECT value_json FROM settings WHERE key = ?').get(`state.${key}`) as
      | { value_json: string }
      | undefined
    return row ? (JSON.parse(row.value_json) as T) : undefined
  }

  setState(key: string, value: unknown): void {
    this.db
      .prepare(
        'INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json'
      )
      .run(`state.${key}`, JSON.stringify(value))
  }
}
