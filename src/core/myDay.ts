import { isHidden } from './summary'
import { byDueThenPriority, byPriorityThenDue } from './sorting'
import { addDays, todayKey, type DateKey } from './time'
import type { Task } from './types'

const IMPORTANT_LIMIT = 5

export interface MyDay {
  today: DateKey
  planned: Task[]
  /** Completati oggi tra quelli che erano nel mio giorno. */
  done: Task[]
  estimate: {
    plannedMin: number
    unestimated: number
    doneMin: number
    capacityMin: number
  }
  suggestions: {
    overdue: Task[]
    today: Task[]
    tomorrow: Task[]
    important: Task[]
  }
}

export function isInMyDay(task: Task, today: DateKey): boolean {
  return task.myDayDate === today
}

export function buildMyDay(tasks: Task[], now: Date, capacityMin: number): MyDay {
  const today = todayKey(now)
  const tomorrow = addDays(today, 1)
  const planned = tasks.filter((t) => t.status === 'open' && isInMyDay(t, today)).sort(byDueThenPriority)
  const done = tasks
    .filter((t) => t.status === 'done' && isInMyDay(t, today) && t.completedAt && todayKey(new Date(t.completedAt)) === today)
    .sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1))

  const candidates = tasks.filter(
    (t) => t.status === 'open' && !isInMyDay(t, today) && !t.waiting && !isHidden(t, today)
  )
  const overdue = candidates.filter((t) => t.dueDate !== null && t.dueDate < today).sort(byDueThenPriority)
  const dueToday = candidates.filter((t) => t.dueDate === today).sort(byDueThenPriority)
  const dueTomorrow = candidates.filter((t) => t.dueDate === tomorrow).sort(byDueThenPriority)
  const important = candidates
    .filter((t) => t.priority === 3 && (t.dueDate === null || t.dueDate > tomorrow))
    .sort(byPriorityThenDue)
    .slice(0, IMPORTANT_LIMIT)

  return {
    today,
    planned,
    done,
    estimate: {
      plannedMin: planned.reduce((sum, t) => sum + (t.estimateMin ?? 0), 0),
      unestimated: planned.filter((t) => t.estimateMin === null).length,
      doneMin: done.reduce((sum, t) => sum + (t.estimateMin ?? 0), 0),
      capacityMin
    },
    suggestions: { overdue, today: dueToday, tomorrow: dueTomorrow, important }
  }
}
