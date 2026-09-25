import { app, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'node:path'
import { hardenWebContents } from './security'

export function appIconPath(): string {
  return app.isPackaged ? join(process.resourcesPath, 'icon.ico') : join(__dirname, '../../resources/icon.ico')
}

export function preloadPath(): string {
  return join(__dirname, '../preload/index.js')
}

export function loadPage(win: BrowserWindow, page: 'index.html' | 'quick-add.html', query?: Record<string, string>): void {
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && devUrl) {
    const url = new URL(`${devUrl}/${page}`)
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v)
    void win.loadURL(url.toString())
  } else {
    void win.loadFile(join(__dirname, `../renderer/${page}`), { query })
  }
}

export function backgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? '#15171c' : '#f5f6f8'
}

export function createMainWindow(options: { show: boolean }): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 600,
    show: false,
    title: 'Plainlist',
    icon: appIconPath(),
    autoHideMenuBar: true,
    backgroundColor: backgroundColor(),
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })
  hardenWebContents(win.webContents)
  if (options.show) win.once('ready-to-show', () => win.show())
  loadPage(win, 'index.html')
  return win
}
