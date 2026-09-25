import {
  firstOccurrence,
  fromRRule,
  nextAfterCompletion,
  normalizeRecurrence,
  toRRule,
  type Recurrence
} from '../../core/recurrence'
import { t } from '../../core/i18n'
import { rescheduleDate } from '../../core/reschedule'
import { isValidDateKey, isValidTimeKey, parseDateKey, toDueAt, todayKey } from '../../core/time'
import type {
  Priority,
  RescheduleTarget,
  Task,
  TaskDetail,
  TaskEvent,
  TaskEventType,
  TaskFilter,
  TaskInput,
  TaskPatch
} from '../../core/types'
import { AreasRepo } from './areasRepo'
import type { DB } from './db'
import { NotFoundError, ValidationError } from './errors'
import { setTaskPeople, setTaskTags, splitList, uniqueNames } from './links'

interface TaskRow {
  id: number
  parent_id: number | null
  title: string
  notes: string | null
  status: 'open' | 'done'
  priority: Priority
  area_id: number | null
  area_name: string | null
  due_date: string | null
  due_time: string | null
  due_at: string | null
  source_text: string | null
  created_at: string
  updated_at: string
  last_activity_at: string
  completed_at: string | null
  start_date: string | null
  estimate_min: number | null
  waiting: number
  my_day_date: string | null
  recurrence_id: number | null
  rrule: string | null
  anchor: Recurrence['anchor'] | null
  people: string | null
  tags: string | null
}

const SELECT_TASK = /* sql */ `
SELECT t.id, t.parent_id, t.title, t.notes, t.status, t.priority, t.area_id, a.name AS area_name,
       t.due_date, t.due_time, t.due_at, t.source_text, t.created_at, t.updated_at,
       t.last_activity_at, t.completed_at, t.start_date, t.estimate_min, t.waiting, t.my_day_date,
       t.recurrence_id, r.rrule, r.anchor,
       (SELECT group_concat(p.name, char(31)) FROM task_people tp JOIN people p ON p.id = tp.person_id
         WHERE tp.task_id = t.id) AS people,
       (SELECT group_concat(g.name, char(31)) FROM task_tags tt JOIN tags g ON g.id = tt.tag_id
         WHERE tt.task_id = t.id) AS tags
FROM tasks t
LEFT JOIN areas a ON a.id = t.area_id
LEFT JOIN recurrence_rules r ON r.id = t.recurrence_id`

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    areaId: row.area_id,
    areaName: row.area_name,
    dueDate: row.due_date,
    dueTime: row.due_time,
    dueAt: row.due_at,
    people: splitList(row.people),
    tags: splitList(row.tags),
    sourceText: row.source_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActivityAt: row.last_activity_at,
    completedAt: row.completed_at,
    startDate: row.start_date,
    estimateMin: row.estimate_min,
    waiting: row.waiting === 1,
    myDayDate: row.my_day_date,
    recurrenceId: row.recurrence_id,
    recurrence: row.rrule ? fromRRule(row.rrule, row.anchor ?? 'schedule') : null
  }
}

