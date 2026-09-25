import { useDroppable } from '@dnd-kit/core'
import type { ViewId } from '@shared/ipc'
import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  EyeOff,
  FilterX,
  History,
  Hourglass,
  Inbox,
  Layers,
  Search,
  Settings as SettingsIcon,
  Sun,
  Sunrise,
  User,
  X,
  Zap,
  type LucideIcon
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { PRIORITIES, cn } from '../lib/ui'
import { useStore } from '../store'

const VIEWS: Array<{ id: ViewId; label: string; icon: LucideIcon; drop?: 'today' | 'tomorrow' }> = [
  { id: 'all', label: 'Tutti', icon: Layers },
  { id: 'today', label: 'Oggi', icon: CalendarCheck, drop: 'today' },
  { id: 'tomorrow', label: 'Domani', icon: Sunrise, drop: 'tomorrow' },
  { id: 'upcoming', label: 'Prossimi 7 giorni', icon: CalendarRange },
  { id: 'noDue', label: 'Senza scadenza', icon: Inbox },
  { id: 'waiting', label: 'In attesa', icon: Hourglass },
  { id: 'scheduled', label: 'Programmati', icon: EyeOff }
]

function NavItem({
  active,
  icon: Icon,
  label,
  count,
  onClick,
  dropId,
  hint,
  tour
}: {
  active: boolean
  icon: LucideIcon
  label: string
  count?: number
  onClick(): void
  dropId?: string
  hint?: string
  tour?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId ?? `nav-${label}`, disabled: !dropId })
  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      title={hint}
      data-tour={tour}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm',
        active ? 'bg-accent-soft font-medium text-accent' : 'text-fg hover:bg-surface-2',
        isOver && 'ring-2 ring-accent'
      )}
    >
      <Icon size={16} className={active ? 'text-accent' : 'text-muted'} />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && <span className="text-xs text-subtle">{count}</span>}
    </button>
  )
}

export function Sidebar() {
  const { facets, mainView, view, filter, person, setView, setMainView, openPerson, setFilter, clearFilters } = useStore()
  const [search, setSearch] = useState(filter.search ?? '')

  useEffect(() => {
    const handle = setTimeout(() => {
      if ((filter.search ?? '') !== search) setFilter({ search: search || undefined })
    }, 150)
    return () => clearTimeout(handle)
  }, [search, filter.search, setFilter])

  useEffect(() => {
    if (!filter.search) setSearch('')
  }, [filter.search])

  const counts = facets?.counts
  const hasFilters = filter.areaId !== undefined || filter.priority !== undefined || !!filter.person || !!filter.search
  const people = facets?.people.filter((p) => p.openCount > 0 || (mainView === 'person' && p.name === person)) ?? []

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="p-3 pb-1">
        <div className="flex h-8 items-center gap-2 rounded-md border border-line bg-bg px-2 focus-within:border-accent">
          <Search size={14} className="text-subtle" />
          <input
            id="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearch('')
                e.currentTarget.blur()
              }
            }}
            placeholder="Cerca  (Ctrl+F)"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
          />
          {search && (
            <button className="text-subtle hover:text-fg" onClick={() => setSearch('')} title="Cancella ricerca">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        <div className="space-y-0.5 pt-2">
          <NavItem
            active={mainView === 'myDay'}
            icon={Sun}
            label="Il mio giorno"
            count={counts?.myDay}
            onClick={() => setMainView('myDay')}
            dropId="drop-myday"
            hint="Pianifica la giornata. Trascina qui un task per aggiungerlo"
            tour="nav-myday"
          />
          <div data-tour="nav-views" className="space-y-0.5">
          {VIEWS.map((v) => (
            <NavItem
              key={v.id}
              active={mainView === 'list' && view === v.id}
              icon={v.icon}
              label={v.label}
              count={counts?.[v.id]}
              onClick={() => setView(v.id)}
              dropId={v.drop ? `drop-${v.drop}` : undefined}
              hint={v.drop ? `Trascina qui un task per spostarlo a ${v.label.toLowerCase()}` : undefined}
            />
          ))}
          </div>
          <NavItem
            active={mainView === 'update'}
            icon={Zap}
            label="Update"
            onClick={() => setMainView('update')}
            hint="Riepilogo (Ctrl+U)"
            tour="nav-update"
          />
          <NavItem active={mainView === 'history'} icon={History} label="Completati" onClick={() => setMainView('history')} />
        </div>

        <div className="section-label" data-tour="nav-areas">Aree</div>
        <div className="space-y-0.5">
          {facets?.areas.map((a) => (
            <button
              key={a.id}
              onClick={() => setFilter({ areaId: filter.areaId === a.id ? undefined : a.id })}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm',
                filter.areaId === a.id ? 'bg-surface-3 font-medium' : 'hover:bg-surface-2'
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color ?? 'var(--fg-subtle)' }} />
              <span className="flex-1 truncate">{a.name}</span>
              {a.openCount > 0 && <span className="text-xs text-subtle">{a.openCount}</span>}
            </button>
          ))}
        </div>

        {people.length > 0 && (
          <>
            <div className="section-label" data-tour="nav-people">Persone</div>
            <div className="space-y-0.5">
              {people.map((p) => (
                <button
                  key={p.name}
                  onClick={() => openPerson(p.name)}
                  title={`Tutto ciò che riguarda ${p.name}`}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm',
                    mainView === 'person' && person === p.name ? 'bg-accent-soft font-medium text-accent' : 'hover:bg-surface-2'
                  )}
                >
                  <User size={14} className="text-muted" />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.openCount > 0 && <span className="text-xs text-subtle">{p.openCount}</span>}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="section-label">Priorità</div>
        <div className="flex gap-1 px-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              onClick={() => setFilter({ priority: filter.priority === p.value ? undefined : p.value })}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                filter.priority === p.value ? 'border-line-strong bg-surface-3 font-medium' : 'border-line hover:bg-surface-2'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', p.bg)} />
              {p.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button className="btn-ghost mx-1 mt-3 text-xs" onClick={clearFilters}>
            <FilterX size={14} /> Rimuovi filtri
          </button>
        )}
      </nav>

      <div className="border-t border-line p-2" data-tour="nav-settings">
        <NavItem
          active={mainView === 'settings'}
          icon={SettingsIcon}
          label="Impostazioni"
          onClick={() => setMainView('settings')}
        />
        <div className="flex items-center gap-1.5 px-3 pt-1 text-[11px] text-subtle">
          <CalendarDays size={11} /> Ctrl+N nuovo · Ctrl+U update
        </div>
      </div>
    </aside>
  )
}
