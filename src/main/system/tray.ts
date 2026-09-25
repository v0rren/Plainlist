import { Menu, Tray, nativeImage } from 'electron'
import { appIconPath } from '../windows/mainWindow'

export interface TrayActions {
  open(): void
  myDay(): void
  quickAdd(): void
  update(): void
  settings(): void
  quit(): void
}

export class AppTray {
  private tray: Tray

  constructor(
    private readonly actions: TrayActions,
    hotkey: string | null
  ) {
    const image = nativeImage.createFromPath(appIconPath()).resize({ width: 16, height: 16 })
    this.tray = new Tray(image)
    this.tray.setToolTip('Plainlist')
    this.tray.on('click', () => actions.open())
    this.setHotkey(hotkey)
  }

  setHotkey(hotkey: string | null): void {
    this.tray.setContextMenu(this.menu(hotkey))
  }

  private menu(hotkey: string | null): Menu {
    const a = this.actions
    return Menu.buildFromTemplate([
      { label: 'Apri Plainlist', click: () => a.open() },
      { label: 'Il mio giorno', click: () => a.myDay() },
      { label: 'Aggiunta rapida', accelerator: hotkey ?? undefined, registerAccelerator: false, click: () => a.quickAdd() },
      { label: 'Update di oggi', click: () => a.update() },
      { type: 'separator' },
      { label: 'Impostazioni', click: () => a.settings() },
      { type: 'separator' },
      { label: 'Esci', click: () => a.quit() }
    ])
  }

  setTooltip(text: string): void {
    this.tray.setToolTip(text)
  }

  destroy(): void {
    this.tray.destroy()
  }
}
