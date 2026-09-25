import { t } from '@core/i18n'
import type { MyDay } from '@core/myDay'
import { formatEstimate } from '@core/parser'
import { formatDateLong } from '@core/time'
import type { Task } from '@shared/types'
import { AlertTriangle, CalendarCheck, Flag, Plus, Sparkles, Sun, Sunrise } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Checkbox, TaskRow } from '../components/TaskRow'
import { DUE_TONE_CLASS, api, cn, dueInfo, errorMessage, priorityMeta } from '../lib/ui'
import { taskActions, useStore } from '../store'

function LoadBar({ estimate }: { estimate: MyDay['estimate'] }) {
  const { plannedMin, doneMin, capacityMin, unestimated } = estimate
  const total = plannedMin + doneMin
  const over = total - capacityMin
  const m = t().myDay
  const pct = (n: number): string => `${Math.min(100, (n / Math.max(capacityMin, 1)) * 100)}%`
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="mb-2 flex items-baseline gap-2 text-sm">
        <span className="font-medium">
          {total ? m.estimated(formatEstimate(total)) : m.noEstimate}
        </span>
        <span className="text-muted">{m.available(formatEstimate(capacityMin))}</span>
        {doneMin > 0 && <span className="text-success">{m.alreadyDone(formatEstimate(doneMin))}</span>}
        {over > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-warning">
            <AlertTriangle size={14} /> {m.over(formatEstimate(over))}
          </span>
        )}
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-surface-3">
        <div className="absolute inset-y-0 left-0 bg-success" style={{ width: pct(doneMin) }} />
        <div
          className={cn('absolute inset-y-0', over > 0 ? 'bg-warning' : 'bg-accent')}
          style={{ left: pct(doneMin), width: pct(plannedMin) }}
        />
      </div>
      {unestimated > 0 && (
        <p className="mt-2 text-xs text-subtle">
          {m.unestimated(unestimated)}
        </p>
      )}
    </div>
  )
}

function SuggestionRow({ task, today }: { task: Task; today: string }) {
  const select = useStore((s) => s.select)
  const due = dueInfo(task, today)
  const prio = priorityMeta(task.priority)
  return (
    <div
      onClick={() => select(task.id, true)}
      className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-2"
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', prio.bg)} />
      <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
      {task.estimateMin && <span className="text-xs text-subtle">~{formatEstimate(task.estimateMin)}</span>}
      {due && <span className={cn('text-xs', DUE_TONE_CLASS[due.tone])}>{due.text}</span>}
      <button
        className="icon-btn text-accent"
        title={t().common.addToMyDay}
        onClick={(e) => {
          e.stopPropagation()
          void taskActions.setMyDay(task.id, true)
        }}
      >
        <Plus size={16} />
      </button>
    </div>
  )
}

function SuggestionGroup({
  icon: Icon,
  title,
  tasks,
  today,
  tone,
  addAll
}: {
  icon: typeof Sun
  title: string
  tasks: Task[]
  today: string
  tone?: string
  addAll?: boolean
}): ReactNode {
  if (!tasks.length) return null
  return (
    <div>
      <div className={cn('mb-0.5 flex items-center gap-1.5 px-2 text-xs font-semibold tracking-wide uppercase', tone ?? 'text-muted')}>
        <Icon size={13} /> {title}
        <span className="font-normal text-subtle">{tasks.length}</span>
        {addAll && tasks.length > 1 && (
          <button
            className="ml-auto rounded px-1.5 py-0.5 text-[11px] font-medium tracking-normal text-accent normal-case hover:bg-accent-soft"
            onClick={() => tasks.forEach((t) => void taskActions.setMyDay(t.id, true))}
          >
            {t().myDay.addAll}
          </button>
        )}
      </div>
      {tasks.map((t) => (
        <SuggestionRow key={t.id} task={t} today={today} />
      ))}
    </div>
  )
}

export function MyDayView() {
  const toast = useStore((s) => s.toast)
  const [day, setDay] = useState<MyDay | null>(null)

  const load = useCallback(async () => {
    try {
      setDay(await api.invoke('myDay:get'))
    } catch (err) {
      toast({ kind: 'error', message: errorMessage(err) })
    }
  }, [toast])

  useEffect(() => {
    void load()
    const offs = [window.api.on('tasks:changed', () => void load()), window.api.on('clock:dayChanged', () => void load())]
    return () => offs.forEach((off) => off())
  }, [load])

  if (!day) return null
  const { today, suggestions } = day
  const m = t().myDay
  const reopen = t().common.reopen
  const hasSuggestions = Object.values(suggestions).some((list) => list.length > 0)

  return (
    <div className="max-w-5xl px-6 py-5">
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Sun size={20} className="text-warning" /> {m.title}
        </h1>
        <span className="text-sm text-muted">{formatDateLong(today)}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <LoadBar estimate={day.estimate} />

          <section>
            {day.planned.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
                {m.emptyTitle}
                <br />
                {m.emptyBefore} <Sun size={13} className="inline" /> {m.emptyAfter}
              </div>
            ) : (
              <div className="space-y-px">
                {day.planned.map((t) => (
                  <TaskRow key={t.id} task={t} today={today} />
                ))}
              </div>
            )}
          </section>

          {day.done.length > 0 && (
            <section>
              <h2 className="mb-1 px-2 text-xs font-semibold tracking-wide text-success uppercase">
                {m.doneToday} <span className="font-normal text-subtle">{day.done.length}</span>
              </h2>
              {day.done.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-md px-3 py-1.5">
                  <Checkbox checked onChange={() => void taskActions.complete(t.id, false)} label={reopen} />
                  <span className="truncate text-subtle line-through">{t.title}</span>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="h-fit space-y-3 rounded-lg border border-line bg-surface p-3">
          <h2 className="flex items-center gap-2 px-2 text-sm font-semibold">
            <Sparkles size={15} className="text-accent" /> {m.suggestions}
          </h2>
          {hasSuggestions ? (
            <>
              <SuggestionGroup icon={AlertTriangle} title={m.overdue} tasks={suggestions.overdue} today={today} tone="text-danger" addAll />
              <SuggestionGroup icon={CalendarCheck} title={m.dueToday} tasks={suggestions.today} today={today} tone="text-accent" addAll />
              <SuggestionGroup icon={Sunrise} title={m.tomorrow} tasks={suggestions.tomorrow} today={today} />
              <SuggestionGroup icon={Flag} title={m.highPriority} tasks={suggestions.important} today={today} />
            </>
          ) : (
            <p className="px-2 text-sm text-subtle">{m.nothingUrgent}</p>
          )}
        </aside>
      </div>
    </div>
  )
}
