import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { t } from '@core/i18n'
import { useEffect, useRef, useState } from 'react'
import { DetailPanel } from './components/DetailPanel'
import { NewTaskDialog } from './components/NewTaskDialog'
import { QuickInput, type QuickInputHandle } from './components/QuickInput'
import { Sidebar } from './components/Sidebar'
import { Toasts } from './components/Toasts'
import { Tour } from './components/Tour'
import { isEditableTarget } from './lib/ui'
import { taskActions, useStore } from './store'
import { HistoryView } from './views/HistoryView'
import { MyDayView } from './views/MyDayView'
import { PersonView } from './views/PersonView'
import { SettingsView } from './views/SettingsView'
import { TaskListView } from './views/TaskListView'
import { UpdateView } from './views/UpdateView'

const DROP_TARGETS: Record<string, 'today' | 'tomorrow'> = {
  'drop-today': 'today',
  'drop-tomorrow': 'tomorrow',
  'drop-group-today': 'today'
}

function findTask(id: number) {
  return useStore
    .getState()
    .groups.flatMap((g) => g.tasks)
    .find((t) => t.id === id)
}

function useKeyboardShortcuts(focusQuick: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const s = useStore.getState()
      const key = e.key.toLowerCase()
      const modal = document.querySelector('[data-modal]') !== null

      if (e.ctrlKey && !e.altKey) {
        if (key === 'n' && e.shiftKey) {
          e.preventDefault()
          s.setNewTaskOpen(true)
          return
        }
        if (key === 'n' && !modal) {
          e.preventDefault()
          focusQuick()
          return
        }
        if (key === 'f' && !modal) {
          e.preventDefault()
          if (s.mainView !== 'list' && s.mainView !== 'history') s.setMainView('list')
          setTimeout(() => {
            const el = document.getElementById(s.mainView === 'history' ? 'history-search' : 'search-input')
            ;(el as HTMLInputElement | null)?.focus()
          })
          return
        }
        if (key === 'u' && !modal) {
          e.preventDefault()
          s.setMainView('update')
          return
        }
      }

      if (modal || e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key === 'Escape' && !isEditableTarget(e.target)) {
        if (s.detailOpen) s.closeDetail()
        else if (s.selectedId !== null) s.select(null, false)
        return
      }
      if (isEditableTarget(e.target) || s.mainView !== 'list') return

      const ids = s.visibleTaskIds()
      const index = s.selectedId === null ? -1 : ids.indexOf(s.selectedId)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (ids.length === 0) return
        const next = e.key === 'ArrowDown' ? Math.min(ids.length - 1, index + 1) : Math.max(0, index === -1 ? 0 : index - 1)
        s.select(ids[next])
        return
      }
      const task = s.selectedId !== null ? findTask(s.selectedId) : undefined
      if (!task) return
      if (e.key === 'Enter') {
        e.preventDefault()
        s.select(task.id, true)
      } else if (e.key === ' ') {
        e.preventDefault()
        const nextId = ids[index + 1] ?? ids[index - 1] ?? null
        void taskActions.complete(task.id, task.status !== 'done')
        if (task.status !== 'done' && nextId !== null) s.select(nextId)
      } else if (e.key === 'Delete') {
        e.preventDefault()
        const nextId = ids[index + 1] ?? ids[index - 1] ?? null
        void taskActions.remove(task).then(() => nextId !== null && useStore.getState().select(nextId))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusQuick])
}

export function App() {
  const { ready, facets, settings, mainView, person, selectedId, detailOpen, newTaskOpen } = useStore()
  const quickRef = useRef<QuickInputHandle>(null)
  const [dragTitle, setDragTitle] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const focusQuick = useRef(() => quickRef.current?.focus()).current
  useKeyboardShortcuts(focusQuick)

  useEffect(() => {
    const s = useStore.getState()
    void s.init()
    let pending = false
    const offs = [
      window.api.on('tasks:changed', () => {
        if (pending) return
        pending = true
        queueMicrotask(() => {
          pending = false
          void useStore.getState().refresh()
        })
      }),
      window.api.on('settings:changed', (next) => useStore.getState().setSettings(next)),
      window.api.on('clock:dayChanged', ({ today }) => useStore.getState().setToday(today)),
      window.api.on('nav:openTask', ({ id }) => {
        const st = useStore.getState()
        st.setView('all')
        st.select(id, true)
      }),
      window.api.on('nav:show', ({ view }) => {
        const st = useStore.getState()
        if (view === 'newTask') st.setNewTaskOpen(true)
        else st.setMainView(view)
      })
    ]
    return () => offs.forEach((off) => off())
  }, [])

  function onDragStart(e: DragStartEvent): void {
    setDragTitle((e.active.data.current?.title as string | undefined) ?? null)
  }

  function onDragEnd(e: DragEndEvent): void {
    setDragTitle(null)
    const taskId = e.active.data.current?.taskId as number | undefined
    if (taskId === undefined || !e.over) return
    if (e.over.id === 'drop-myday') {
      void taskActions.setMyDay(taskId, true)
      return
    }
    const target = DROP_TARGETS[String(e.over.id)]
    if (target) void taskActions.reschedule(taskId, target)
  }

  if (!ready) return <div className="h-full bg-bg" />

  const defaultAreaName = facets?.areas.find((a) => a.id === settings?.defaultAreaId)?.name ?? null

  // Con la chiave sulla lingua, un cambio di lingua rimonta l'interfaccia con i testi nuovi.
  return (
    <div key={settings?.language} className="flex h-full flex-col">
      <header className="border-b border-line bg-surface px-4 py-3" data-tour="quick">
        <QuickInput
          ref={quickRef}
          knownAreas={facets?.areas.map((a) => a.name) ?? []}
          knownPeople={facets?.people.map((p) => p.name) ?? []}
          defaultAreaName={defaultAreaName}
          onAdded={(task) =>
            useStore.getState().toast({ kind: 'info', message: t().app.added(task.title), timeoutMs: 2500 })
          }
        />
      </header>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragTitle(null)}>
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-y-auto" data-tour="main">
            {mainView === 'list' && <TaskListView />}
            {mainView === 'myDay' && <MyDayView />}
            {mainView === 'person' && person && <PersonView name={person} />}
            {mainView === 'update' && <UpdateView />}
            {mainView === 'history' && <HistoryView />}
            {mainView === 'settings' && <SettingsView />}
          </main>
          {detailOpen && selectedId !== null && <DetailPanel key={selectedId} id={selectedId} />}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragTitle && (
            <div className="max-w-sm truncate rounded-md border border-accent bg-surface px-3 py-2 text-sm shadow-pop">
              {dragTitle}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      {newTaskOpen && <NewTaskDialog />}
      <Tour />
      <Toasts />
    </div>
  )
}
