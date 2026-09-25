import { groupTasks, type TaskGroup } from './grouping'
import { byCompletedDesc, byDueThenPriority } from './sorting'
import { todayKey, type DateKey } from './time'
import type { Task } from './types'

const DAY_MS = 86_400_000

export interface PersonOverview {
  name: string
  today: DateKey
  /** Cose delegate o in attesa che coinvolgono la persona. */
  waiting: Task[]
  /** Gli altri task aperti, raggruppati per scadenza (gruppi vuoti esclusi). */
  open: TaskGroup[]
  recentDone: Task[]
  counts: { open: number; waiting: number; overdue: number }
}

export function involves(task: Task, name: string): boolean {
  const key = name.toLocaleLowerCase('it')
  return task.people.some((p) => p.toLocaleLowerCase('it') === key)
}

export function buildPersonOverview(
  tasks: Task[],
  name: string,
  now: Date,
  options: { recentDays?: number; upcomingDays?: number } = {}
): PersonOverview {
  const { recentDays = 14, upcomingDays = 7 } = options
  const today = todayKey(now)
  const mine = tasks.filter((t) => involves(t, name))
  const openTasks = mine.filter((t) => t.status === 'open')
  const waiting = openTasks.filter((t) => t.waiting).sort(byDueThenPriority)
  const others = openTasks.filter((t) => !t.waiting)
  const since = new Date(now.getTime() - recentDays * DAY_MS).toISOString()
  const recentDone = mine
    .filter((t) => t.status === 'done' && (t.completedAt ?? '') >= since)
    .sort(byCompletedDesc)

  return {
    name,
    today,
    waiting,
    open: groupTasks(others, today, upcomingDays).filter((g) => g.tasks.length > 0),
    recentDone,
    counts: {
      open: openTasks.length,
      waiting: waiting.length,
      overdue: openTasks.filter((t) => t.dueDate !== null && t.dueDate < today).length
    }
  }
}
