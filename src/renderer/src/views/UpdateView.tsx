import { t } from '@core/i18n'
import { formatEstimate } from '@core/parser'
import type { Summary } from '@core/summary'
import { summaryToText } from '@core/text'
import { formatDateLong } from '@core/time'
import type { Task } from '@shared/types'
import {
  AlertTriangle,
  CalendarCheck,
  CalendarRange,
  Copy,
  Hourglass,
  Inbox,
  Lightbulb,
  Timer,
  type LucideIcon
} from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Checkbox } from '../components/TaskRow'
import { DUE_TONE_CLASS, api, cn, dueInfo, errorMessage, priorityMeta } from '../lib/ui'
import { copyText, taskActions, useStore } from '../store'

function Line({ task, today, extra }: { task: Task; today: string; extra?: ReactNode }) {
  const select = useStore((s) => s.select)
  const selected = useStore((s) => s.selectedId === task.id)
  const due = dueInfo(task, today)
  const prio = priorityMeta(task.priority)
  return (
    <div
      onClick={() => select(task.id, true)}
      className={cn('flex items-center gap-3 rounded-md px-2 py-1.5', selected ? 'bg-accent-soft' : 'hover:bg-surface-2')}
    >
      <Checkbox checked={false} onChange={() => void taskActions.complete(task.id, true)} label={t().common.complete} />
      <span className={cn('h-2 w-2 shrink-0 rounded-full', prio.bg)} title={t().priority.filter(prio.label.toLowerCase())} />
      <span className="min-w-0 flex-1 truncate">{task.title}</span>
      {task.people.length > 0 && <span className="text-xs text-muted">@{task.people.join(', @')}</span>}
      {task.areaName && <span className="text-xs text-subtle">#{task.areaName}</span>}
      {extra ?? (due && <span className={cn('w-28 text-right text-xs', DUE_TONE_CLASS[due.tone])}>{due.text}</span>)}
    </div>
  )
}

function Section({ icon: Icon, title, tone, children }: { icon: LucideIcon; title: string; tone?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className={cn('mb-2 flex items-center gap-2 text-sm font-semibold', tone)}>
        <Icon size={16} /> {title}
      </h2>
      {children}
    </section>
  )
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
}

export function UpdateView() {
  const facets = useStore((s) => s.facets)
  const staleDays = useStore((s) => s.settings?.staleDays ?? 14)
  const toast = useStore((s) => s.toast)
  const [areaId, setAreaId] = useState<number | undefined>()
  const [person, setPerson] = useState<string | undefined>()
  const [summary, setSummary] = useState<Summary | null>(null)

  const load = useCallback(async () => {
    try {
      setSummary(await api.invoke('summary:get', { areaId, person }))
    } catch (err) {
      toast({ kind: 'error', message: errorMessage(err) })
    }
  }, [areaId, person, toast])

  useEffect(() => {
    void load()
    const off1 = window.api.on('tasks:changed', () => void load())
    const off2 = window.api.on('clock:dayChanged', () => void load())
    return () => {
      off1()
      off2()
    }
  }, [load])

  if (!summary) return null
  const { today, counts } = summary
  const empty = counts.open === 0
  const areaName = facets?.areas.find((a) => a.id === areaId)?.name
  const filters = [areaName && `#${areaName}`, person && `@${person}`].filter(Boolean) as string[]
  const m = t().update
  const est = summary.todayEstimate.minutes ? m.estimated(formatEstimate(summary.todayEstimate.minutes)) : ''

  return (
    <div className="max-w-4xl space-y-4 px-6 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">
          Update <span className="font-normal text-muted">· {formatDateLong(today)}</span>
        </h1>
        <div className="ml-auto flex gap-2">
          <select
            value={areaId ?? ''}
            onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : undefined)}
            className="field w-auto py-1 text-sm"
          >
            <option value="">{m.allAreas}</option>
            {facets?.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={person ?? ''}
            onChange={(e) => setPerson(e.target.value || undefined)}
            className="field w-auto py-1 text-sm"
          >
            <option value="">{m.allPeople}</option>
            {facets?.people.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            className="btn py-1"
            onClick={() => void copyText(summaryToText(summary, filters), m.copied)}
            title={m.copyHint}
          >
            <Copy size={14} /> {m.copy}
          </button>
        </div>
      </div>

      <p className="text-sm text-muted">
        {empty
          ? m.empty
          : m.counts(counts)}
      </p>

      {summary.overdue.length > 0 && (
        <Section icon={AlertTriangle} title={m.overdue(summary.overdue.length)} tone="text-danger">
          {summary.overdue.map((t) => (
            <Line key={t.id} task={t} today={today} />
          ))}
        </Section>
      )}

      <Section icon={CalendarCheck} title={`${m.today}${est}`} tone="text-accent">
        {summary.dueToday.length === 0 ? (
          <p className="px-2 text-sm text-subtle">{m.nothingToday}</p>
        ) : (
          summary.dueToday.map((t) => <Line key={t.id} task={t} today={today} />)
        )}
      </Section>

      {summary.upcoming.length > 0 && (
        <Section icon={CalendarRange} title={m.upcoming}>
          <div className="space-y-3">
            {summary.upcoming.map((day) => (
              <div key={day.date}>
                <div className="mb-0.5 px-2 text-xs font-medium text-muted">{day.label}</div>
                {day.tasks.map((t) => (
                  <Line key={t.id} task={t} today={today} extra={<span className="w-28 text-right text-xs text-muted">{t.dueTime ?? ''}</span>} />
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {summary.noDue.length > 0 && (
        <Section icon={Inbox} title={m.noDue}>
          {summary.noDue.map((t) => (
            <Line key={t.id} task={t} today={today} />
          ))}
        </Section>
      )}

      {summary.waiting.length > 0 && (
        <Section icon={Hourglass} title={m.waiting} tone="text-warning">
          {summary.waiting.map((t) => (
            <Line key={t.id} task={t} today={today} />
          ))}
        </Section>
      )}

      {summary.stale.length > 0 && (
        <Section icon={Timer} title={m.stale(staleDays)} tone="text-warning">
          {summary.stale.map((t) => (
            <Line
              key={t.id}
              task={t}
              today={today}
              extra={<span className="w-28 text-right text-xs text-subtle">{m.staleFor(daysSince(t.lastActivityAt))}</span>}
            />
          ))}
        </Section>
      )}

      {summary.suggestion && (
        <section className="rounded-lg border border-accent/30 bg-accent-soft p-4">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-accent">
            <Lightbulb size={16} /> {m.startWith}
          </h2>
          <p>
            <strong>{summary.suggestion.first.task.title}</strong>{' '}
            <span className="text-muted">— {summary.suggestion.first.reason}.</span>
          </p>
          {summary.suggestion.next.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              {m.then(summary.suggestion.next.map((n) => n.task.title).join(', '))}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
