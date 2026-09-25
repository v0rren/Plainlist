import type { GroupId, TaskGroup } from '@core/grouping'
import type { FacetsResponse, ListFilter, ViewId } from '@shared/ipc'
import type { Priority, RescheduleTarget, Settings, Task } from '@shared/types'
import { create } from 'zustand'
import { api, errorMessage } from './lib/ui'

export type MainView = 'list' | 'myDay' | 'update' | 'history' | 'settings' | 'person'

export interface Toast {
  id: number
  kind: 'info' | 'error' | 'undo'
  message: string
  action?: { label: string; run: () => void }
  timeoutMs: number
}

const COLLAPSED_KEY = 'plainlist.collapsed'

function loadCollapsed(): Partial<Record<GroupId, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '') as Partial<Record<GroupId, boolean>>
  } catch {
    return { completed: true }
  }
}

interface State {
  ready: boolean
  version: string
  today: string
  settings: Settings | null
  facets: FacetsResponse | null
  mainView: MainView
  /** Persona mostrata quando mainView è 'person'. */
  person: string | null
  view: ViewId
  filter: ListFilter
  groups: TaskGroup[]
  collapsed: Partial<Record<GroupId, boolean>>
  selectedId: number | null
  detailOpen: boolean
  newTaskOpen: boolean
  /** 'welcome' = finestra iniziale; un numero = passo del tour in corso. */
  tour: 'welcome' | number | null
  toasts: Toast[]

  init(): Promise<void>
  refresh(): Promise<void>
  setMainView(view: MainView): void
  openPerson(name: string): void
  setView(view: ViewId): void
  setFilter(patch: Partial<ListFilter>): void
  clearFilters(): void
  select(id: number | null, open?: boolean): void
  closeDetail(): void
  toggleCollapsed(id: GroupId): void
  setNewTaskOpen(open: boolean): void
  setTour(tour: 'welcome' | number | null): void
  endTour(): void
  setSettings(settings: Settings): void
  setToday(today: string): void
  toast(toast: Omit<Toast, 'id' | 'timeoutMs'> & { timeoutMs?: number }): void
  dismissToast(id: number): void
  visibleTaskIds(): number[]
}

let toastSeq = 1
let refreshSeq = 0

export const useStore = create<State>((set, get) => ({
  ready: false,
  version: '',
  today: '',
  settings: null,
  facets: null,
  mainView: 'list',
  person: null,
  view: 'all',
  filter: {},
  groups: [],
  collapsed: loadCollapsed(),
  selectedId: null,
  detailOpen: false,
  newTaskOpen: false,
  tour: null,
  toasts: [],

  async init() {
    const init = await api.invoke('app:init')
    set({ settings: init.settings, facets: init.facets, today: init.today, version: init.version })
    await get().refresh()
    set({ ready: true, tour: init.settings.tourCompleted ? null : 'welcome' })
  },

  async refresh() {
    const seq = ++refreshSeq
    const { view, filter } = get()
    try {
      const [list, facets] = await Promise.all([
        api.invoke('tasks:list', { view, ...filter }),
        api.invoke('meta:facets')
      ])
      if (seq !== refreshSeq) return
      set({ groups: list.groups, today: list.today, facets })
    } catch (err) {
      get().toast({ kind: 'error', message: errorMessage(err) })
    }
  },

  setMainView(mainView) {
    set({ mainView })
  },

  openPerson(person) {
    set({ mainView: 'person', person })
  },

  setView(view) {
    set({ view, mainView: 'list' })
    void get().refresh()
  },

  setFilter(patch) {
    set({ filter: { ...get().filter, ...patch } })
    void get().refresh()
  },

  clearFilters() {
    set({ filter: {} })
    void get().refresh()
  },

  select(id, open) {
    set({ selectedId: id, detailOpen: open ?? (id !== null && get().detailOpen) })
  },

  closeDetail() {
    set({ detailOpen: false })
  },

  toggleCollapsed(id) {
    const collapsed = { ...get().collapsed, [id]: !get().collapsed[id] }
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed))
    } catch {
      // preferenza locale, non essenziale
    }
    set({ collapsed })
  },

  setNewTaskOpen(newTaskOpen) {
    set({ newTaskOpen })
  },

  setTour(tour) {
    set({ tour })
  },

  endTour() {
    set({ tour: null, mainView: 'list' })
    window.dispatchEvent(new CustomEvent('plainlist:fill-quick', { detail: '' }))
    if (!get().settings?.tourCompleted) {
      void api
        .invoke('settings:set', { tourCompleted: true })
        .then((res) => set({ settings: res.settings }))
        .catch(() => undefined)
    }
  },

  setSettings(settings) {
    set({ settings })
  },

  setToday(today) {
    set({ today })
    void get().refresh()
  },

  toast(toast) {
    const id = toastSeq++
    const timeoutMs = toast.timeoutMs ?? (toast.kind === 'error' ? 6000 : 3500)
    set({ toasts: [...get().toasts.slice(-3), { ...toast, id, timeoutMs }] })
  },

  dismissToast(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },

  visibleTaskIds() {
    const { groups, collapsed } = get()
    return groups.filter((g) => !collapsed[g.id]).flatMap((g) => g.tasks.map((t) => t.id))
  }
}))

async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn()
  } catch (err) {
    useStore.getState().toast({ kind: 'error', message: errorMessage(err) })
    return undefined
  }
}

export const taskActions = {
  complete: (id: number, done: boolean) => run(() => api.invoke('tasks:complete', { id, done })),
  reschedule: (id: number, to: RescheduleTarget) => run(() => api.invoke('tasks:reschedule', { id, to })),
  setPriority: (id: number, priority: Priority) => run(() => api.invoke('tasks:setPriority', { id, priority })),
  setMyDay: (id: number, on: boolean) => run(() => api.invoke('tasks:setMyDay', { id, on })),
  async remove(task: Pick<Task, 'id' | 'title'>) {
    const ok = await run(() => api.invoke('tasks:delete', { id: task.id }).then(() => true))
    if (!ok) return
    const state = useStore.getState()
    if (state.selectedId === task.id) state.select(null, false)
    state.toast({
      kind: 'undo',
      message: `"${task.title}" eliminato`,
      timeoutMs: (state.settings?.undoSeconds ?? 6) * 1000,
      action: { label: 'Annulla', run: () => void run(() => api.invoke('tasks:restore', { id: task.id })) }
    })
  }
}

export async function copyText(text: string, message = 'Copiato negli appunti'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    useStore.getState().toast({ kind: 'info', message, timeoutMs: 2500 })
  } catch (err) {
    useStore.getState().toast({ kind: 'error', message: `Impossibile copiare: ${errorMessage(err)}` })
  }
}
