import { t } from '../../core/i18n'
import type { Area } from '../../core/types'
import type { DB } from './db'
import { NotFoundError, ValidationError } from './errors'

const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#db2777', '#65a30d']

interface AreaRow {
  id: number
  name: string
  color: string | null
  sort_order: number
  archived: number
}

function toArea(row: AreaRow): Area {
  return { id: row.id, name: row.name, color: row.color, sortOrder: row.sort_order, archived: row.archived === 1 }
}

export interface AreaInput {
  id?: number
  name: string
  color?: string | null
  archived?: boolean
}

export class AreasRepo {
  constructor(private readonly db: DB) {}

  list(includeArchived = false): Area[] {
    const rows = this.db
      .prepare(`SELECT * FROM areas ${includeArchived ? '' : 'WHERE archived = 0'} ORDER BY sort_order, name`)
      .all() as AreaRow[]
    return rows.map(toArea)
  }

  get(id: number): Area | null {
    const row = this.db.prepare('SELECT * FROM areas WHERE id = ?').get(id) as AreaRow | undefined
    return row ? toArea(row) : null
  }

  findByName(name: string): Area | null {
    const row = this.db.prepare('SELECT * FROM areas WHERE name = ?').get(name.trim()) as AreaRow | undefined
    return row ? toArea(row) : null
  }

  findOrCreate(name: string): Area {
    return this.findByName(name) ?? this.upsert({ name })
  }

  upsert(input: AreaInput): Area {
    const name = input.name.trim()
    if (!name) throw new ValidationError(t().errors.areaNameRequired)
    const clash = this.findByName(name)
    if (clash && clash.id !== input.id) throw new ValidationError(t().errors.areaExists(clash.name))

    if (input.id === undefined) {
      const { n, maxOrder } = this.db
        .prepare('SELECT count(*) AS n, coalesce(max(sort_order), -1) AS maxOrder FROM areas')
        .get() as { n: number; maxOrder: number }
      const info = this.db
        .prepare('INSERT INTO areas (name, color, sort_order, archived) VALUES (?, ?, ?, ?)')
        .run(name, input.color ?? PALETTE[n % PALETTE.length], maxOrder + 1, input.archived ? 1 : 0)
      return this.get(Number(info.lastInsertRowid))!
    }

    const current = this.get(input.id)
    if (!current) throw new NotFoundError(t().errors.areaNotFound)
    this.db
      .prepare('UPDATE areas SET name = ?, color = ?, archived = ? WHERE id = ?')
      .run(
        name,
        input.color !== undefined ? input.color : current.color,
        (input.archived ?? current.archived) ? 1 : 0,
        input.id
      )
    return this.get(input.id)!
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM areas WHERE id = ?').run(id)
  }
}
