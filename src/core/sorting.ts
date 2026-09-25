import type { Task } from './types'

const NO_DUE = '9999-99-99'
const NO_TIME = '99:99'

/** Chiave ordinabile della scadenza: a parità di giorno, prima quelli con orario. */
export function dueSortKey(task: Pick<Task, 'dueDate' | 'dueTime'>): string {
  return task.dueDate ? `${task.dueDate} ${task.dueTime ?? NO_TIME}` : NO_DUE
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function tieBreak(a: Task, b: Task): number {
  return compareText(a.createdAt, b.createdAt) || a.id - b.id
}

/** Priorità decrescente, poi scadenza, poi creazione. */
export function byPriorityThenDue(a: Task, b: Task): number {
  return b.priority - a.priority || compareText(dueSortKey(a), dueSortKey(b)) || tieBreak(a, b)
}

/** Scadenza (orario compreso), poi priorità decrescente, poi creazione. */
export function byDueThenPriority(a: Task, b: Task): number {
  return compareText(dueSortKey(a), dueSortKey(b)) || b.priority - a.priority || tieBreak(a, b)
}

/** Completati: i più recenti prima. */
export function byCompletedDesc(a: Task, b: Task): number {
  return compareText(b.completedAt ?? '', a.completedAt ?? '') || b.id - a.id
}
