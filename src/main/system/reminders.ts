import type { Summary } from '../../core/summary'
import type { Task } from '../../core/types'
import type { Settings } from '../../shared/types'
import type { TasksRepo } from '../data'

/** Oltre questa soglia un avviso perso (PC spento o in sospensione) non viene più mostrato. */
export const LATE_ALERT_WINDOW_MIN = 60

export interface ReminderNotifier {
  dueSoon(task: Task, minutesLeft: number): void
  due(task: Task): void
}

/** Decide quali avvisi inviare. Non dipende da Electron: il main gli passa un notifier reale. */
export class ReminderScheduler {
  constructor(
    private readonly tasks: TasksRepo,
    private readonly settings: () => Settings,
    private readonly notifier: ReminderNotifier,
    private readonly clock: () => Date = () => new Date()
  ) {}

  /** All'avvio: gli orari passati mentre l'app era chiusa finiscono nel riepilogo, non in una raffica di notifiche. */
  catchUp(): void {
    const nowIso = this.clock().toISOString()
    const missed = this.tasks.pendingDueAlerts(nowIso).map((t) => t.id)
    this.tasks.markNotified(missed, 'due', nowIso)
    this.tasks.markNotified(missed, 'reminder', nowIso)
  }

  tick(): void {
    const now = this.clock()
    const nowIso = now.toISOString()
    const { enabled, dueAlerts, remindBeforeMin } = this.settings().notifications
    const active = enabled && dueAlerts

    const due = this.tasks.pendingDueAlerts(nowIso)
    if (due.length) {
      const lateLimit = now.getTime() - LATE_ALERT_WINDOW_MIN * 60_000
      if (active) for (const t of due) if (Date.parse(t.dueAt!) >= lateLimit) this.notifier.due(t)
      this.tasks.markNotified(
        due.map((t) => t.id),
        'due',
        nowIso
      )
    }

    if (active && remindBeforeMin) {
      const until = new Date(now.getTime() + remindBeforeMin * 60_000).toISOString()
      const soon = this.tasks.pendingReminders(nowIso, until)
      for (const t of soon) {
        this.notifier.dueSoon(t, Math.max(1, Math.round((Date.parse(t.dueAt!) - now.getTime()) / 60_000)))
      }
      this.tasks.markNotified(
        soon.map((t) => t.id),
        'reminder',
        nowIso
      )
    }
  }
}

export function digestText(summary: Summary): { title: string; body: string } {
  const { overdue, today } = summary.counts
  const parts: string[] = []
  if (overdue) parts.push(`${overdue} ${overdue === 1 ? 'task scaduto' : 'task scaduti'}`)
  if (today) parts.push(`${today} in scadenza oggi`)
  const body = parts.length ? `${parts.join(' e ')}.` : 'Nessun task scaduto o in scadenza oggi.'
  const first = summary.suggestion?.first
  return {
    title: parts.length ? 'Il punto di oggi' : 'Tutto in ordine',
    body: first && parts.length ? `${body}\nInizia da: ${first.task.title}` : body
  }
}

export function trayTooltip(summary: Summary): string {
  const { overdue, today } = summary.counts
  if (!overdue && !today) return 'Plainlist'
  const parts = [overdue && `${overdue} scadut${overdue === 1 ? 'o' : 'i'}`, today && `${today} oggi`].filter(Boolean)
  return `Plainlist · ${parts.join(', ')}`
}