/** Trasforma il testo di ricerca in una query FTS5 sicura: ogni parola come prefisso, tutte richieste. */
export function toFtsQuery(search: string): string | null {
  const terms = search
    .split(/\s+/)
    .map((t) => t.replace(/"/g, ''))
    .filter((t) => /[\p{L}\p{N}]/u.test(t))
  return terms.length ? terms.map((t) => `"${t}"*`).join(' ') : null
}

function normalizeNotes(notes: string | null | undefined): string | null {
  const trimmed = notes?.trim()
  return trimmed ? trimmed : null
}

function requireTitle(title: string | undefined): string {
  const trimmed = title?.trim().replace(/\s+/g, ' ')
  if (!trimmed) throw new ValidationError(t().errors.titleRequired)
  return trimmed
}

function checkPriority(priority: unknown): Priority {
  if (priority !== 1 && priority !== 2 && priority !== 3) throw new ValidationError(t().errors.invalidPriority)
  return priority
}

function checkDue(date: string | null, time: string | null): void {
  if (date !== null && !isValidDateKey(date)) throw new ValidationError(t().errors.invalidDate(date))
  if (time !== null && !isValidTimeKey(time)) throw new ValidationError(t().errors.invalidTime(time))
  if (time !== null && date === null) throw new ValidationError(t().errors.timeNeedsDate)
}

function checkStart(date: string | null): string | null {
  if (date !== null && !isValidDateKey(date)) throw new ValidationError(t().errors.invalidStartDate(date))
  return date
}

function checkEstimate(minutes: number | null): number | null {
  if (minutes === null) return null
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 7 * 24 * 60) throw new ValidationError(t().errors.invalidEstimate)
  return minutes
}

/** Una ripetizione mensile senza giorno prende quello della scadenza, così non scivola nei mesi corti. */
function anchorRecurrence(r: Recurrence, dueDate: string): Recurrence {
  const n = normalizeRecurrence(r)
  if (n.freq === 'monthly' && n.byMonthDay === undefined) return { ...n, byMonthDay: parseDateKey(dueDate).day }
  return n
}

function sameList(a: string[], b: string[]): boolean {
  const norm = (l: string[]): string => [...l].map((x) => x.toLocaleLowerCase('it')).sort().join('\u0000')
  return norm(a) === norm(b)
}

export interface CompletedQuery {
  from?: string
  to?: string
  search?: string
  areaId?: number
  limit?: number
  offset?: number
}

export interface Facets {
  areas: Array<{ id: number; name: string; color: string | null; openCount: number }>
  people: Array<{ name: string; openCount: number }>
  tags: Array<{ name: string; openCount: number }>
}

export class TasksRepo {
  readonly areas: AreasRepo

  constructor(
    private readonly db: DB,
    private readonly clock: () => Date = () => new Date()
  ) {
    this.areas = new AreasRepo(db)
  }

  private nowIso(): string {
    return this.clock().toISOString()
  }

  private addEvent(taskId: number, type: TaskEventType, payload: Record<string, unknown> | null, at: string): void {
    this.db
      .prepare('INSERT INTO task_events (task_id, type, payload_json, at) VALUES (?, ?, ?, ?)')
      .run(taskId, type, payload ? JSON.stringify(payload) : null, at)
  }

  private resolveAreaId(areaId: number | null | undefined, areaName: string | null | undefined): number | null {
    if (areaId !== undefined && areaId !== null) {
      if (!this.areas.get(areaId)) throw new ValidationError(t().errors.areaMissing)
      return areaId
    }
    if (areaId === undefined && areaName?.trim()) return this.areas.findOrCreate(areaName).id
    return null
  }

  get(id: number): Task | null {
    const row = this.db.prepare(`${SELECT_TASK} WHERE t.id = ? AND t.deleted_at IS NULL`).get(id) as TaskRow | undefined
    return row ? toTask(row) : null
  }

  private require(id: number): Task {
    const task = this.get(id)
    if (!task) throw new NotFoundError(t().errors.taskNotFound)
    return task
  }

  detail(id: number): TaskDetail | null {
    const task = this.get(id)
    if (!task) return null
    const rows = this.db
      .prepare('SELECT id, task_id, type, payload_json, at FROM task_events WHERE task_id = ? ORDER BY at, id')
      .all(id) as Array<{ id: number; task_id: number; type: TaskEventType; payload_json: string | null; at: string }>
    const events: TaskEvent[] = rows.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      type: r.type,
      payload: r.payload_json ? JSON.parse(r.payload_json) : null,
      at: r.at
    }))
    return { ...task, events }
  }

  private createRule(r: Recurrence, dueDate: string): number {
    const rule = anchorRecurrence(r, dueDate)
    const info = this.db
      .prepare("INSERT INTO recurrence_rules (rrule, template_json, dtstart, anchor) VALUES (?, '{}', ?, ?)")
      .run(toRRule(rule), dueDate, rule.anchor)
    return Number(info.lastInsertRowid)
  }

  private updateRule(id: number, r: Recurrence, dueDate: string): void {
    const rule = anchorRecurrence(r, dueDate)
    this.db.prepare('UPDATE recurrence_rules SET rrule = ?, anchor = ? WHERE id = ?').run(toRRule(rule), rule.anchor, id)
  }

  create(input: TaskInput): Task {
    const title = requireTitle(input.title)
    const priority = checkPriority(input.priority ?? 2)
    const recurrence = input.recurrence ? normalizeRecurrence(input.recurrence) : null
    const dueDate = input.dueDate ?? (recurrence ? firstOccurrence(recurrence, todayKey(this.clock())) : null)
    const dueTime = input.dueTime ?? null
    checkDue(dueDate, dueTime)
    const startDate = checkStart(input.startDate ?? null)
    const estimateMin = checkEstimate(input.estimateMin ?? null)
    if (input.parentId != null && !this.get(input.parentId)) throw new ValidationError(t().errors.parentMissing)

    return this.db.transaction(() => {
      const areaId = this.resolveAreaId(input.areaId, input.areaName)
      const now = this.nowIso()
      const info = this.db
        .prepare(
          `INSERT INTO tasks (parent_id, title, notes, priority, area_id, due_date, due_time, due_at,
                              source_text, created_at, updated_at, last_activity_at,
                              start_date, estimate_min, waiting, recurrence_id)
           VALUES (@parentId, @title, @notes, @priority, @areaId, @dueDate, @dueTime, @dueAt,
                   @sourceText, @now, @now, @now, @startDate, @estimateMin, @waiting, @recurrenceId)`
        )
        .run({
          parentId: input.parentId ?? null,
          title,
          notes: normalizeNotes(input.notes),
          priority,
          areaId,
          dueDate,
          dueTime,
          dueAt: dueDate && dueTime ? toDueAt(dueDate, dueTime) : null,
          sourceText: input.sourceText ?? null,
          now,
          startDate,
          estimateMin,
          waiting: input.waiting ? 1 : 0,
          recurrenceId: recurrence && dueDate ? this.createRule(recurrence, dueDate) : null
        })
      const id = Number(info.lastInsertRowid)
      setTaskPeople(this.db, id, input.people ?? [])
      setTaskTags(this.db, id, input.tags ?? [])
      this.addEvent(id, 'created', null, now)
      return this.get(id)!
    })()
  }

  update(id: number, patch: TaskPatch): Task {
    return this.db.transaction(() => {
      const current = this.require(id)
      const sets: string[] = []
      const params: Record<string, unknown> = { id }
      const changed: string[] = []

      if (patch.title !== undefined) {
        const title = requireTitle(patch.title)
        if (title !== current.title) {
          sets.push('title = @title')
          params.title = title
          changed.push('title')
        }
      }
      if (patch.notes !== undefined) {
        const notes = normalizeNotes(patch.notes)
        if (notes !== current.notes) {
          sets.push('notes = @notes')
          params.notes = notes
          changed.push('notes')
        }
      }
      if (patch.priority !== undefined) {
        const priority = checkPriority(patch.priority)
        if (priority !== current.priority) {
          sets.push('priority = @priority')
          params.priority = priority
          changed.push('priority')
        }
      }
      if (patch.areaId !== undefined) {
        const areaId = this.resolveAreaId(patch.areaId, null)
        if (areaId !== current.areaId) {
          sets.push('area_id = @areaId')
          params.areaId = areaId
          changed.push('area')
        }
      }

      let dueChange: { from: string | null; to: string | null } | null = null
      if (patch.dueDate !== undefined || patch.dueTime !== undefined) {
        const dueDate = patch.dueDate !== undefined ? patch.dueDate : current.dueDate
        const dueTime = dueDate === null ? null : patch.dueTime !== undefined ? patch.dueTime : current.dueTime
        checkDue(dueDate, dueTime)
        if (dueDate !== current.dueDate || dueTime !== current.dueTime) {
          sets.push(
            'due_date = @dueDate',
            'due_time = @dueTime',
            'due_at = @dueAt',
            'reminded_at = NULL',
            'due_notified_at = NULL'
          )
          Object.assign(params, {
            dueDate,
            dueTime,
            dueAt: dueDate && dueTime ? toDueAt(dueDate, dueTime) : null
          })
          const fmt = (d: string | null, t: string | null): string | null => (d ? (t ? `${d} ${t}` : d) : null)
          dueChange = { from: fmt(current.dueDate, current.dueTime), to: fmt(dueDate, dueTime) }
          changed.push('due')
        }
      }

      if (patch.startDate !== undefined) {
        const startDate = checkStart(patch.startDate)
        if (startDate !== current.startDate) {
          sets.push('start_date = @startDate')
          params.startDate = startDate
          changed.push('start')
        }
      }
      if (patch.estimateMin !== undefined) {
        const estimateMin = checkEstimate(patch.estimateMin)
        if (estimateMin !== current.estimateMin) {
          sets.push('estimate_min = @estimateMin')
          params.estimateMin = estimateMin
          changed.push('estimate')
        }
      }
      if (patch.waiting !== undefined && patch.waiting !== current.waiting) {
        sets.push('waiting = @waiting')
        params.waiting = patch.waiting ? 1 : 0
        changed.push('waiting')
      }
      if (patch.recurrence !== undefined) {
        const requested = patch.recurrence ? normalizeRecurrence(patch.recurrence) : null
        const knownDue = (params.dueDate as string | null | undefined) ?? current.dueDate
        const next = requested && knownDue ? anchorRecurrence(requested, knownDue) : requested
        const same = JSON.stringify(next) === JSON.stringify(current.recurrence)
        if (!same) {
          if (next === null) {
            sets.push('recurrence_id = NULL')
          } else {
            let dueDate = (params.dueDate as string | null | undefined) ?? current.dueDate
            if (!dueDate) {
              dueDate = firstOccurrence(next, todayKey(this.clock()))
              sets.push('due_date = @dueDate', 'due_at = NULL')
              params.dueDate = dueDate
            }
            if (current.recurrenceId !== null) this.updateRule(current.recurrenceId, next, dueDate)
            else {
              sets.push('recurrence_id = @recurrenceId')
              params.recurrenceId = this.createRule(next, dueDate)
            }
          }
          changed.push('recurrence')
        }
      }

      if (patch.people !== undefined && !sameList(uniqueNames(patch.people), current.people)) {
        setTaskPeople(this.db, id, patch.people)
        changed.push('people')
      }
      if (patch.tags !== undefined && !sameList(uniqueNames(patch.tags), current.tags)) {
        setTaskTags(this.db, id, patch.tags)
        changed.push('tags')
      }

      if (changed.length === 0) return current

      const now = this.nowIso()
      sets.push('updated_at = @now', 'last_activity_at = @now')
      params.now = now
      this.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = @id`).run(params)

      if (changed.length === 1 && dueChange) this.addEvent(id, 'rescheduled', dueChange, now)
      else this.addEvent(id, 'updated', dueChange ? { fields: changed, due: dueChange } : { fields: changed }, now)
      return this.get(id)!
    })()
  }

  complete(id: number, done = true): Task {
    return this.db.transaction(() => {
      const current = this.require(id)
      if ((current.status === 'done') === done) return current
      const now = this.nowIso()
      this.db
        .prepare(
          `UPDATE tasks SET status = ?, completed_at = ?, updated_at = ?, last_activity_at = ? WHERE id = ?`
        )
        .run(done ? 'done' : 'open', done ? now : null, now, now, id)
      this.addEvent(id, done ? 'completed' : 'reopened', null, now)
      if (current.recurrence && current.recurrenceId !== null) {
        if (done) this.spawnNextOccurrence(current, now)
        else this.withdrawSpawnedOccurrence(current)
      }
      return this.get(id)!
    })()
  }

  /** Crea l'occorrenza successiva di un task ricorrente, se la serie non ne ha già una aperta. */
  private spawnNextOccurrence(task: Task, now: string): number | null {
    const open = this.db
      .prepare("SELECT count(*) AS n FROM tasks WHERE recurrence_id = ? AND status = 'open' AND deleted_at IS NULL AND id <> ?")
      .get(task.recurrenceId, task.id) as { n: number }
    if (open.n > 0) return null
    const dueDate = nextAfterCompletion(task.recurrence!, task.dueDate, todayKey(this.clock()))
    const info = this.db
      .prepare(
        `INSERT INTO tasks (title, notes, priority, area_id, due_date, due_time, due_at, source_text,
                            created_at, updated_at, last_activity_at, estimate_min, waiting, recurrence_id)
         VALUES (@title, @notes, @priority, @areaId, @dueDate, @dueTime, @dueAt, @sourceText,
                 @now, @now, @now, @estimateMin, @waiting, @recurrenceId)`
      )
      .run({
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        areaId: task.areaId,
        dueDate,
        dueTime: task.dueTime,
        dueAt: task.dueTime ? toDueAt(dueDate, task.dueTime) : null,
        sourceText: task.sourceText,
        now,
        estimateMin: task.estimateMin,
        waiting: task.waiting ? 1 : 0,
        recurrenceId: task.recurrenceId
      })
    const nextId = Number(info.lastInsertRowid)
    setTaskPeople(this.db, nextId, task.people)
    setTaskTags(this.db, nextId, task.tags)
    this.addEvent(nextId, 'created', { spawnedFrom: task.id }, now)
    return nextId
  }

  /** Riaprendo un'occorrenza, elimina quella generata dal suo completamento se non è stata ancora toccata. */
  private withdrawSpawnedOccurrence(task: Task): void {
    const spawned = this.db
      .prepare(
        `SELECT t.id FROM tasks t JOIN task_events e ON e.task_id = t.id AND e.type = 'created'
         WHERE t.recurrence_id = ? AND t.status = 'open' AND t.deleted_at IS NULL
           AND t.updated_at = t.created_at AND json_extract(e.payload_json, '$.spawnedFrom') = ?`
      )
      .all(task.recurrenceId, task.id) as Array<{ id: number }>
    const del = this.db.prepare('DELETE FROM tasks WHERE id = ?')
    for (const { id } of spawned) del.run(id)
  }

  /** Aggiunge o toglie il task da "Il mio giorno" (vale per la data di oggi). */
  setMyDay(id: number, on: boolean): Task {
    return this.db.transaction(() => {
      const current = this.require(id)
      const today = todayKey(this.clock())
      const value = on ? today : null
      if ((current.myDayDate === today) === on) return current
      const now = this.nowIso()
      this.db
        .prepare('UPDATE tasks SET my_day_date = ?, updated_at = ?, last_activity_at = ? WHERE id = ?')
        .run(value, now, now, id)
      return this.get(id)!
    })()
  }

  reschedule(id: number, target: RescheduleTarget): Task {
    return this.update(id, { dueDate: rescheduleDate(target, todayKey(this.clock())) })
  }

  setPriority(id: number, priority: Priority): Task {
    return this.update(id, { priority })
  }

  /** Cancellazione logica: il task resta recuperabile con `restore` fino alla pulizia periodica. */
  remove(id: number): void {
    this.db.transaction(() => {
      this.require(id)
      const now = this.nowIso()
      this.db.prepare('UPDATE tasks SET deleted_at = ? WHERE id = ?').run(now, id)
      this.addEvent(id, 'deleted', null, now)
    })()
  }

  restore(id: number): Task {
    return this.db.transaction(() => {
      const info = this.db.prepare('UPDATE tasks SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL').run(id)
      if (info.changes === 0) throw new NotFoundError(t().errors.nothingToRestore)
      this.addEvent(id, 'restored', null, this.nowIso())
      return this.get(id)!
    })()
  }

  purgeDeleted(olderThanDays = 30): number {
    const cutoff = new Date(this.clock().getTime() - olderThanDays * 86_400_000).toISOString()
    return this.db.prepare('DELETE FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < ?').run(cutoff).changes
  }

  query(filter: TaskFilter = {}): Task[] {
    const where = ['t.deleted_at IS NULL', 't.parent_id IS NULL']
    const params: Record<string, unknown> = {}
    if (filter.status && filter.status !== 'all') {
      where.push('t.status = @status')
      params.status = filter.status
    }
    if (filter.areaId !== undefined) {
      if (filter.areaId === null) where.push('t.area_id IS NULL')
      else {
        where.push('t.area_id = @areaId')
        params.areaId = filter.areaId
      }
    }
    if (filter.priority !== undefined) {
      where.push('t.priority = @priority')
      params.priority = filter.priority
    }
    if (filter.person) {
      where.push(`EXISTS (SELECT 1 FROM task_people tp JOIN people p ON p.id = tp.person_id
                          WHERE tp.task_id = t.id AND p.name = @person)`)
      params.person = filter.person.trim()
    }
    if (filter.tag) {
      where.push(`EXISTS (SELECT 1 FROM task_tags tt JOIN tags g ON g.id = tt.tag_id
                          WHERE tt.task_id = t.id AND g.name = @tag)`)
      params.tag = filter.tag.trim()
    }
    if (filter.search !== undefined) {
      const fts = toFtsQuery(filter.search)
      if (fts) {
        where.push('t.id IN (SELECT rowid FROM tasks_fts WHERE tasks_fts MATCH @fts)')
        params.fts = fts
      }
    }
    const limit = filter.limit ? `LIMIT ${Math.max(1, Math.floor(filter.limit))}` : ''
    const rows = this.db
      .prepare(`${SELECT_TASK} WHERE ${where.join(' AND ')} ORDER BY t.id ${limit}`)
      .all(params) as TaskRow[]
    return rows.map(toTask)
  }

  listCompleted(q: CompletedQuery = {}): { items: Task[]; total: number } {
    const where = ["t.deleted_at IS NULL", "t.status = 'done'"]
    const params: Record<string, unknown> = {}
    if (q.from) {
      where.push('t.completed_at >= @from')
      params.from = q.from
    }
    if (q.to) {
      where.push('t.completed_at < @to')
      params.to = q.to
    }
    if (q.areaId !== undefined) {
      where.push('t.area_id = @areaId')
      params.areaId = q.areaId
    }
    const fts = q.search ? toFtsQuery(q.search) : null
    if (fts) {
      where.push('t.id IN (SELECT rowid FROM tasks_fts WHERE tasks_fts MATCH @fts)')
      params.fts = fts
    }
    const clause = where.join(' AND ')
    const total = (this.db.prepare(`SELECT count(*) AS n FROM tasks t WHERE ${clause}`).get(params) as { n: number }).n
    const rows = this.db
      .prepare(`${SELECT_TASK} WHERE ${clause} ORDER BY t.completed_at DESC, t.id DESC LIMIT @limit OFFSET @offset`)
      .all({ ...params, limit: q.limit ?? 50, offset: q.offset ?? 0 }) as TaskRow[]
    return { items: rows.map(toTask), total }
  }

  /** Task aperti con orario già arrivato e non ancora notificati. */
  pendingDueAlerts(nowIso: string): Task[] {
    const rows = this.db
      .prepare(
        `${SELECT_TASK} WHERE t.deleted_at IS NULL AND t.status = 'open' AND t.due_at IS NOT NULL
           AND t.due_at <= ? AND t.due_notified_at IS NULL ORDER BY t.due_at, t.id`
      )
      .all(nowIso) as TaskRow[]
    return rows.map(toTask)
  }

  /** Task aperti con orario compreso tra adesso (escluso) e `untilIso`, senza preavviso già inviato. */
  pendingReminders(nowIso: string, untilIso: string): Task[] {
    const rows = this.db
      .prepare(
        `${SELECT_TASK} WHERE t.deleted_at IS NULL AND t.status = 'open' AND t.due_at IS NOT NULL
           AND t.due_at > ? AND t.due_at <= ? AND t.reminded_at IS NULL ORDER BY t.due_at, t.id`
      )
      .all(nowIso, untilIso) as TaskRow[]
    return rows.map(toTask)
  }

  markNotified(ids: number[], kind: 'due' | 'reminder', atIso: string): void {
    const column = kind === 'due' ? 'due_notified_at' : 'reminded_at'
    const stmt = this.db.prepare(`UPDATE tasks SET ${column} = ? WHERE id = ?`)
    this.db.transaction(() => ids.forEach((id) => stmt.run(atIso, id)))()
  }

  facets(): Facets {
    const openCount = (join: string, key: string): string => /* sql */ `
      (SELECT count(*) FROM ${join} x JOIN tasks t ON t.id = x.task_id
        WHERE x.${key} = e.id AND t.status = 'open' AND t.deleted_at IS NULL)`
    const areas = this.db
      .prepare(
        `SELECT e.id, e.name, e.color,
                (SELECT count(*) FROM tasks t WHERE t.area_id = e.id AND t.status = 'open' AND t.deleted_at IS NULL) AS openCount
         FROM areas e WHERE e.archived = 0 ORDER BY e.sort_order, e.name`
      )
      .all() as Facets['areas']
    const people = this.db
      .prepare(`SELECT e.name, ${openCount('task_people', 'person_id')} AS openCount FROM people e ORDER BY e.name`)
      .all() as Facets['people']
    const tags = this.db
      .prepare(`SELECT e.name, ${openCount('task_tags', 'tag_id')} AS openCount FROM tags e ORDER BY e.name`)
      .all() as Facets['tags']
    return { areas, people, tags }
  }
}
