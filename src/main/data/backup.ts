import { t } from '../../core/i18n'
import { fromRRule, normalizeRecurrence, toRRule, type Recurrence } from '../../core/recurrence'
import { isValidDateKey, isValidTimeKey, toDueAt } from '../../core/time'
import type { Priority } from '../../core/types'
import { DEFAULT_SETTINGS, type Settings } from '../../shared/types'
import type { DB } from './db'
import { ValidationError } from './errors'
import { setTaskPeople, setTaskTags, splitList } from './links'
import { SettingsRepo } from './settingsRepo'

export const BACKUP_FORMAT = 'plainlist-backup'
export const BACKUP_VERSION = 2
const SUPPORTED_VERSIONS = [1, 2]

export interface BackupArea {
  id: number
  name: string
  color: string | null
  sortOrder: number
  archived: boolean
}

export interface BackupEvent {
  type: string
  payload: unknown
  at: string
}

export interface BackupTask {
  id: number
  parentId: number | null
  title: string
  notes: string | null
  status: 'open' | 'done'
  priority: Priority
  areaId: number | null
  dueDate: string | null
  dueTime: string | null
  sortOrder: number
  sourceText: string | null
  createdAt: string
  updatedAt: string
  lastActivityAt: string
  completedAt: string | null
  people: string[]
  tags: string[]
  events: BackupEvent[]
  startDate?: string | null
  estimateMin?: number | null
  waiting?: boolean
  myDayDate?: string | null
  /** Identificativo della serie ricorrente nel file: le occorrenze della stessa serie lo condividono. */
  recurrenceId?: number | null
  recurrence?: Recurrence | null
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  areas: BackupArea[]
  tasks: BackupTask[]
  settings: Partial<Settings>
}

export function exportBackup(db: DB, now: Date = new Date()): BackupFile {
  const areas = (db.prepare('SELECT * FROM areas ORDER BY id').all() as Array<Record<string, unknown>>).map(
    (r): BackupArea => ({
      id: r.id as number,
      name: r.name as string,
      color: r.color as string | null,
      sortOrder: r.sort_order as number,
      archived: r.archived === 1
    })
  )
  const eventsOf = db.prepare('SELECT type, payload_json, at FROM task_events WHERE task_id = ? ORDER BY at, id')
  const rows = db
    .prepare(
      `SELECT t.*, r.rrule AS rule_rrule, r.anchor AS rule_anchor,
        (SELECT group_concat(p.name, char(31)) FROM task_people tp JOIN people p ON p.id = tp.person_id WHERE tp.task_id = t.id) AS people_list,
        (SELECT group_concat(g.name, char(31)) FROM task_tags tt JOIN tags g ON g.id = tt.tag_id WHERE tt.task_id = t.id) AS tags_list
       FROM tasks t LEFT JOIN recurrence_rules r ON r.id = t.recurrence_id
       WHERE t.deleted_at IS NULL ORDER BY t.id`
    )
    .all() as Array<Record<string, unknown>>
  const tasks = rows.map(
    (r): BackupTask => ({
      id: r.id as number,
      parentId: r.parent_id as number | null,
      title: r.title as string,
      notes: r.notes as string | null,
      status: r.status as 'open' | 'done',
      priority: r.priority as Priority,
      areaId: r.area_id as number | null,
      dueDate: r.due_date as string | null,
      dueTime: r.due_time as string | null,
      sortOrder: r.sort_order as number,
      sourceText: r.source_text as string | null,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      lastActivityAt: r.last_activity_at as string,
      completedAt: r.completed_at as string | null,
      people: splitList(r.people_list as string | null),
      tags: splitList(r.tags_list as string | null),
      startDate: r.start_date as string | null,
      estimateMin: r.estimate_min as number | null,
      waiting: r.waiting === 1,
      myDayDate: r.my_day_date as string | null,
      recurrenceId: r.rule_rrule ? (r.recurrence_id as number) : null,
      recurrence: r.rule_rrule
        ? fromRRule(r.rule_rrule as string, (r.rule_anchor as Recurrence['anchor'] | null) ?? 'schedule')
        : null,
      events: (eventsOf.all(r.id) as Array<{ type: string; payload_json: string | null; at: string }>).map((e) => ({
        type: e.type,
        payload: e.payload_json ? JSON.parse(e.payload_json) : null,
        at: e.at
      }))
    })
  )
  const { firstRunDone: _ignored, ...settings } = new SettingsRepo(db).getAll()
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), areas, tasks, settings }
}

