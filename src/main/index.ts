import { app, dialog, Menu, nativeTheme, powerMonitor, type BrowserWindow } from 'electron'
import { join } from 'node:path'
import { isMac, languageFromLocale, localeTag, platformFromNode, setLanguage, setPlatform, t, type Language } from '../core/i18n'
import type { EventMap } from '../shared/ipc'
import type { Settings } from '../shared/types'
import { openDatabase, peekSetting, type OpenResult } from './data'
import { broadcast, registerIpc } from './ipc/handlers'
import { TaskService } from './services/taskService'
import { macMenu } from './system/appMenu'
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
/** Su Mac ⌃⌥Space cambia la lingua della tastiera e ⌘Space apre Spotlight: si parte da ⇧⌘Space. */
const MAC_HOTKEY = 'Shift+Command+Space'

/** Lingua per il primo avvio: quella dell'interfaccia di Windows, se è italiano; altrimenti inglese. */
function systemLanguage(): Language {
  let preferred: string | undefined
  try {
    preferred = app.getPreferredSystemLanguages()[0]
  } catch {
    // Il formato regionale è solo un ripiego: può essere italiano anche con Windows in inglese.
    preferred = Intl.DateTimeFormat().resolvedOptions().locale
  }
  return languageFromLocale(preferred)
}

// Chromium fissa la lingua dei campi data e ora all'avvio, prima di "ready": la si legge dal database.
const startupLanguage = peekSetting(join(app.getPath('userData'), 'tasks.db'), 'language') ?? systemLanguage()
setLanguage(startupLanguage)
setPlatform(platformFromNode(process.platform))
app.commandLine.appendSwitch('lang', localeTag(startupLanguage))
// Solo Windows: collega notifiche e collegamenti all'app installata.
if (process.platform === 'win32') app.setAppUserModelId(APP_ID)

/** Primo avvio con un database nuovo: lingua del sistema, scorciatoia adatta e, in inglese, nomi inglesi per le aree. */
function firstRun(service: TaskService): void {
  const language = systemLanguage()
  service.settings.set({ firstRunDone: true, language, ...(isMac() ? { globalHotkey: MAC_HOTKEY } : {}) })
  if (language === 'it') return
  const names = t(language).system.defaultAreas
  const italian = t('it').system.defaultAreas
  for (const area of service.tasks.areas.list(true)) {
    const i = italian.indexOf(area.name)
    if (i >= 0) service.tasks.areas.upsert({ id: area.id, name: names[i] })
  }
}

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
    if (!prev || prev.language !== next.language) {
      setLanguage(next.language)
      tray?.refresh()
      setAppMenu()
      refreshTray()
    }
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
    notify(t().system.backupFailedTitle, status.lastError, () => showMainAnd('nav:show', { view: 'settings' }))
  }

  function startBackgroundJobs(): void {
    setTimeout(runBackupIfDue, 60_000)
    setInterval(runBackupIfDue, 60 * 60_000)

    const scheduler = new ReminderScheduler(service.tasks, () => service.settings.getAll(), {
      due: (task) =>
        notify(t().system.dueNow(task.dueTime!), taskBody(task), () => showMainAnd('nav:openTask', { id: task.id })),
      dueSoon: (task, minutes) =>
        notify(t().system.dueIn(minutes), taskBody(task), () => showMainAnd('nav:openTask', { id: task.id }))
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

  // Mac: clic sull'icona nel Dock con la finestra chiusa.
  app.on('activate', () => {
    if (service) showMain()
  })

  function setAppMenu(): void {
    if (isMac()) Menu.setApplicationMenu(macMenu({ settings: () => showMainAnd('nav:show', { view: 'settings' }) }))
    else if (app.isPackaged) Menu.setApplicationMenu(null)
  }

  app.on('before-quit', () => {
    quitting = true
  })

  app.on('window-all-closed', () => {
    // L'app resta attiva nell'area di notifica (su Mac nella barra dei menu).
  })

  app.on('will-quit', () => {
    hotkey.clear()
    tray?.destroy()
  })

  void app.whenReady().then(() => {
    blockNetwork()
    setAppMenu()

    const userData = app.getPath('userData')
    let opened: OpenResult
    try {
      opened = openDatabase(join(userData, 'tasks.db'), { backupDir: join(userData, 'backups') })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      dialog.showErrorBox(t().system.cannotOpenData, `${message}\n\n${t().system.dataFolder(userData)}`)
      quitting = true
      app.quit()
      return
    }
    if (opened.backupPath) console.log('[db] copia prima dell\'aggiornamento:', opened.backupPath)
    service = new TaskService(opened.db)
    service.tasks.purgeDeleted(30)
    backup = new AutoBackup(service, join(app.getPath('documents'), 'Plainlist Backup'))

    if (!service.settings.getAll().firstRunDone) firstRun(service)

    registerIpc({
      service,
      backup,
      applySettings,
      closeQuickAdd: () => quickAdd.hide(),
      relaunch: () => {
        app.relaunch()
        app.quit()
      },
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
    if (hotkeyError) notify(t().system.hotkeyUnavailableTitle, hotkeyError, () => showMainAnd('nav:show', { view: 'settings' }))

    const hidden = launchedHidden()
    mainWindow = openMainWindow(!hidden)
    quickAdd.preload()

    refreshTray()
    const { notifications } = service.settings.getAll()
    if (notifications.startupDigest) showDigest()
    startBackgroundJobs()
  })
}
