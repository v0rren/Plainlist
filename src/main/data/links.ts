import type { DB } from './db'

export const LIST_SEPARATOR = '\u001f'

export function splitList(value: string | null): string[] {
  return value ? value.split(LIST_SEPARATOR).sort((a, b) => a.localeCompare(b, 'it')) : []
}

export function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, ' ')
    const key = name.toLocaleLowerCase('it')
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function ensureName(db: DB, table: 'people' | 'tags', name: string): number {
  db.prepare(`INSERT INTO ${table} (name) VALUES (?) ON CONFLICT(name) DO NOTHING`).run(name)
  return (db.prepare(`SELECT id FROM ${table} WHERE name = ?`).get(name) as { id: number }).id
}

export function setTaskPeople(db: DB, taskId: number, names: string[]): void {
  db.prepare('DELETE FROM task_people WHERE task_id = ?').run(taskId)
  const link = db.prepare('INSERT INTO task_people (task_id, person_id) VALUES (?, ?)')
  for (const name of uniqueNames(names)) link.run(taskId, ensureName(db, 'people', name))
}

export function setTaskTags(db: DB, taskId: number, names: string[]): void {
  db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId)
  const link = db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)')
  for (const name of uniqueNames(names.map((n) => n.toLocaleLowerCase('it')))) {
    link.run(taskId, ensureName(db, 'tags', name))
  }
}