function fail(message: string): never {
  throw new ValidationError(t().backupFile.invalid(message))
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))
const isOptString = (v: unknown): v is string | null => v === null || typeof v === 'string'
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

export function validateBackup(data: unknown): BackupFile {
  const m = t().backupFile
  if (!isObject(data)) fail(m.notObject)
  if (data.format !== BACKUP_FORMAT) fail(m.unknownFormat)
  if (!SUPPORTED_VERSIONS.includes(data.version as number)) fail(m.unsupportedVersion(String(data.version)))
  if (!Array.isArray(data.areas) || !Array.isArray(data.tasks)) fail(m.missingAreasOrTasks)

  const areaIds = new Set<number>()
  for (const a of data.areas as unknown[]) {
    if (!isObject(a) || !Number.isInteger(a.id) || typeof a.name !== 'string' || !a.name.trim()) fail(m.invalidArea)
    if (areaIds.has(a.id as number)) fail(m.duplicateArea(String(a.id)))
    areaIds.add(a.id as number)
  }

  const taskIds = new Set<number>()
  for (const t of data.tasks as unknown[]) {
    if (!isObject(t) || !Number.isInteger(t.id)) fail(m.taskWithoutId)
    const where = m.task(String(t.id))
    if (taskIds.has(t.id as number)) fail(`${where} ${m.duplicate}`)
    taskIds.add(t.id as number)
    if (typeof t.title !== 'string' || !t.title.trim()) fail(`${where}: ${m.missingTitle}`)
    if (t.status !== 'open' && t.status !== 'done') fail(`${where}: ${m.invalidStatus}`)
    if (t.priority !== 1 && t.priority !== 2 && t.priority !== 3) fail(`${where}: ${m.invalidPriority}`)
    if (t.areaId !== null && !areaIds.has(t.areaId as number)) fail(`${where}: ${m.missingArea}`)
    if (t.dueDate !== null && !isValidDateKey(t.dueDate)) fail(`${where}: ${m.invalidDate}`)
    if (t.dueTime !== null && (!isValidTimeKey(t.dueTime) || t.dueDate === null)) fail(`${where}: ${m.invalidTime}`)
    if (!isIso(t.createdAt) || !isIso(t.updatedAt) || !isIso(t.lastActivityAt)) fail(`${where}: ${m.invalidSystemDates}`)
    if (t.completedAt !== null && !isIso(t.completedAt)) fail(`${where}: ${m.invalidCompletedAt}`)
    if (!isOptString(t.notes) || !isOptString(t.sourceText)) fail(`${where}: ${m.invalidText}`)
    if (!isStringArray(t.people) || !isStringArray(t.tags)) fail(`${where}: ${m.invalidPeopleOrTags}`)
    if (!Array.isArray(t.events)) fail(`${where}: ${m.invalidHistory}`)
    if (t.startDate != null && !isValidDateKey(t.startDate)) fail(`${where}: ${m.invalidStartDate}`)
    if (t.myDayDate != null && !isValidDateKey(t.myDayDate)) fail(`${where}: ${m.invalidMyDay}`)
    if (t.estimateMin != null && (!Number.isInteger(t.estimateMin) || (t.estimateMin as number) < 1)) {
      fail(`${where}: ${m.invalidEstimate}`)
    }
    if (t.recurrence != null) {
      const r = t.recurrence as Record<string, unknown>
      if (!isObject(r) || !['daily', 'weekly', 'monthly', 'yearly'].includes(r.freq as string)) {
        fail(`${where}: ${m.invalidRecurrence}`)
      }
      if (t.dueDate === null) fail(`${where}: ${m.recurringNeedsDue}`)
    }
  }
  for (const t of data.tasks as BackupTask[]) {
    if (t.parentId !== null && !taskIds.has(t.parentId)) fail(`${m.task(String(t.id))}: ${m.missingParent}`)
  }
  if (data.settings !== undefined && !isObject(data.settings)) fail(m.invalidSettings)
  return data as unknown as BackupFile
}

