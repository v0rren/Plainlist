import type { TaskGroup } from '../core/grouping'
import type { MyDay } from '../core/myDay'
import type { PersonOverview } from '../core/person'
import type { Summary } from '../core/summary'
import type {
  Area,
  Priority,
  RescheduleTarget,
  Settings,
  Task,
  TaskDetail,
  TaskInput,
  TaskPatch
} from './types'

export type ViewId = 'all' | 'today' | 'tomorrow' | 'upcoming' | 'noDue' | 'waiting' | 'scheduled'

export interface ListFilter {
  areaId?: number
  priority?: Priority
  person?: string
  search?: string
}

export interface TaskListRequest extends ListFilter {
  view: ViewId
}

export interface TaskListResponse {
  today: string
  groups: TaskGroup[]
}

export interface ViewCounts {
  all: number
  today: number
  tomorrow: number
  upcoming: number
  noDue: number
  waiting: number
  /** Nascosti fino a una data futura. */
  scheduled: number
  myDay: number
}

export interface BackupStatus {
  enabled: boolean
  /** Cartella effettiva (quella scelta o quella predefinita in Documenti). */
  folder: string
  lastAt: string | null
  lastPath: string | null
  lastError: string | null
}

export interface FacetsResponse {
  areas: Array<{ id: number; name: string; color: string | null; openCount: number }>
  people: Array<{ name: string; openCount: number }>
  tags: Array<{ name: string; openCount: number }>
  counts: ViewCounts
}

export interface InitResponse {
  settings: Settings
  facets: FacetsResponse
  today: string
  version: string
}

export interface CompletedRequest {
  search?: string
  areaId?: number
  limit?: number
  offset?: number
}

export interface AreaUpsert {
  id?: number
  name: string
  color?: string | null
  archived?: boolean
}

export type Cancelled = { cancelled: true }

/** Richieste renderer → main: `req` è il payload, `res` il risultato. */
export interface InvokeMap {
  'app:init': { req: void; res: InitResponse }
  'tasks:list': { req: TaskListRequest; res: TaskListResponse }
  'tasks:get': { req: { id: number }; res: TaskDetail | null }
  'tasks:quickAdd': { req: { text: string }; res: Task }
  'tasks:create': { req: TaskInput; res: Task }
  'tasks:update': { req: { id: number; patch: TaskPatch }; res: Task }
  'tasks:complete': { req: { id: number; done: boolean }; res: Task }
  'tasks:reschedule': { req: { id: number; to: RescheduleTarget }; res: Task }
  'tasks:setPriority': { req: { id: number; priority: Priority }; res: Task }
  'tasks:delete': { req: { id: number }; res: void }
  'tasks:restore': { req: { id: number }; res: Task }
  'tasks:setMyDay': { req: { id: number; on: boolean }; res: Task }
  'myDay:get': { req: void; res: MyDay }
  'person:get': { req: { name: string }; res: PersonOverview }
  'tasks:completed': { req: CompletedRequest; res: { items: Task[]; total: number } }
  'summary:get': { req: { areaId?: number; person?: string }; res: Summary }
  'meta:facets': { req: void; res: FacetsResponse }
  'areas:list': { req: void; res: Area[] }
  'areas:upsert': { req: AreaUpsert; res: Area }
  'areas:delete': { req: { id: number }; res: void }
  'settings:get': { req: void; res: Settings }
  'settings:set': { req: Partial<Settings>; res: { settings: Settings; error?: string } }
  'data:export': { req: void; res: { path: string } | Cancelled }
  'data:import': { req: void; res: { tasks: number; areas: number; backupPath: string } | Cancelled }
  'app:openDataFolder': { req: void; res: void }
  'backup:status': { req: void; res: BackupStatus }
  'backup:runNow': { req: void; res: BackupStatus }
  'backup:chooseFolder': { req: void; res: BackupStatus | Cancelled }
  'backup:openFolder': { req: void; res: void }
  'quick:close': { req: void; res: void }
  'quick:resize': { req: { height: number }; res: void }
}

export type InvokeChannel = keyof InvokeMap
export type InvokeReq<K extends InvokeChannel> = InvokeMap[K]['req']
export type InvokeRes<K extends InvokeChannel> = InvokeMap[K]['res']

/** Eventi main → renderer. */
export interface EventMap {
  'tasks:changed': { ids: number[] }
  'settings:changed': Settings
  'nav:openTask': { id: number }
  'nav:show': { view: 'update' | 'settings' | 'newTask' | 'list' | 'myDay' }
  'clock:dayChanged': { today: string }
  'quick:focus': void
}

export type EventChannel = keyof EventMap

export const INVOKE_CHANNELS = [
  'app:init',
  'tasks:list',
  'tasks:get',
  'tasks:quickAdd',
  'tasks:create',
  'tasks:update',
  'tasks:complete',
  'tasks:reschedule',
  'tasks:setPriority',
  'tasks:delete',
  'tasks:restore',
  'tasks:setMyDay',
  'myDay:get',
  'person:get',
  'tasks:completed',
  'summary:get',
  'meta:facets',
  'areas:list',
  'areas:upsert',
  'areas:delete',
  'settings:get',
  'settings:set',
  'data:export',
  'data:import',
  'app:openDataFolder',
  'backup:status',
  'backup:runNow',
  'backup:chooseFolder',
  'backup:openFolder',
  'quick:close',
  'quick:resize'
] as const satisfies readonly InvokeChannel[]

export const EVENT_CHANNELS = [
  'tasks:changed',
  'settings:changed',
  'nav:openTask',
  'nav:show',
  'clock:dayChanged',
  'quick:focus'
] as const satisfies readonly EventChannel[]

type Complete<All, Listed> = [Exclude<All, Listed>] extends [never] ? true : false
export const CHANNELS_COMPLETE: Complete<InvokeChannel, (typeof INVOKE_CHANNELS)[number]> &
  Complete<EventChannel, (typeof EVENT_CHANNELS)[number]> = true

/** Formato della risposta sul filo: gli errori viaggiano come dati e il preload li rilancia. */
export type Wire<T> = { ok: true; data: T } | { ok: false; error: { name: string; message: string } }

export interface RendererApi {
  invoke<K extends InvokeChannel>(
    channel: K,
    ...args: InvokeReq<K> extends void ? [] : [InvokeReq<K>]
  ): Promise<InvokeRes<K>>
  on<K extends EventChannel>(channel: K, listener: (payload: EventMap[K]) => void): () => void
}
