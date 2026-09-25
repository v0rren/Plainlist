import { groupOf } from './grouping'
import { byDueThenPriority, byPriorityThenDue } from './sorting'
import { diffDays, formatDateLong, formatDue, todayKey, type DateKey } from './time'
import { PRIORITY_LABEL, type Task } from './types'

const DAY_MS = 86_400_000

export interface SummaryOptions {
  now: Date
  staleDays?: number
  upcomingDays?: number
  areaId?: number
  person?: string
}

export interface DayBucket {
  date: DateKey
  label: string
  tasks: Task[]
}

export interface Suggestion {
  task: Task
  reason: string
}

export interface Summary {
  today: DateKey
  overdue: Task[]
  dueToday: Task[]
  upcoming: DayBucket[]
  noDue: Task[]
  stale: Task[]
  /** Delegati o in attesa di altri: non entrano nelle altre sezioni né nel suggerimento. */
  waiting: Task[]
  suggestion: { first: Suggestion; next: Suggestion[] } | null
  /** Somma delle stime dei task di oggi e quanti ne sono senza stima. */
  todayEstimate: { minutes: number; unestimated: number }
  counts: {
    open: number
    overdue: number
    today: number
    upcoming: number
    noDue: number
    stale: number
    waiting: number
  }
}

/** Un task con data di inizio futura è nascosto fino a quel giorno. */
export function isHidden(task: Task, today: DateKey): boolean {
  return task.startDate !== null && task.startDate > today
}

export function filterForSummary(
  tasks: Task[],
  options: Pick<SummaryOptions, 'areaId' | 'person'>,
  today: DateKey
): Task[] {
  const person = options.person?.toLocaleLowerCase('it')
  return tasks.filter(
    (t) =>
      t.status === 'open' &&
      !isHidden(t, today) &&
      (options.areaId === undefined || t.areaId === options.areaId) &&
      (person === undefined || t.people.some((p) => p.toLocaleLowerCase('it') === person))
  )
}

export function isStale(task: Task, now: Date, staleDays = 14): boolean {
  return Date.parse(task.lastActivityAt) < now.getTime() - staleDays * DAY_MS
}

/**
 * Ordine del suggerimento:
 * 1. scaduti ad alta priorità, dal più vecchio;
 * 2. in scadenza oggi ad alta priorità, per orario;
 * 3. tutti gli altri per scadenza (a parità, priorità), infine quelli senza scadenza per priorità.
 */
export function suggestionOrder(open: Task[], today: DateKey): Task[] {
  const highOverdue = open.filter((t) => t.priority === 3 && t.dueDate !== null && t.dueDate < today)
  const highToday = open.filter((t) => t.priority === 3 && t.dueDate === today)
  const picked = new Set([...highOverdue, ...highToday])
  const withDue = open.filter((t) => !picked.has(t) && t.dueDate !== null)
  const withoutDue = open.filter((t) => t.dueDate === null)
  return [
    ...highOverdue.sort(byDueThenPriority),
    ...highToday.sort(byDueThenPriority),
    ...withDue.sort(byDueThenPriority),
    ...withoutDue.sort(byPriorityThenDue)
  ]
}

export function suggestionReason(task: Task, today: DateKey): string {
  const priority = `priorità ${PRIORITY_LABEL[task.priority]}`
  if (!task.dueDate) return `senza scadenza, ${priority}`
  const delta = diffDays(task.dueDate, today)
  if (delta < 0) {
    const days = -delta
    return `scaduto da ${days} ${days === 1 ? 'giorno' : 'giorni'}, ${priority}`
  }
  if (delta === 0) return `${task.dueTime ? `in scadenza oggi alle ${task.dueTime}` : 'in scadenza oggi'}, ${priority}`
  return `scadenza ${formatDue(task.dueDate, task.dueTime, today)}, ${priority}`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Ogni task compare in una sola sezione. Scaduti, oggi e prossimi giorni hanno la precedenza;
 * tra gli altri, quelli fermi vanno in "fermi" e i restanti senza scadenza in "senza scadenza".
 * I task oltre l'orizzonte e non fermi non compaiono nel riepilogo.
 */
export function buildSummary(tasks: Task[], options: SummaryOptions): Summary {
  const { now, staleDays = 14, upcomingDays = 7 } = options
  const today = todayKey(now)
  const visible = filterForSummary(tasks, options, today)
  const waiting = visible.filter((t) => t.waiting).sort(byDueThenPriority)
  const open = visible.filter((t) => !t.waiting)

  const overdue: Task[] = []
  const dueToday: Task[] = []
  const upcomingTasks: Task[] = []
  const noDue: Task[] = []
  const stale: Task[] = []

  for (const task of open) {
    const group = groupOf(task, today, upcomingDays)
    if (group === 'overdue') overdue.push(task)
    else if (group === 'today') dueToday.push(task)
    else if (group === 'upcoming') upcomingTasks.push(task)
    else if (isStale(task, now, staleDays)) stale.push(task)
    else if (group === 'noDue') noDue.push(task)
  }

  overdue.sort(byDueThenPriority)
  dueToday.sort(byDueThenPriority)
  noDue.sort(byPriorityThenDue)
  stale.sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? -1 : a.lastActivityAt > b.lastActivityAt ? 1 : a.id - b.id))

  const byDay = new Map<DateKey, Task[]>()
  for (const task of upcomingTasks.sort(byDueThenPriority)) {
    const list = byDay.get(task.dueDate!) ?? []
    list.push(task)
    byDay.set(task.dueDate!, list)
  }
  const upcoming: DayBucket[] = [...byDay.entries()].map(([date, list]) => ({
    date,
    label: capitalize(formatDateLong(date, today)),
    tasks: list
  }))

  const ordered = suggestionOrder(open, today)
  const suggestion =
    ordered.length === 0
      ? null
      : {
          first: { task: ordered[0], reason: suggestionReason(ordered[0], today) },
          next: ordered.slice(1, 3).map((task) => ({ task, reason: suggestionReason(task, today) }))
        }

  return {
    today,
    overdue,
    dueToday,
    upcoming,
    noDue,
    stale,
    waiting,
    suggestion,
    todayEstimate: {
      minutes: dueToday.reduce((sum, t) => sum + (t.estimateMin ?? 0), 0),
      unestimated: dueToday.filter((t) => t.estimateMin === null).length
    },
    counts: {
      open: visible.length,
      waiting: waiting.length,
      overdue: overdue.length,
      today: dueToday.length,
      upcoming: upcomingTasks.length,
      noDue: noDue.length,
      stale: stale.length
    }
  }
}
