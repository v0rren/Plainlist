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
    task.priority === 3 ? 'priorità alta' : null
  ].filter(Boolean)
  return details.length ? `• ${task.title} — ${details.join(' · ')}` : `• ${task.title}`
}

function section(title: string, lines: string[]): string[] {
  return lines.length ? ['', title.toUpperCase(), ...lines] : []
}

export function summaryToText(summary: Summary, filters: string[] = []): string {
  const { today } = summary
  const out = [`Update · ${formatDateLong(today)}`]
  if (filters.length) out.push(`Filtri: ${filters.join(' · ')}`)

  if (summary.counts.open === 0 && summary.waiting.length === 0) {
    out.push('', 'Nessun task aperto.')
    return out.join('\n')
  }

  out.push(
    ...section(
      `Scaduti (${summary.overdue.length})`,
      summary.overdue.map((t) => taskLine(t, today))
    ),
    ...section(
      `Oggi (${summary.dueToday.length})`,
      summary.dueToday.map((t) => taskLine(t, today))
    )
  )
  if (summary.upcoming.length) {
    out.push('', 'PROSSIMI 7 GIORNI')
    for (const day of summary.upcoming) {
      out.push(day.label, ...day.tasks.map((t) => taskLine(t, today)))
    }
  }
  out.push(
    ...section('Senza scadenza', summary.noDue.map((t) => taskLine(t, today))),
    ...section('In attesa', summary.waiting.map((t) => taskLine(t, today))),
    ...section('Fermi', summary.stale.map((t) => taskLine(t, today)))
  )
  if (summary.suggestion) {
    const { first, next } = summary.suggestion
    out.push('', `Da dove iniziare: ${first.task.title} (${first.reason}).`)
    if (next.length) out.push(`Poi: ${next.map((n) => n.task.title).join(', ')}.`)
  }
  return out.join('\n')
}

export function personToText(p: PersonOverview): string {
  const { today } = p
  const line = (t: Task): string => taskLine(t, today, { people: false })
  const out = [`1:1 con ${p.name} · ${formatDateLong(today)}`]
  out.push(...section(`In attesa da ${p.name}`, p.waiting.map(line)))
  for (const group of p.open) {
    if (group.id === 'completed') continue
    out.push(...section(group.label, group.tasks.map(line)))
  }
  out.push(...section('Completati di recente', p.recentDone.map((t) => `✓ ${t.title}`)))
  if (out.length === 1) out.push('', `Niente di aperto con ${p.name}.`)
  return out.join('\n')
}
