import { t } from './i18n'
import type { PersonOverview } from './person'
import { formatEstimate } from './parser'
import { describeRecurrence } from './recurrence'
import type { Summary } from './summary'
import { formatDateLong, formatDue, type DateKey } from './time'
import type { Task } from './types'

export interface LineOptions {
  due?: boolean
  people?: boolean
  area?: boolean
}

/** "• Titolo — ven 25 set 12:00 · @Marco · #lavoro · ~30m · priorità alta". */
export function taskLine(task: Task, today: DateKey, options: LineOptions = {}): string {
  const { due = true, people = true, area = true } = options
  const details = [
    due && task.dueDate ? formatDue(task.dueDate, task.dueTime, today) : null,
    people && task.people.length ? task.people.map((p) => `@${p}`).join(', ') : null,
    area && task.areaName ? `#${task.areaName}` : null,
    task.estimateMin ? `~${formatEstimate(task.estimateMin)}` : null,
    task.recurrence ? describeRecurrence(task.recurrence) : null,
    task.priority === 3 ? t().text.highPriority : null
  ].filter(Boolean)
  return details.length ? `• ${task.title} — ${details.join(' · ')}` : `• ${task.title}`
}

function section(title: string, lines: string[]): string[] {
  return lines.length ? ['', title.toUpperCase(), ...lines] : []
}

export function summaryToText(summary: Summary, filters: string[] = []): string {
  const m = t().text
  const { today } = summary
  const out = [`Update · ${formatDateLong(today)}`]
  if (filters.length) out.push(m.filters(filters.join(' · ')))

  if (summary.counts.open === 0 && summary.waiting.length === 0) {
    out.push('', m.noOpenTasks)
    return out.join('\n')
  }

  out.push(
    ...section(
      m.overdue(summary.overdue.length),
      summary.overdue.map((task) => taskLine(task, today))
    ),
    ...section(
      m.today(summary.dueToday.length),
      summary.dueToday.map((task) => taskLine(task, today))
    )
  )
  if (summary.upcoming.length) {
    out.push('', m.upcoming.toUpperCase())
    for (const day of summary.upcoming) {
      out.push(day.label, ...day.tasks.map((task) => taskLine(task, today)))
    }
  }
  out.push(
    ...section(m.noDue, summary.noDue.map((task) => taskLine(task, today))),
    ...section(m.waiting, summary.waiting.map((task) => taskLine(task, today))),
    ...section(m.stale, summary.stale.map((task) => taskLine(task, today)))
  )
  if (summary.suggestion) {
    const { first, next } = summary.suggestion
    out.push('', m.startWith(first.task.title, first.reason))
    if (next.length) out.push(m.then(next.map((n) => n.task.title).join(', ')))
  }
  return out.join('\n')
}

export function personToText(p: PersonOverview): string {
  const m = t().text
  const { today } = p
  const line = (task: Task): string => taskLine(task, today, { people: false })
  const out = [m.oneOnOne(p.name, formatDateLong(today))]
  out.push(...section(m.waitingOn(p.name), p.waiting.map(line)))
  for (const group of p.open) {
    if (group.id === 'completed') continue
    out.push(...section(group.label, group.tasks.map(line)))
  }
  out.push(...section(m.recentlyDone, p.recentDone.map((task) => `✓ ${task.title}`)))
  if (out.length === 1) out.push('', m.nothingWith(p.name))
  return out.join('\n')
}
