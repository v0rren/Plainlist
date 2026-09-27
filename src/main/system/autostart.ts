import { app } from 'electron'

export const HIDDEN_ARG = '--hidden'

export function launchedHidden(argv: string[] = process.argv): boolean {
  if (argv.includes(HIDDEN_ARG)) return true
  // Su Mac gli elementi di login non ricevono argomenti: è il sistema a dire se l'avvio è stato automatico.
  if (process.platform === 'darwin') {
    try {
      return app.getLoginItemSettings().wasOpenedAtLogin
    } catch {
      return false
    }
  }
  return false
}

/** In sviluppo non si registra nulla: si registrerebbe electron.exe invece dell'app installata. */
export function applyAutostart(enabled: boolean): void {
  if (!app.isPackaged) return
  if (process.platform === 'darwin') app.setLoginItemSettings({ openAtLogin: enabled })
  else app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath, args: [HIDDEN_ARG] })
}
