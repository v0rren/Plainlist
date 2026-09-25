import { globalShortcut } from 'electron'
import { t } from '../../core/i18n'

export class GlobalHotkey {
  private current: string | null = null

  constructor(private readonly onPress: () => void) {}

  get accelerator(): string | null {
    return this.current
  }

  /** Registra la combinazione; se fallisce ripristina la precedente e restituisce un messaggio d'errore. */
  set(accelerator: string): string | undefined {
    if (accelerator === this.current) return undefined
    const previous = this.current
    this.clear()
    let ok = false
    try {
      ok = globalShortcut.register(accelerator, this.onPress)
    } catch {
      ok = false
    }
    if (ok) {
      this.current = accelerator
      return undefined
    }
    if (previous) this.restore(previous)
    return t().errors.hotkeyUnavailable(accelerator.replace('Control', 'Ctrl'))
  }

  clear(): void {
    if (this.current) globalShortcut.unregister(this.current)
    this.current = null
  }

  private restore(accelerator: string): void {
    try {
      if (globalShortcut.register(accelerator, this.onPress)) this.current = accelerator
    } catch {
      this.current = null
    }
  }
}
