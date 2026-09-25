import { app, dialog, Menu, nativeTheme, powerMonitor, type BrowserWindow } from 'electron'
import { join } from 'node:path'
import type { EventMap } from '../shared/ipc'
import type { Settings } from '../shared/types'
import { openDatabase, type OpenResult } from './data'
import { broadcast, registerIpc } from './ipc/handlers'
import { TaskService } from './services/taskService'
import { applyAutostart, launchedHidden } from './system/autostart'
import { AutoBackup } from './system/autoBackup'
import { GlobalHotkey } from './system/hotkey'
import { notify, taskBody } from './system/notifications'
import { ReminderScheduler, digestText, trayTooltip } from './system/reminders'
import { AppTray } from './system/tray'
import { createMainWindow } from './windows/mainWindow'
import { QuickAddWindow } from './windows/quickAddWindow'
import { blockNetwork } from './windows/security'

const APP_ID = 'it.claudiovona.plainlist'

app.commandLine.appendSwitch('lang', 'it-IT')
app.setAppUserModelId(APP_ID)

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let service: TaskService
  let backup: AutoBackup
  let mainWindow: BrowserWindow | null = null
  let tray: AppTray | null = null
  let quitting = false
  const quickAdd = new QuickAddWindow()
  const hotkey = new GlobalHotkey(() => quickAdd.show())

  function showMain(): BrowserWindow {
    if (!mainWindow || mainWindow.isDestroyed()) mainWindow = openMainWindow(true)
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }

  function showMainAnd<K extends 'nav:openTask' | 'nav:show'>(channel: K, payload: EventMap[K]): void {
    const win = showMain()
    if (win.webContents.isLoading()) win.webContents.once('did-finish-load', () => win.webContents.send(channel, payload))
    else win.webContents.send(channel, payload)
  }

  function openMainWindow(show: boolean): BrowserWindow {
    const win = createMainWindow({ show })
    win.on('close', (event) => {
      if (!quitting) {
        event.preventDefault()
        win.hide()
      }
    })
    win.on('closed', () => {
      if (mainWindow === win) mainWindow = null
    })
    return win
  }

  function applySettings(next: Settings, prev?: Settings): string | undefined {
    nativeTheme.themeSource = next.theme
    if (!prev || prev.autostart !== next.autostart) applyAutostart(next.autostart)
    if (prev && prev.globalHotkey === next.globalHotkey) return undefined
    const error = hotkey.set(next.globalHotkey)
    tray?.setHotkey(hotkey.accelerator)
    if (error && prev) service.settings.set({ globalHotkey: prev.globalHotkey })
    return error
  }

  function refreshTray(): void {
    tray?.setTooltip(trayTooltip(service.summary({})))
  }

  function showDigest(): void {
    const { notifications } = service.settings.getAll()
    if (!notifications.enabled) return
    const { title, body } = digestText(service.summary({}))
    notify(title, body, () => showMainAnd('nav:show', { view: 'myDay' }))
    service.settings.setState('lastDigestDate', service.today())
  }

  function runBackupIfDue(): void {
    const status = backup.runIfDue()
    if (!status?.lastError) return
    if (service.settings.getState('backup.errorNotifiedDate') === service.today()) return
    service.settings.setState('backup.errorNotifiedDate', service.today())
    notify('Backup automatico non riuscito', status.lastError, () => showMainAnd('nav:show', { view: 'settings' }))
  }

  function startBackgroundJobs(): void {
    setTimeout(runBackupIfDue, 60_000)
    setInterval(runBackupIfDue, 60 * 60_000)

    const scheduler = new ReminderScheduler(service.tasks, () => service.settings.getAll(), {
      due: (task) =>
        notify(`È l'ora: ${task.dueTime}`, taskBody(task), () => showMainAnd('nav:openTask', { id: task.id })),
      dueSoon: (task, minutes) =>
        notify(`Tra ${minutes} minuti`, taskBody(task), () => showMainAnd('nav:openTask', { id: task.id }))
    })
    scheduler.catchUp()
    setInterval(() => scheduler.tick(), 30_000)
    powerMonitor.on('resume', () => scheduler.tick())

    powerMonitor.on('unlock-screen', () => {
      const { notifications } = service.settings.getAll()
      if (notifications.dailyDigestOnUnlock && service.settings.getState('lastDigestDate') !== service.today()) {
        showDigest()
      }
    })

    let today = service.today()
    setInterval(() => {
      const now = service.today()
      if (now !== today) {
        today = now
        broadcast('clock:dayChanged', { today })
        refreshTray()
      }
    }, 30_000)
  }

  app.on('second-instance', () => showMain())

  app.on('before-quit', () => {
    quitting = true
  })

  app.on('window-all-closed', () => {
    // L'app resta attiva nell'area di notifica.
  })

  app.on('will-quit', () => {
    hotkey.clear()
    tray?.destroy()
  })

  void app.whenReady().then(() => {
    blockNetwork()
    if (app.isPackaged) Menu.setApplicationMenu(null)

    const userData = app.getPath('userData')
    let opened: OpenResult
    try {
      opened = openDatabase(join(userData, 'tasks.db'), { backupDir: join(userData, 'backups') })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      dialog.showErrorBox('Plainlist non può aprire i dati', `${message}\n\nCartella dei dati: ${userData}`)
      quitting = true
      app.quit()
      return
    }
    if (opened.backupPath) console.log('[db] copia prima dell\'aggiornamento:', opened.backupPath)
    service = new TaskService(opened.db)
    service.tasks.purgeDeleted(30)
    backup = new AutoBackup(service, join(app.getPath('documents'), 'Plainlist Backup'))

    if (!service.settings.getAll().firstRunDone) service.settings.set({ firstRunDone: true })

    registerIpc({
      service,
      backup,
      applySettings,
      closeQuickAdd: () => quickAdd.hide(),
      resizeQuickAdd: (height) => quickAdd.resize(height),
      onTasksChanged: () => refreshTray()
    })

    tray = new AppTray(
      {
        open: () => showMainAnd('nav:show', { view: 'list' }),
        myDay: () => showMainAnd('nav:show', { view: 'myDay' }),
        quickAdd: () => quickAdd.show(),
        update: () => showMainAnd('nav:show', { view: 'update' }),
        settings: () => showMainAnd('nav:show', { view: 'settings' }),
        quit: () => app.quit()
      },
      null
    )
    const hotkeyError = applySettings(service.settings.getAll())
    if (hotkeyError) notify('Scorciatoia non disponibile', hotkeyError, () => showMainAnd('nav:show', { view: 'settings' }))

    const hidden = launchedHidden()
    mainWindow = openMainWindow(!hidden)
    quickAdd.preload()

    refreshTray()
    const { notifications } = service.settings.getAll()
    if (notifications.startupDigest) showDigest()
    startBackgroundJobs()
  })
}
