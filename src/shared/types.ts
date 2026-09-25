import type { Language } from '../core/i18n'

export type {
  Area,
  Priority,
  RescheduleTarget,
  Task,
  TaskDetail,
  TaskEvent,
  TaskEventType,
  TaskFilter,
  TaskInput,
  TaskPatch,
  TaskStatus
} from '../core/types'

export type { Language } from '../core/i18n'

export type ThemeSetting = 'system' | 'light' | 'dark'

export interface NotificationSettings {
  enabled: boolean
  startupDigest: boolean
  dailyDigestOnUnlock: boolean
  dueAlerts: boolean
  remindBeforeMin: number | null
}

export interface AutoBackupSettings {
  enabled: boolean
  /** Cartella dei backup; null = Documenti\Plainlist Backup. */
  folder: string | null
  keep: number
}

export interface Settings {
  /** Lingua dell'interfaccia e dell'inserimento rapido. */
  language: Language
  autostart: boolean
  theme: ThemeSetting
  globalHotkey: string
  defaultAreaId: number | null
  staleDays: number
  upcomingDays: number
  undoSeconds: number
  notifications: NotificationSettings
  autoBackup: AutoBackupSettings
  /** Minuti di lavoro disponibili in una giornata, per il carico di "Il mio giorno". */
  workdayMinutes: number
  /** Tour di benvenuto completato o saltato. */
  tourCompleted: boolean
  firstRunDone: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  // Chi aggiorna da una versione senza lingua resta in italiano; al primo avvio la sceglie il sistema.
  language: 'it',
  autostart: true,
  theme: 'system',
  globalHotkey: 'Control+Alt+Space',
  defaultAreaId: null,
  staleDays: 14,
  upcomingDays: 7,
  undoSeconds: 6,
  notifications: {
    enabled: true,
    startupDigest: true,
    dailyDigestOnUnlock: true,
    dueAlerts: true,
    remindBeforeMin: null
  },
  autoBackup: {
    enabled: true,
    folder: null,
    keep: 14
  },
  workdayMinutes: 480,
  tourCompleted: false,
  firstRunDone: false
}
