import { t } from '@core/i18n'
import type { PersonOverview } from '@core/person'
import { personToText } from '@core/text'
import { Copy, Hourglass } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Checkbox, TaskRow } from '../components/TaskRow'
import { api, errorMessage } from '../lib/ui'
import { copyText, taskActions, useStore } from '../store'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function PersonView({ name }: { name: string }) {
  const toast = useStore((s) => s.toast)
  const [data, setData] = useState<PersonOverview | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await api.invoke('person:get', { name }))
    } catch (err) {
      toast({ kind: 'error', message: errorMessage(err) })
    }
  }, [name, toast])

  useEffect(() => {
    setData(null)
    void load()
    return window.api.on('tasks:changed', () => void load())
  }, [load])

  if (!data) return null
  const empty = data.counts.open === 0 && data.recentDone.length === 0
  const m = t().person
  const reopen = t().common.reopen

  return (
    <div className="max-w-4xl space-y-5 px-6 py-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
          {initials(name)}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{name}</h1>
          <p className="text-sm text-muted">
            {m.counts(data.counts.open, data.counts.waiting)}
            {data.counts.overdue > 0 && <span className="text-danger">{m.overdue(data.counts.overdue)}</span>}
          </p>
        </div>
        <button
          className="btn"
          onClick={() => void copyText(personToText(data), m.copied(name))}
          title={m.copyHint}
        >
          <Copy size={14} /> {m.copy}
        </button>
      </div>

      {empty && <p className="text-muted">{m.empty(name, name.replace(/ /g, '_'))}</p>}

      {data.waiting.length > 0 && (
        <section className="rounded-lg border border-warning/30 bg-warning-soft/40 p-3">
          <h2 className="mb-1 flex items-center gap-1.5 px-2 text-xs font-semibold tracking-wide text-warning uppercase">
            <Hourglass size={13} /> {m.waitingOn(name)}
            <span className="font-normal text-subtle">{data.waiting.length}</span>
          </h2>
          <div className="space-y-px">
            {data.waiting.map((t) => (
              <TaskRow key={t.id} task={t} today={data.today} />
            ))}
          </div>
        </section>
      )}

      {data.open.map((group) => (
        <section key={group.id}>
          <h2 className="mb-1 px-2 text-xs font-semibold tracking-wide text-muted uppercase">
            {group.label} <span className="font-normal text-subtle">{group.tasks.length}</span>
          </h2>
          <div className="space-y-px">
            {group.tasks.map((t) => (
              <TaskRow key={t.id} task={t} today={data.today} />
            ))}
          </div>
        </section>
      ))}

      {data.recentDone.length > 0 && (
        <section>
          <h2 className="mb-1 px-2 text-xs font-semibold tracking-wide text-success uppercase">
            {m.recentlyDone} <span className="font-normal text-subtle">{data.recentDone.length}</span>
          </h2>
          {data.recentDone.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-md px-3 py-1.5">
              <Checkbox checked onChange={() => void taskActions.complete(t.id, false)} label={reopen} />
              <span className="truncate text-subtle">{t.title}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
