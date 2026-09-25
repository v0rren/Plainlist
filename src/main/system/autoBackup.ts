import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BackupStatus } from '../../shared/ipc'
import { exportBackup } from '../data'
import type { TaskService } from '../services/taskService'

const FILE_RE = /^plainlist-\d{4}-\d{2}-\d{2}\.json$/

export function backupFileName(date: string): string {
  return `plainlist-${date}.json`
}

/** I file di backup da eliminare per tenerne solo `keep` (i più recenti); gli altri file non vengono toccati. */
export function filesToPrune(names: string[], keep: number): string[] {
  return names
    .filter((n) => FILE_RE.test(n))
    .sort()
    .reverse()
    .slice(Math.max(1, keep))
}

/** Backup giornaliero in JSON (lo stesso formato di Esporta), in una cartella scelta dall'utente. */
export class AutoBackup {
  constructor(
    private readonly service: TaskService,
    private readonly defaultFolder: string
  ) {}

  folder(): string {
    return this.service.settings.getAll().autoBackup.folder ?? this.defaultFolder
  }

  status(): BackupStatus {
    const s = this.service.settings
    return {
      enabled: s.getAll().autoBackup.enabled,
      folder: this.folder(),
      lastAt: s.getState<string>('backup.lastAt') ?? null,
      lastPath: s.getState<string>('backup.lastPath') ?? null,
      lastError: s.getState<string>('backup.lastError') ?? null
    }
  }

  run(): BackupStatus {
    const s = this.service.settings
    const folder = this.folder()
    try {
      mkdirSync(folder, { recursive: true })
      const file = join(folder, backupFileName(this.service.today()))
      const tmp = `${file}.tmp`
      writeFileSync(tmp, JSON.stringify(exportBackup(this.service.db), null, 2), 'utf8')
      renameSync(tmp, file)
      for (const old of filesToPrune(readdirSync(folder), s.getAll().autoBackup.keep)) {
        rmSync(join(folder, old), { force: true })
      }
      s.setState('backup.lastAt', new Date().toISOString())
      s.setState('backup.lastPath', file)
      s.setState('backup.lastDate', this.service.today())
      s.setState('backup.lastError', null)
    } catch (err) {
      s.setState('backup.lastError', `Backup non riuscito in ${folder}: ${err instanceof Error ? err.message : String(err)}`)
    }
    return this.status()
  }

  /** Esegue il backup se attivo e non ancora fatto oggi. */
  runIfDue(): BackupStatus | null {
    const s = this.service.settings
    if (!s.getAll().autoBackup.enabled) return null
    if (s.getState<string>('backup.lastDate') === this.service.today()) return null
    return this.run()
  }
}
