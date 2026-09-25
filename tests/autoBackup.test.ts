import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../src/main/data'
import { TaskService } from '../src/main/services/taskService'
import { AutoBackup, backupFileName, filesToPrune } from '../src/main/system/autoBackup'

let dir: string
let now: Date
let service: TaskService
let backup: AutoBackup

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'plainlist-backup-'))
  now = new Date('2026-09-24T08:00:00Z')
  service = new TaskService(openDatabase(':memory:').db, () => now)
  backup = new AutoBackup(service, join(dir, 'default'))
})

afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('filesToPrune', () => {
  it('tiene i più recenti e ignora gli altri file', () => {
    const names = ['plainlist-2026-09-20.json', 'note.txt', 'plainlist-2026-09-22.json', 'plainlist-2026-09-21.json']
    expect(filesToPrune(names, 2)).toEqual(['plainlist-2026-09-20.json'])
    expect(filesToPrune(names, 0)).toEqual(['plainlist-2026-09-21.json', 'plainlist-2026-09-20.json'])
  })
})

describe('AutoBackup', () => {
  it('scrive il backup del giorno nella cartella predefinita, una volta al giorno', () => {
    service.quickAdd('Da salvare')
    const status = backup.runIfDue()
    expect(status?.lastError).toBeNull()
    const file = join(dir, 'default', backupFileName('2026-09-24'))
    expect(status?.lastPath).toBe(file)
    expect(JSON.parse(readFileSync(file, 'utf8')).tasks[0].title).toBe('Da salvare')
    expect(backup.runIfDue()).toBeNull()

    now = new Date('2026-09-25T08:00:00Z')
    expect(backup.runIfDue()?.lastPath).toBe(join(dir, 'default', backupFileName('2026-09-25')))
  })

  it('usa la cartella scelta e tiene solo gli ultimi N', () => {
    const custom = join(dir, 'OneDrive', 'Backup')
    service.settings.set({ autoBackup: { enabled: true, folder: custom, keep: 2 } })
    for (const day of ['2026-09-24', '2026-09-25', '2026-09-26']) {
      now = new Date(`${day}T08:00:00Z`)
      backup.run()
    }
    expect(readdirSync(custom).sort()).toEqual(['plainlist-2026-09-25.json', 'plainlist-2026-09-26.json'])
  })

  it('spento non fa nulla', () => {
    service.settings.set({ autoBackup: { enabled: false, folder: null, keep: 14 } })
    expect(backup.runIfDue()).toBeNull()
  })

  it('un errore viene registrato e il backup ritenta', () => {
    const notAFolder = join(dir, 'file.txt')
    writeFileSync(notAFolder, 'x')
    service.settings.set({ autoBackup: { enabled: true, folder: notAFolder, keep: 14 } })
    const failed = backup.runIfDue()
    expect(failed?.lastError).toMatch(/^Backup non riuscito in /)
    expect(backup.runIfDue()).not.toBeNull()

    service.settings.set({ autoBackup: { enabled: true, folder: join(dir, 'ok'), keep: 14 } })
    expect(backup.runIfDue()?.lastError).toBeNull()
  })
})
