import { useDroppable } from '@dnd-kit/core'
import type { TaskGroup } from '@core/grouping'
import { formatDateLong } from '@core/time'
import type { ViewId } from '@shared/ipc'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { TaskRow } from '../components/TaskRow'
import { PRIORITIES, cn } from '../lib/ui'
import { useStore } from '../store'

const TITLES: Record<ViewId, string> = {
  all: 'Tutti i task',
  today: 'Oggi',
  tomorrow: 'Domani',
  upcoming: 'Prossimi 7 giorni',
  noDue: 'Senza scadenza',
  waiting: 'In attesa di altri',
  scheduled: 'Programmati'
}

const HINTS: Partial<Record<ViewId, string>> = {
  waiting: 'Task delegati o in attesa di qualcun altro (+attesa). Non compaiono nei suggerimenti su cosa fare.',
  scheduled: 'Task nascosti fino a una data ("da lunedì", "dal 15/10"). Ricompaiono da soli quel giorno.'
}

function GroupSection({ group, today }: { group: TaskGroup; today: string }) {
  const collapsed = useStore((s) => !!s.collapsed[group.id])
  const toggle = useStore((s) => s.toggleCollapsed)
  const { setNodeRef, isOver } = useDroppable({ id: `drop-group-${group.id}`, disabled: group.id !== 'today' })

  return (
    <section ref={setNodeRef} className={cn('rounded-lg', isOver && 'ring-2 ring-accent')}>
      <button
        onClick={() => toggle(group.id)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs font-semibold tracking-wide text-muted uppercase hover:text-fg"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <span className={cn(group.id === 'overdue' && 'text-danger', group.id === 'today' && 'text-accent')}>
          {group.label}
        </span>
        <span className="font-normal text-subtle">{group.tasks.length}</span>
      </button>
      {!collapsed && (
        <div className="space-y-px pb-2">
          {group.tasks.map((t) => (
            <TaskRow key={t.id} task={t} today={today} />
          ))}
        </div>
      )}
    </section>
  )
}

export function TaskListView() {
  const { groups, today, view, filter, facets, setFilter, setNewTaskOpen } = useStore()
  const visible = groups.filter((g) => g.tasks.length > 0)
  const areaName = facets?.areas.find((a) => a.id === filter.areaId)?.name
  const chips: Array<{ label: string; clear(): void }> = [
    ...(areaName ? [{ label: `#${areaName}`, clear: () => setFilter({ areaId: undefined }) }] : []),
    ...(filter.person ? [{ label: `@${filter.person}`, clear: () => setFilter({ person: undefined }) }] : []),
    ...(filter.priority
      ? [
          {
            label: `Priorità ${PRIORITIES.find((p) => p.value === filter.priority)!.label.toLowerCase()}`,
            clear: () => setFilter({ priority: undefined })
          }
        ]
      : []),
    ...(filter.search ? [{ label: `"${filter.search}"`, clear: () => setFilter({ search: undefined }) }] : [])
  ]

  return (
    <div className="flex max-w-5xl flex-col px-6 py-5">
      <div className="mb-3 flex items-center gap-3">
        <h1 className="text-xl font-semibold">{TITLES[view]}</h1>
        {today && view === 'today' && <span className="text-sm text-muted">{formatDateLong(today)}</span>}
        <div className="flex flex-1 flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c.label} className="chip">
              {c.label}
              <button onClick={c.clear} className="hover:text-fg" title="Rimuovi filtro">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <button className="btn" onClick={() => setNewTaskOpen(true)} title="Nuovo task con tutti i campi (Ctrl+Shift+N)">
          <Plus size={15} /> Nuovo
        </button>
      </div>

      {HINTS[view] && <p className="-mt-1 mb-3 text-sm text-muted">{HINTS[view]}</p>}

      {visible.length === 0 ? (
        <div className="mt-16 text-center text-muted">
          <p className="text-base">Niente da mostrare qui.</p>
          <p className="mt-1 text-sm text-subtle">
            {chips.length ? 'Prova a rimuovere i filtri.' : 'Scrivi un task nel campo in alto e premi Invio.'}
          </p>
        </div>
      ) : (
        <div role="listbox" aria-label="Task" className="space-y-2">
          {visible.map((g) => (
            <GroupSection key={g.id} group={g} today={today} />
          ))}
        </div>
      )}
    </div>
  )
}
