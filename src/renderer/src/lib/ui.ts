import { diffDays, formatDateShort, formatDue } from '@core/time'
import type { Priority, Task } from '@shared/types'

export const api = window.api

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export const PRIORITIES: Array<{ value: Priority; label: string; text: string; bg: string }> = [
  { value: 3, label: 'Alta', text: 'text-prio-high', bg: 'bg-prio-high' },
  { value: 2, label: 'Media', text: 'text-prio-med', bg: 'bg-prio-med' },
  { value: 1, label: 'Bassa', text: 'text-prio-low', bg: 'bg-prio-low' }
]

export function priorityMeta(p: Priority): (typeof PRIORITIES)[number] {
  return PRIORITIES.find((x) => x.value === p)!
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'normal'

export function dueInfo(task: Pick<Task, 'dueDate' | 'dueTime' | 'status'>, today: string): { text: string; tone: DueTone } | null {
  if (!task.dueDate) return null
  const delta = diffDays(task.dueDate, today)
  const tone: DueTone =
    task.status === 'done' ? 'normal' : delta < 0 ? 'overdue' : delta === 0 ? 'today' : delta <= 2 ? 'soon' : 'normal'
  return { text: formatDue(task.dueDate, task.dueTime, today), tone }
}

export const DUE_TONE_CLASS: Record<DueTone, string> = {
  overdue: 'text-danger',
  today: 'text-accent',
  soon: 'text-fg',
  normal: 'text-muted'
}

/** "domani · ven 25 set" per l'anteprima: data relativa più data esplicita. */
export function dueWithDate(date: string, time: string | null, today: string): string {
  const relative = formatDue(date, time, today)
  const delta = diffDays(date, today)
  return delta >= -1 && delta <= 1 ? `${relative} · ${formatDateShort(date, today)}` : relative
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable="true"]')
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