/** Sostituisce tutti i dati con quelli del backup, in un'unica transazione. */
export function importBackup(db: DB, data: unknown, now: Date = new Date()): { tasks: number; areas: number } {
  const backup = validateBackup(data)
  const nowIso = now.toISOString()

  db.transaction(() => {
    for (const table of ['task_events', 'task_tags', 'task_people', 'tasks', 'tags', 'people', 'areas', 'recurrence_rules']) {
      db.prepare(`DELETE FROM ${table}`).run()
    }

    const insertArea = db.prepare('INSERT INTO areas (id, name, color, sort_order, archived) VALUES (?, ?, ?, ?, ?)')
    for (const a of backup.areas) {
      insertArea.run(a.id, a.name.trim(), a.color ?? null, a.sortOrder ?? 0, a.archived ? 1 : 0)
    }

    const insertTask = db.prepare(
      `INSERT INTO tasks (id, title, notes, status, priority, area_id, due_date, due_time, due_at, sort_order,
                          source_text, created_at, updated_at, last_activity_at, completed_at, due_notified_at, reminded_at,
                          start_date, estimate_min, waiting, my_day_date, recurrence_id)
       VALUES (@id, @title, @notes, @status, @priority, @areaId, @dueDate, @dueTime, @dueAt, @sortOrder,
               @sourceText, @createdAt, @updatedAt, @lastActivityAt, @completedAt, @notified, @notified,
               @startDate, @estimateMin, @waiting, @myDayDate, @ruleId)`
    )
    const insertRule = db.prepare(
      "INSERT INTO recurrence_rules (rrule, template_json, dtstart, anchor) VALUES (?, '{}', ?, ?)"
    )
    const ruleIds = new Map<string, number>()
    const ruleFor = (t: BackupTask): number | null => {
      if (!t.recurrence || !t.dueDate) return null
      const key = t.recurrenceId != null ? `id:${t.recurrenceId}` : `task:${t.id}`
      let id = ruleIds.get(key)
      if (id === undefined) {
        const rule = normalizeRecurrence(t.recurrence)
        id = Number(insertRule.run(toRRule(rule), t.dueDate, rule.anchor).lastInsertRowid)
        ruleIds.set(key, id)
      }
      return id
    }
    const insertEvent = db.prepare('INSERT INTO task_events (task_id, type, payload_json, at) VALUES (?, ?, ?, ?)')
    for (const t of backup.tasks) {
      const dueAt = t.dueDate && t.dueTime ? toDueAt(t.dueDate, t.dueTime) : null
      insertTask.run({
        id: t.id,
        title: t.title.trim(),
        notes: t.notes,
        status: t.status,
        priority: t.priority,
        areaId: t.areaId,
        dueDate: t.dueDate,
        dueTime: t.dueTime,
        dueAt,
        sortOrder: t.sortOrder ?? 0,
        sourceText: t.sourceText,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        lastActivityAt: t.lastActivityAt,
        completedAt: t.completedAt,
        notified: dueAt !== null && dueAt <= nowIso ? nowIso : null,
        startDate: t.startDate ?? null,
        estimateMin: t.estimateMin ?? null,
        waiting: t.waiting ? 1 : 0,
        myDayDate: t.myDayDate ?? null,
        ruleId: ruleFor(t)
      })
      setTaskPeople(db, t.id, t.people)
      setTaskTags(db, t.id, t.tags)
      for (const e of t.events) {
        insertEvent.run(t.id, String(e.type), e.payload == null ? null : JSON.stringify(e.payload), String(e.at))
      }
    }
    const setParent = db.prepare('UPDATE tasks SET parent_id = ? WHERE id = ?')
    for (const t of backup.tasks) if (t.parentId !== null) setParent.run(t.parentId, t.id)

    db.prepare("INSERT INTO tasks_fts(tasks_fts) VALUES ('rebuild')").run()

    if (backup.settings) {
      const known = Object.keys(DEFAULT_SETTINGS).filter((k) => k !== 'firstRunDone')
      const incoming = Object.fromEntries(Object.entries(backup.settings).filter(([k]) => known.includes(k)))
      new SettingsRepo(db).set(incoming as Partial<Settings>)
    }
  })()

  return { tasks: backup.tasks.length, areas: backup.areas.length }
}
