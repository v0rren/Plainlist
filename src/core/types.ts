import type { Recurrence } from './recurrence'
import type { DateKey, TimeKey } from './time'

export type Priority = 1 | 2 | 3
export type TaskStatus = 'open' | 'done'

export const PRIORITY_LABEL: Record<Priority, string> = { 3: 'alta', 2: 'media', 1: 'bassa' }

export interface Task {
  id: number
  parentId: number | null
  title: string
  notes: string | null
  status: TaskStatus
  priority: Priority
  areaId: number | null
  areaName: string | null
  dueDate: DateKey | null
  dueTime: TimeKey | null
  dueAt: string | null
  people: string[]
  tags: string[]
  sourceText: string | null
  createdAt: string
  updatedAt: string
  lastActivityAt: string
  completedAt: string | null
  /** Il task resta nascosto fino a questa data (inclusa l'apparizione in quel giorno). */
  startDate: DateKey | null
  estimateMin: number | null
  /** Delegato o in attesa di qualcun altro: escluso dal suggerimento su cosa fare. */
  waiting: boolean
  /** Data in cui il task è stato messo in "Il mio giorno": vale solo se coincide con oggi. */
  myDayDate: DateKey | null
  recurrenceId: number | null
  recurrence: Recurrence | null
}

export interface Area {
  id: number
  name: string
  color: string | null
  sortOrder: number
  archived: boolean
}

export type TaskEventType =
  | 'created'
  | 'updated'
  | 'completed'
  | 'reopened'
  | 'rescheduled'
  | 'deleted'
  | 'restored'

export interface TaskEvent {
  id: number
  taskId: number
  type: TaskEventType
  payload: Record<string, unknown> | null
  at: string
}

export interface TaskDetail extends Task {
  events: TaskEvent[]
}

export interface TaskInput {
  title: string
  notes?: string | null
  priority?: Priority
  areaId?: number | null
  areaName?: string | null
  dueDate?: DateKey | null
  dueTime?: TimeKey | null
  people?: string[]
  tags?: string[]
  sourceText?: string | null
  parentId?: number | null
  startDate?: DateKey | null
  estimateMin?: number | null
  waiting?: boolean
  recurrence?: Recurrence | null
}

export interface TaskPatch {
  title?: string
  notes?: string | null
  priority?: Priority
  areaId?: number | null
  dueDate?: DateKey | null
  dueTime?: TimeKey | null
  people?: string[]
  tags?: string[]
  startDate?: DateKey | null
  estimateMin?: number | null
  waiting?: boolean
  recurrence?: Recurrence | null
}

export type RescheduleTarget = 'today' | 'tomorrow' | 'nextWeek' | { date: DateKey }

export interface TaskFilter {
  status?: 'open' | 'done' | 'all'
  areaId?: number | null
  priority?: Priority
  person?: string
  tag?: string
  search?: string
  limit?: number
}
