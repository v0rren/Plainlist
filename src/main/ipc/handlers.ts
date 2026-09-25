import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent, type WebContents } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  EventChannel,
  EventMap,
  InvokeChannel,
  InvokeReq,
  InvokeRes,
  Wire
} from '../../shared/ipc'
import { t } from '../../core/i18n'
import type { Settings } from '../../shared/types'
import { ValidationError, exportBackup, importBackup } from '../data'
import type { TaskService } from '../services/taskService'
import type { AutoBackup } from '../system/autoBackup'
import { isTrustedUrl } from '../windows/security'

type Handlers = {
  [K in InvokeChannel]: (req: InvokeReq<K>, sender: WebContents) => InvokeRes<K> | Promise<InvokeRes<K>>
}

export interface IpcDeps {
  service: TaskService
  backup: AutoBackup
  /** Applica gli effetti delle impostazioni (tema, avvio automatico, scorciatoia). Restituisce un errore da mostrare. */
  applySettings(next: Settings, prev: Settings): string | undefined
  closeQuickAdd(): void
  /** Riavvia l'app (serve dopo il cambio di lingua per i campi data di Chromium). */
  relaunch(): void
  resizeQuickAdd(height: number): void
  onTasksChanged(): void
}

export function broadcast<K extends EventChannel>(channel: K, payload: EventMap[K]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

export function registerIpc(deps: IpcDeps): void {
  const { service } = deps
  const tasks = service.tasks
  const changed = (...ids: number[]): void => {
    broadcast('tasks:changed', { ids })
    deps.onTasksChanged()
  }
  const mutate = <T extends { id: number }>(fn: () => T): T => {
    const result = fn()
    changed(result.id)
    return result
  }

  const handlers: Handlers = {
    'app:init': () => ({
      settings: service.settings.getAll(),
      facets: service.facets(),
      today: service.today(),
      version: app.getVersion()
    }),
    'tasks:list': (req) => service.list(req),
    'tasks:get': ({ id }) => tasks.detail(id),
    'tasks:quickAdd': ({ text }) => mutate(() => service.quickAdd(text)),
    'tasks:create': (input) => mutate(() => tasks.create(input)),
    'tasks:update': ({ id, patch }) => mutate(() => tasks.update(id, patch)),
    'tasks:complete': ({ id, done }) => {
      const task = tasks.complete(id, done)
      changed()
      return task
    },
    'tasks:reschedule': ({ id, to }) => mutate(() => tasks.reschedule(id, to)),
    'tasks:setPriority': ({ id, priority }) => mutate(() => tasks.setPriority(id, priority)),
    'tasks:delete': ({ id }) => {
      tasks.remove(id)
      changed(id)
    },
    'tasks:restore': ({ id }) => mutate(() => tasks.restore(id)),
    'tasks:setMyDay': ({ id, on }) => mutate(() => tasks.setMyDay(id, on)),
    'myDay:get': () => service.myDay(),
    'person:get': ({ name }) => service.person(name),
    'tasks:completed': (q) => tasks.listCompleted(q),
    'summary:get': (filter) => service.summary(filter),
    'meta:facets': () => service.facets(),
    'areas:list': () => tasks.areas.list(true),
    'areas:upsert': (input) => {
      const area = tasks.areas.upsert(input)
      changed()
      return area
    },
    'areas:delete': ({ id }) => {
      tasks.areas.remove(id)
      const settings = service.settings.getAll()
      if (settings.defaultAreaId === id) broadcast('settings:changed', service.settings.set({ defaultAreaId: null }))
      changed()
    },
    'settings:get': () => service.settings.getAll(),
    'settings:set': (partial) => {
      const prev = service.settings.getAll()
      const error = deps.applySettings(service.settings.set(partial), prev)
      const settings = service.settings.getAll()
      broadcast('settings:changed', settings)
      if (partial.upcomingDays !== undefined || partial.staleDays !== undefined) changed()
      return { settings, error }
    },
    'data:export': async (_req, sender) => {
      const win = BrowserWindow.fromWebContents(sender)
      const options = {
        title: t().system.exportTitle,
        defaultPath: join(app.getPath('documents'), `plainlist-backup-${service.today()}.json`),
        filters: [{ name: t().system.backupFilter, extensions: ['json'] }]
      }
      const res = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
      if (res.canceled || !res.filePath) return { cancelled: true }
      writeFileSync(res.filePath, JSON.stringify(exportBackup(service.db), null, 2), 'utf8')
      return { path: res.filePath }
    },
    'data:import': async (_req, sender) => {
      const win = BrowserWindow.fromWebContents(sender)
      const options = {
        title: t().system.importTitle,
        properties: ['openFile' as const],
        filters: [{ name: t().system.backupFilter, extensions: ['json'] }]
      }
      const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
      if (res.canceled || res.filePaths.length === 0) return { cancelled: true }

      let data: unknown
      try {
        data = JSON.parse(readFileSync(res.filePaths[0], 'utf8'))
      } catch {
        throw new ValidationError(t().errors.invalidJson)
      }

      const dir = join(app.getPath('userData'), 'backups')
      mkdirSync(dir, { recursive: true })
      const backupPath = join(dir, `prima-dell-import-${timestamp()}.json`)
      writeFileSync(backupPath, JSON.stringify(exportBackup(service.db), null, 2), 'utf8')

      const prev = service.settings.getAll()
      const counts = importBackup(service.db, data)
      const next = service.settings.getAll()
      deps.applySettings(next, prev)
      broadcast('settings:changed', next)
      changed()
      return { ...counts, backupPath }
    },
    'app:openDataFolder': () => {
      void shell.openPath(app.getPath('userData'))
    },
    'backup:status': () => deps.backup.status(),
    'backup:runNow': () => deps.backup.run(),
    'backup:chooseFolder': async (_req, sender) => {
      const win = BrowserWindow.fromWebContents(sender)
      const options = {
        title: t().system.backupFolderTitle,
        defaultPath: deps.backup.folder(),
        properties: ['openDirectory' as const, 'createDirectory' as const]
      }
      const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
      if (res.canceled || res.filePaths.length === 0) return { cancelled: true }
      const settings = service.settings.getAll()
      broadcast(
        'settings:changed',
        service.settings.set({ autoBackup: { ...settings.autoBackup, folder: res.filePaths[0] } })
      )
      return deps.backup.run()
    },
    'backup:openFolder': () => {
      const folder = deps.backup.folder()
      mkdirSync(folder, { recursive: true })
      void shell.openPath(folder)
    },
    'app:relaunch': () => deps.relaunch(),
    'quick:close': () => deps.closeQuickAdd(),
    'quick:resize': ({ height }) => deps.resizeQuickAdd(height)
  }

  for (const channel of Object.keys(handlers) as InvokeChannel[]) {
    const handler = handlers[channel] as (req: unknown, sender: WebContents) => unknown
    ipcMain.handle(channel, async (event: IpcMainInvokeEvent, req: unknown): Promise<Wire<unknown>> => {
      if (!isTrustedUrl(event.senderFrame?.url ?? '')) {
        return { ok: false, error: { name: 'SecurityError', message: t().errors.untrustedSender } }
      }
      try {
        return { ok: true, data: await handler(req, event.sender) }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        if (e.name !== 'ValidationError' && e.name !== 'NotFoundError') console.error(`[ipc] ${channel}`, e)
        return { ok: false, error: { name: e.name, message: e.message } }
      }
    })
  }
}
