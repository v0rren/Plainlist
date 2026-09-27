import { en } from './en'
import { it, type Messages } from './it'

export type { Messages } from './it'

export type Language = 'it' | 'en'

export const LANGUAGES: Array<{ id: Language; name: string }> = [
  { id: 'it', name: 'Italiano' },
  { id: 'en', name: 'English' }
]

const CATALOG: Record<Language, Messages> = { it, en }

// Ogni processo (main, finestra principale, aggiunta rapida) mostra una lingua alla volta:
// la imposta all'avvio e quando cambiano le impostazioni.
let current: Language = 'it'

export function isLanguage(value: unknown): value is Language {
  return value === 'it' || value === 'en'
}

export function setLanguage(lang: Language): void {
  current = isLanguage(lang) ? lang : 'it'
}

export function getLanguage(): Language {
  return current
}

/** Testi della lingua corrente, o di quella indicata. */
export function t(lang: Language = current): Messages {
  return CATALOG[lang]
}

/** "it-IT", "it", "en-US"… → lingua dell'app; tutto ciò che non è italiano diventa inglese. */
export function languageFromLocale(locale: string | undefined): Language {
  return locale?.toLowerCase().startsWith('it') ? 'it' : 'en'
}

/** Tag BCP 47 per Intl e per Chromium: l'inglese usa il formato britannico (giorno/mese, 24 ore). */
export function localeTag(lang: Language = current): string {
  return lang === 'it' ? 'it-IT' : 'en-GB'
}

// ---------- piattaforma ----------

export type Platform = 'win' | 'mac' | 'linux'

let platform: Platform = 'win'

export function platformFromNode(nodePlatform: string): Platform {
  return nodePlatform === 'darwin' ? 'mac' : nodePlatform === 'win32' ? 'win' : 'linux'
}

export function setPlatform(p: Platform): void {
  platform = p
}

export function isMac(): boolean {
  return platform === 'mac'
}

const MAC_MODIFIERS: Record<string, string> = { Control: '⌃', Ctrl: '⌃', Alt: '⌥', Option: '⌥', Shift: '⇧', Mod: '⌘', Command: '⌘', Cmd: '⌘', Super: '⌘', Meta: '⌘' }
const MAC_ORDER = ['⌃', '⌥', '⇧', '⌘']
const MAC_KEYS: Record<string, string> = { Enter: '↩', Return: '↩', Delete: '⌫', Backspace: '⌫', Space: 'Space', Up: '↑', Down: '↓', Left: '←', Right: '→', Escape: 'Esc', Esc: 'Esc' }

/**
 * Combinazione di tasti leggibile per la piattaforma: "Mod" è Ctrl su Windows e ⌘ su Mac.
 * "Mod+Shift+N" → "Ctrl+Shift+N" oppure "⇧⌘N"; "Delete" → "Canc"/"Del" oppure "⌫".
 */
export function shortcut(combo: string, lang: Language = current): string {
  const parts = combo.split('+')
  if (platform === 'mac') {
    const mods = parts.slice(0, -1).map((p) => MAC_MODIFIERS[p] ?? p)
    const key = parts.at(-1)!
    mods.sort((a, b) => MAC_ORDER.indexOf(a) - MAC_ORDER.indexOf(b))
    return mods.join('') + (MAC_KEYS[key] ?? key)
  }
  const keys = CATALOG[lang].keys as Record<string, string>
  const names: Record<string, string> = { Mod: 'Ctrl', Control: 'Ctrl', Command: 'Ctrl', Super: 'Win', Meta: 'Win', Up: '↑', Down: '↓', Left: '←', Right: '→', Escape: 'Esc' }
  return parts.map((p) => keys[p] ?? names[p] ?? p).join('+')
}

/** Acceleratore di Electron ("Control+Alt+Space", "Shift+Command+Space") in forma leggibile. */
export function formatAccelerator(accelerator: string, lang: Language = current): string {
  return shortcut(accelerator, lang)
}
