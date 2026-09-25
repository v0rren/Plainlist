import { app } from 'electron'

export const HIDDEN_ARG = '--hidden'

export function launchedHidden(argv: string[] = process.argv): boolean {
  return argv.includes(HIDDEN_ARG)
}

/** In sviluppo non si registra nulla: si registrerebbe electron.exe invece dell'app installata. */
export function applyAutostart(enabled: boolean): void {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath, args: [HIDDEN_ARG] })
}
