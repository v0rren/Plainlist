import { localeTag, t } from '@core/i18n'
import { formatDateLong, todayKey } from '@core/time'
import type { Task } from '@shared/types'
import { Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Checkbox } from '../components/TaskRow'
import { api, cn, errorMessage } from '../lib/ui'
import { taskActions, useStore } from '../store'

const PAGE = 50

function completedDay(task: Task): string {
  return todayKey(new Date(task.completedAt!))
}

export function HistoryView() {
  const toast = useStore((s) => s.toast)
  const select = useStore((s) => s.select)
  const selectedId = useStore((s) => s.selectedId)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(PAGE)

  const load = useCallback(async () => {
    try {
      const res = await api.invoke('tasks:completed', { search: search || undefined, limit })
      setItems(res.items)
      setTotal(res.total)
    } catch (err) {
      toast({ kind: 'error', message: errorMessage(err) })
    }
  }, [search, limit, toast])

  useEffect(() => {
    const handle = setTimeout(() => void load(), 150)
    const off = window.api.on('tasks:changed', () => void load())
    return () => {
      clearTimeout(handle)
      off()
    }
  }, [load])

  const m = t().history
  const reopen = t().common.reopen
  const today = todayKey()
  const days: Array<[string, Task[]]> = []
  for (const t of items) {
    const day = completedDay(t)
    const last = days.at(-1)
    if (last && last[0] === day) last[1].push(t)
    else days.push([day, [t]])
  }

  return (
    <div className="max-w-4xl px-6 py-5">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold">{m.title}</h1>
        <span className="text-sm text-muted">{total}</span>
        <div className="ml-auto flex h-8 w-64 items-center gap-2 rounded-md border border-line bg-surface px-2 focus-within:border-accent">
          <Search size={14} className="text-subtle" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setLimit(PAGE)
            }}
            id="history-search"
            placeholder={m.search}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
          />
        </div>
      </div>

      {days.length === 0 && <p className="mt-10 text-center text-muted">{search ? m.emptySearch : m.empty}</p>}

      <div className="space-y-4">
        {days.map(([day, tasks]) => (
          <section key={day}>
            <h2 className="mb-1 px-2 text-xs font-semibold tracking-wide text-muted uppercase">
              {day === today ? t().common.today : formatDateLong(day, today)}
            </h2>
            {tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => select(t.id, true)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-1.5',
                  selectedId === t.id ? 'bg-accent-soft' : 'hover:bg-surface-2'
                )}
              >
                <Checkbox checked onChange={() => void taskActions.complete(t.id, false)} label={reopen} />
                <span className="min-w-0 flex-1 truncate text-muted">{t.title}</span>
                {t.areaName && <span className="text-xs text-subtle">#{t.areaName}</span>}
                <span className="text-xs text-subtle">
                  {new Date(t.completedAt!).toLocaleTimeString(localeTag(), { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>

      {items.length < total && (
        <div className="mt-4 text-center">
          <button className="btn" onClick={() => setLimit(limit + PAGE)}>
            {m.showMore}
          </button>
        </div>
      )}
    </div>
  )
}
