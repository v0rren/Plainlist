import { addDays, type DateKey } from './time'
import { byCompletedDesc, byPriorityThenDue } from './sorting'
import type { Task } from './types'

export type GroupId = 'overdue' | 'today' | 'upcoming' | 'later' | 'noDue' | 'completed'

export const GROUP_ORDER: GroupId[] = ['overdue', 'today', 'upcoming', 'later', 'noDue', 'completed']

export const GROUP_LABEL: Record<GroupId, string> = {
  overdue: 'Scaduti',
  today: 'Oggi',
  upcoming: 'Prossimi 7 giorni',
  later: 'Più avanti',
  noDue: 'Senza scadenza',
  completed: 'Completati'
}

export interface TaskGroup {
  id: GroupId
  label: string
  tasks: Task[]
}

export function groupOf(task: Task, today: DateKey, upcomingDays = 7): GroupId {
  if (task.status === 'done') return 'completed'
  if (!task.dueDate) return 'noDue'
  if (task.dueDate < today) return 'overdue'
  if (task.dueDate === today) return 'today'
  if (task.dueDate <= addDays(today, upcomingDays)) return 'upcoming'
  return 'later'
}

/** Restituisce sempre tutti i gruppi, nell'ordine di visualizzazione, anche se vuoti. */
export function groupTasks(tasks: Task[], today: DateKey, upcomingDays = 7): TaskGroup[] {
  const buckets = new Map<GroupId, Task[]>(GROUP_ORDER.map((id) => [id, []]))
  for (const task of tasks) buckets.get(groupOf(task, today, upcomingDays))!.push(task)
  return GROUP_ORDER.map((id) => {
    const list = buckets.get(id)!
    list.sort(id === 'completed' ? byCompletedDesc : byPriorityThenDue)
    return { id, label: GROUP_LABEL[id], tasks: list }
  })
}
