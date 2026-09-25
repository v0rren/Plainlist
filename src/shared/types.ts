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
