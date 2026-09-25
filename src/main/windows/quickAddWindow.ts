import { BrowserWindow, screen } from 'electron'
import { t } from '../../core/i18n'
import { loadPage, preloadPath } from './mainWindow'
import { hardenWebContents } from './security'

const WIDTH = 680
const PADDING = 16

export class QuickAddWindow {
  private win: BrowserWindow | null = null
  private ready = false

  private create(): BrowserWindow {
    const win = new BrowserWindow({
      width: WIDTH,
      height: 90,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      title: t().system.quickAddTitle,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: preloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false
      }
    })
    hardenWebContents(win.webContents)
    win.on('blur', () => win.hide())
    win.on('closed', () => {
      this.win = null
      this.ready = false
    })
    win.webContents.once('did-finish-load', () => {
      this.ready = true
    })
    loadPage(win, 'quick-add.html')
    this.win = win
    return win
  }

  /** Crea la finestra in anticipo, così la scorciatoia la apre all'istante. */
  preload(): void {
    if (!this.win) this.create()
  }

  show(): void {
    const win = this.win ?? this.create()
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const { x, y, width, height } = display.workArea
    const [, h] = win.getSize()
    win.setBounds({ x: Math.round(x + (width - WIDTH) / 2), y: Math.round(y + height * 0.22), width: WIDTH, height: h })
    const focus = (): void => {
      win.show()
      win.focus()
      win.webContents.send('quick:focus')
    }
    if (this.ready) focus()
    else win.webContents.once('did-finish-load', focus)
  }

  hide(): void {
    this.win?.hide()
  }

  resize(contentHeight: number): void {
    if (!this.win) return
    const height = Math.min(Math.max(Math.ceil(contentHeight) + PADDING, 60), 400)
    const bounds = this.win.getBounds()
    if (bounds.height !== height) this.win.setBounds({ ...bounds, height })
  }

  destroy(): void {
    this.win?.destroy()
  }
}
