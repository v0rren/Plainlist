import { groupTasks } from '../../core/grouping'
import { t } from '../../core/i18n'
import { buildMyDay, type MyDay } from '../../core/myDay'
import { parseQuickInput } from '../../core/parser'
import { buildPersonOverview, type PersonOverview } from '../../core/person'
import { buildSummary, isHidden, type Summary } from '../../core/summary'
import { addDays, toDueAt, todayKey } from '../../core/time'
import type { Task } from '../../core/types'
import type { FacetsResponse, ListFilter, TaskListRequest, TaskListResponse, ViewCounts, ViewId } from '../../shared/ipc'
import { SettingsRepo, TasksRepo, ValidationError, type DB } from '../data'

const RECENT_COMPLETED_DAYS = 7
const RECENT_COMPLETED_LIMIT = 50

export function matchesView(task: Task, view: ViewId, today: string, upcomingDays: number): boolean {
  const due = task.dueDate
  if (view === 'scheduled') return isHidden(task, today)
  if (isHidden(task, today)) return false
  switch (view) {
    case 'all':
      return true
    case 'today':
      return due !== null && due <= today
    case 'tomorrow':
      return due === addDays(today, 1)
    case 'upcoming':
      return due !== null && due > today && due <= addDays(today, upcomingDays)
    case 'noDue':
      return due === null
    case 'waiting':
      return task.waiting
  }
}

/** Logica applicativa indipendente da Electron: usata dagli handler IPC e dai test. */
export class TaskService {
  readonly tasks: TasksRepo
  readonly settings: SettingsRepo

  constructor(
    readonly db: DB,
    private readonly clock: () => Date = () => new Date()
  ) {
    this.tasks = new TasksRepo(db, clock)
    this.settings = new SettingsRepo(db)
  }

  today(): string {
    return todayKey(this.clock())
  }

  quickAdd(text: string): Task {
    const facets = this.tasks.facets()
    const parsed = parseQuickInput(text, {
      now: this.clock(),
      knownAreas: facets.areas.map((a) => a.name),
      knownPeople: facets.people.map((p) => p.name),
      language: this.settings.getAll().language
    })
    if (!parsed.title) throw new ValidationError(t().errors.titleRequired)
    const { defaultAreaId } = this.settings.getAll()
    const defaultArea = defaultAreaId !== null && this.tasks.areas.get(defaultAreaId) ? defaultAreaId : null
    return this.tasks.create({
      title: parsed.title,
      priority: parsed.priority ?? 2,
      ...(parsed.area ? { areaName: parsed.area.name } : { areaId: defaultArea }),
      dueDate: parsed.due?.date ?? null,
      dueTime: parsed.due?.time ?? null,
      people: parsed.people.map((p) => p.name),
      tags: parsed.tags,
      sourceText: text.trim(),
      recurrence: parsed.recurrence,
      startDate: parsed.start,
      estimateMin: parsed.estimate,
      waiting: parsed.waiting
    })
  }

  list(req: TaskListRequest): TaskListResponse {
    const today = this.today()
    const { upcomingDays } = this.settings.getAll()
    const filter = this.toTaskFilter(req)
    const open = this.tasks.query({ ...filter, status: 'open' }).filter((t) => matchesView(t, req.view, today, upcomingDays))
    let completed: Task[] = []
    if (req.view === 'all') {
      const since = new Date(this.clock().getTime() - RECENT_COMPLETED_DAYS * 86_400_000).toISOString()
      completed = this.tasks
        .query({ ...filter, status: 'done' })
        .filter((t) => (t.completedAt ?? '') >= since)
    }
    const groups = groupTasks([...open, ...completed], today, upcomingDays)
    const completedGroup = groups.find((g) => g.id === 'completed')
    if (completedGroup) completedGroup.tasks = completedGroup.tasks.slice(0, RECENT_COMPLETED_LIMIT)
    return { today, groups }
  }

  counts(): ViewCounts {
    const today = this.today()
    const { upcomingDays } = this.settings.getAll()
    const open = this.tasks.query({ status: 'open' })
    const count = (view: ViewId): number => open.filter((t) => matchesView(t, view, today, upcomingDays)).length
    return {
      all: count('all'),
      today: count('today'),
      tomorrow: count('tomorrow'),
      upcoming: count('upcoming'),
      noDue: count('noDue'),
      waiting: count('waiting'),
      scheduled: count('scheduled'),
      myDay: open.filter((t) => t.myDayDate === today).length
    }
  }

  facets(): FacetsResponse {
    return { ...this.tasks.facets(), counts: this.counts() }
  }

  summary(filter: { areaId?: number; person?: string }): Summary {
    const { staleDays, upcomingDays } = this.settings.getAll()
    return buildSummary(this.tasks.query({ status: 'open' }), {
      now: this.clock(),
      staleDays,
      upcomingDays,
      areaId: filter.areaId,
      person: filter.person
    })
  }

  myDay(): MyDay {
    const today = this.today()
    const open = this.tasks.query({ status: 'open' })
    const doneToday = this.tasks.listCompleted({ from: toDueAt(today, '00:00'), limit: 500 }).items
    return buildMyDay([...open, ...doneToday], this.clock(), this.settings.getAll().workdayMinutes)
  }

  person(name: string): PersonOverview {
    const { upcomingDays } = this.settings.getAll()
    return buildPersonOverview(this.tasks.query({ person: name }), name, this.clock(), { upcomingDays })
  }

  private toTaskFilter(f: ListFilter) {
    return {
      areaId: f.areaId,
      priority: f.priority,
      person: f.person || undefined,
      search: f.search?.trim() || undefined
    }
  }
}
