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
