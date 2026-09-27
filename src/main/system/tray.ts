import { Menu, Tray, nativeImage } from 'electron'
import { t } from '../../core/i18n'
import { appIconPath, resourcePath } from '../windows/mainWindow'

export interface TrayActions {
  open(): void
  myDay(): void
  quickAdd(): void
  update(): void
  settings(): void
  quit(): void
}

/** Su Mac la barra dei menu vuole un'immagine "template": solo la forma, il colore lo decide il sistema. */
function trayImage(): Electron.NativeImage {
  if (process.platform === 'darwin') {
    const image = nativeImage.createFromPath(resourcePath('trayTemplate.png'))
    image.setTemplateImage(true)
    return image
  }
  return nativeImage.createFromPath(appIconPath()).resize({ width: 16, height: 16 })
}

export class AppTray {
  private tray: Tray
  private hotkey: string | null = null

  constructor(
    private readonly actions: TrayActions,
    hotkey: string | null
  ) {
    this.tray = new Tray(trayImage())
    this.tray.setToolTip('Plainlist')
    this.tray.on('click', () => actions.open())
    this.setHotkey(hotkey)
  }

  setHotkey(hotkey: string | null): void {
    this.hotkey = hotkey
    this.tray.setContextMenu(this.menu())
  }

  /** Ricostruisce il menu, per esempio dopo un cambio di lingua. */
  refresh(): void {
    this.tray.setContextMenu(this.menu())
  }

  private menu(): Menu {
    const a = this.actions
    const m = t().system
    return Menu.buildFromTemplate([
      { label: m.trayOpen, click: () => a.open() },
      { label: m.trayMyDay, click: () => a.myDay() },
      { label: m.trayQuickAdd, accelerator: this.hotkey ?? undefined, registerAccelerator: false, click: () => a.quickAdd() },
      { label: m.trayUpdate, click: () => a.update() },
      { type: 'separator' },
      { label: m.traySettings, click: () => a.settings() },
      { type: 'separator' },
      { label: m.trayQuit, click: () => a.quit() }
    ])
  }

  setTooltip(text: string): void {
    this.tray.setToolTip(text)
  }

  destroy(): void {
    this.tray.destroy()
  }
}
