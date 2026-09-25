import { useDroppable } from '@dnd-kit/core'
import type { TaskGroup } from '@core/grouping'
import { t } from '@core/i18n'
import { formatDateLong } from '@core/time'
import type { ViewId } from '@shared/ipc'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { TaskRow } from '../components/TaskRow'
import { PRIORITIES, cn } from '../lib/ui'
import { useStore } from '../store'

function hint(view: ViewId): string | undefined {
  const m = t().list
  return view === 'waiting' ? m.waitingHint : view === 'scheduled' ? m.scheduledHint : undefined
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
  const m = t().list
  const visible = groups.filter((g) => g.tasks.length > 0)
  const areaName = facets?.areas.find((a) => a.id === filter.areaId)?.name
  const chips: Array<{ label: string; clear(): void }> = [
    ...(areaName ? [{ label: `#${areaName}`, clear: () => setFilter({ areaId: undefined }) }] : []),
    ...(filter.person ? [{ label: `@${filter.person}`, clear: () => setFilter({ person: undefined }) }] : []),
    ...(filter.priority
      ? [
          {
            label: t().priority.filter(PRIORITIES.find((p) => p.value === filter.priority)!.label.toLowerCase()),
            clear: () => setFilter({ priority: undefined })
          }
        ]
      : []),
    ...(filter.search ? [{ label: `"${filter.search}"`, clear: () => setFilter({ search: undefined }) }] : [])
  ]

  return (
    <div className="flex max-w-5xl flex-col px-6 py-5">
      <div className="mb-3 flex items-center gap-3">
        <h1 className="text-xl font-semibold">{m.titles[view]}</h1>
        {today && view === 'today' && <span className="text-sm text-muted">{formatDateLong(today)}</span>}
        <div className="flex flex-1 flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c.label} className="chip">
              {c.label}
              <button onClick={c.clear} className="hover:text-fg" title={m.removeFilter}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <button className="btn" onClick={() => setNewTaskOpen(true)} title={m.newTaskHint}>
          <Plus size={15} /> {m.newTask}
        </button>
      </div>

      {hint(view) && <p className="-mt-1 mb-3 text-sm text-muted">{hint(view)}</p>}

      {visible.length === 0 ? (
        <div className="mt-16 text-center text-muted">
          <p className="text-base">{m.empty}</p>
          <p className="mt-1 text-sm text-subtle">
            {chips.length ? m.emptyFiltered : m.emptyHint}
          </p>
        </div>
      ) : (
        <div role="listbox" aria-label={m.listLabel} className="space-y-2">
          {visible.map((g) => (
            <GroupSection key={g.id} group={g} today={today} />
          ))}
        </div>
      )}
    </div>
  )
}
