import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  NotFoundError,
  SchemaTooNewError,
  SettingsRepo,
  TasksRepo,
  ValidationError,
  exportBackup,
  importBackup,
  latestVersion,
  migrate,
  openDatabase,
  schemaVersion,
  toFtsQuery,
  type DB
} from '../src/main/data'
import { MIGRATIONS } from '../src/main/data/migrations'
import { DEFAULT_SETTINGS } from '../src/shared/types'

const LATEST = latestVersion()

let db: DB
let now: Date
let repo: TasksRepo

function advance(ms: number): void {
  now = new Date(now.getTime() + ms)
}

beforeEach(() => {
  db = openDatabase(':memory:').db
  now = new Date('2026-09-24T08:00:00Z')
  repo = new TasksRepo(db, () => now)
})

describe('database e migrazioni', () => {
  const EXTRA = { version: LATEST + 1, sql: 'ALTER TABLE tasks ADD COLUMN test_extra INTEGER' }

  it('crea lo schema alla versione corrente con le aree predefinite', () => {
    expect(schemaVersion(db)).toBe(LATEST)
    expect(repo.areas.list().map((a) => a.name)).toEqual(['lavoro', 'casa', 'personale'])
  })

  it('le migrazioni sono idempotenti', () => {
    migrate(db)
    migrate(db)
    expect(schemaVersion(db)).toBe(LATEST)
    expect(repo.areas.list()).toHaveLength(3)
  })

  it('applica solo le migrazioni nuove', () => {
    migrate(db, [...MIGRATIONS, EXTRA])
    expect(schemaVersion(db)).toBe(LATEST + 1)
    expect(db.prepare('SELECT test_extra FROM tasks').all()).toEqual([])
  })

  it("l'area predefinita è lavoro", () => {
    expect(new SettingsRepo(db).getAll().defaultAreaId).toBe(repo.areas.findByName('lavoro')!.id)
  })

  it("la migrazione dell'area predefinita non sovrascrive una scelta già fatta", () => {
    const old = openDatabase(':memory:', { migrations: MIGRATIONS.filter((m) => m.version === 1) }).db
    new SettingsRepo(old).set({ defaultAreaId: null })
    migrate(old)
    expect(new SettingsRepo(old).getAll().defaultAreaId).toBeNull()
  })

  it('il tour si mostra alle nuove installazioni e non a chi aggiorna con dei task', () => {
    expect(new SettingsRepo(db).getAll().tourCompleted).toBe(false)

    const upToV3 = MIGRATIONS.filter((m) => m.version <= 3)
    const used = openDatabase(':memory:', { migrations: upToV3 }).db
    new TasksRepo(used).create({ title: 'Già in uso' })
    migrate(used)
    expect(new SettingsRepo(used).getAll().tourCompleted).toBe(true)

    const empty = openDatabase(':memory:', { migrations: upToV3 }).db
    migrate(empty)
    expect(new SettingsRepo(empty).getAll().tourCompleted).toBe(false)
  })

  describe('su file', () => {
    let dir: string
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'plainlist-'))
    })
    afterEach(() => rmSync(dir, { recursive: true, force: true }))

    it("prima di aggiornare lo schema salva una copia del database, con i dati", () => {
      const file = join(dir, 'tasks.db')
      const first = openDatabase(file, { backupDir: join(dir, 'backups') })
      expect(first.backupPath).toBeNull()
      new TasksRepo(first.db).create({ title: 'Da non perdere' })
      first.db.close()

      const second = openDatabase(file, { migrations: [...MIGRATIONS, EXTRA], backupDir: join(dir, 'backups') })
      second.db.close()
      expect(second.backupPath).toMatch(/tasks-schema\d+-prima-dell-aggiornamento-.*\.db$/)
      expect(readdirSync(join(dir, 'backups'))).toHaveLength(1)

      const copy = openDatabase(second.backupPath!).db
      expect(schemaVersion(copy)).toBe(LATEST)
      expect(new TasksRepo(copy).query().map((t) => t.title)).toEqual(['Da non perdere'])
      copy.close()
    })

    it('nessuna copia se non ci sono migrazioni da applicare', () => {
      const file = join(dir, 'tasks.db')
      openDatabase(file, { backupDir: join(dir, 'backups') }).db.close()
      const again = openDatabase(file, { backupDir: join(dir, 'backups') })
      again.db.close()
      expect(again.backupPath).toBeNull()
    })

    it('rifiuta un database creato da una versione più recente senza modificarlo', () => {
      const file = join(dir, 'tasks.db')
      const newer = openDatabase(file, { migrations: [...MIGRATIONS, EXTRA] }).db
      newer.close()
      expect(() => openDatabase(file)).toThrow(SchemaTooNewError)
      const check = openDatabase(file, { migrations: [...MIGRATIONS, EXTRA] }).db
      expect(schemaVersion(check)).toBe(LATEST + 1)
      check.close()
    })
  })
})

describe('creazione', () => {
  it('salva tutti i campi, persone, tag e area', () => {
    const t = repo.create({
      title: '  Mandare   preventivo ',
      notes: 'Versione 2',
      priority: 3,
      areaName: 'Lavoro',
      dueDate: '2026-09-25',
      dueTime: '12:00',
      people: ['Marco', 'marco', ' Anna '],
      tags: ['Urgente'],
      sourceText: 'Mandare preventivo @Marco venerdì alle 12 #lavoro !alta'
    })
    expect(t).toMatchObject({
      title: 'Mandare preventivo',
      notes: 'Versione 2',
      priority: 3,
      status: 'open',
      areaName: 'lavoro',
      dueDate: '2026-09-25',
      dueTime: '12:00',
      dueAt: '2026-09-25T10:00:00.000Z',
      people: ['Anna', 'Marco'],
      tags: ['urgente'],
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString()
    })
    expect(repo.detail(t.id)?.events.map((e) => e.type)).toEqual(['created'])
  })

  it('crea le aree nuove al volo', () => {
    const t = repo.create({ title: 'X', areaName: 'Progetto Alfa' })
    expect(t.areaName).toBe('Progetto Alfa')
    expect(repo.areas.list().map((a) => a.name)).toContain('Progetto Alfa')
  })

  it('valori predefiniti', () => {
    const t = repo.create({ title: 'X' })
    expect(t).toMatchObject({ priority: 2, areaId: null, dueDate: null, dueAt: null, notes: null, people: [], tags: [] })
  })

  it.each([
    [{ title: '   ' }, 'Il titolo è obbligatorio'],
    [{ title: 'X', dueTime: '10:00' }, 'Per impostare un orario serve una data'],
    [{ title: 'X', dueDate: '2026-02-30' }, 'Data non valida: 2026-02-30'],
    [{ title: 'X', dueDate: '2026-09-25', dueTime: '25:00' }, 'Orario non valido: 25:00'],
    [{ title: 'X', priority: 5 as never }, 'Priorità non valida'],
    [{ title: 'X', areaId: 999 }, 'Area inesistente']
  ])('rifiuta input non validi: %o', (input, message) => {
    expect(() => repo.create(input)).toThrow(new ValidationError(message))
  })
})

describe('modifica', () => {
  it('ricalcola due_at e registra un evento "rescheduled"', () => {
    const t = repo.create({ title: 'X', dueDate: '2026-09-25', dueTime: '12:00' })
    advance(60_000)
    const u = repo.update(t.id, { dueDate: '2026-10-26' })
    expect(u).toMatchObject({ dueDate: '2026-10-26', dueTime: '12:00', dueAt: '2026-10-26T11:00:00.000Z' })
    expect(u.lastActivityAt).toBe(now.toISOString())
    const last = repo.detail(t.id)!.events.at(-1)!
    expect(last).toMatchObject({ type: 'rescheduled', payload: { from: '2026-09-25 12:00', to: '2026-10-26 12:00' } })
  })

  it('togliere la data toglie anche l\'orario', () => {
    const t = repo.create({ title: 'X', dueDate: '2026-09-25', dueTime: '12:00' })
    expect(repo.update(t.id, { dueDate: null })).toMatchObject({ dueDate: null, dueTime: null, dueAt: null })
  })

  it('una modifica senza cambiamenti non registra eventi né attività', () => {
    const t = repo.create({ title: 'X', people: ['Anna'] })
    advance(60_000)
    const u = repo.update(t.id, { title: 'X', people: ['anna'] })
    expect(u.lastActivityAt).toBe(t.lastActivityAt)
    expect(repo.detail(t.id)!.events).toHaveLength(1)
  })

  it('aggiorna più campi e sostituisce persone e tag', () => {
    const t = repo.create({ title: 'X', people: ['Anna'], tags: ['a'] })
    const u = repo.update(t.id, { title: 'Y', notes: ' nota ', people: ['Luca'], tags: [], priority: 1, areaId: 2 })
    expect(u).toMatchObject({ title: 'Y', notes: 'nota', people: ['Luca'], tags: [], priority: 1, areaName: 'casa' })
    expect(repo.detail(t.id)!.events.at(-1)).toMatchObject({
      type: 'updated',
      payload: { fields: ['title', 'notes', 'priority', 'area', 'people', 'tags'] }
    })
  })

  it('cambiare la scadenza azzera le notifiche già inviate', () => {
    const t = repo.create({ title: 'X', dueDate: '2026-09-24', dueTime: '09:00' })
    db.prepare('UPDATE tasks SET reminded_at = ?, due_notified_at = ? WHERE id = ?').run('x', 'x', t.id)
    repo.update(t.id, { dueTime: '11:00' })
    expect(db.prepare('SELECT reminded_at, due_notified_at FROM tasks WHERE id = ?').get(t.id)).toEqual({
      reminded_at: null,
      due_notified_at: null
    })
  })

  it('task inesistente', () => {
    expect(() => repo.update(999, { title: 'Y' })).toThrow(NotFoundError)
  })
})

describe('completamento, rinvio, priorità', () => {
  it('completa e riapre', () => {
    const t = repo.create({ title: 'X' })
    advance(1000)
    const done = repo.complete(t.id)
    expect(done).toMatchObject({ status: 'done', completedAt: now.toISOString() })
    const open = repo.complete(t.id, false)
    expect(open).toMatchObject({ status: 'open', completedAt: null })
    expect(repo.detail(t.id)!.events.map((e) => e.type)).toEqual(['created', 'completed', 'reopened'])
  })

  it('completare due volte non duplica gli eventi', () => {
    const t = repo.create({ title: 'X' })
    repo.complete(t.id)
    repo.complete(t.id)
    expect(repo.detail(t.id)!.events).toHaveLength(2)
  })

  it('rimanda a domani mantenendo l\'orario', () => {
    const t = repo.create({ title: 'X', dueDate: '2026-09-20', dueTime: '09:30' })
    expect(repo.reschedule(t.id, 'tomorrow')).toMatchObject({ dueDate: '2026-09-25', dueTime: '09:30' })
  })

  it('rimanda alla settimana prossima (lunedì) e a oggi', () => {
    const t = repo.create({ title: 'X' })
    expect(repo.reschedule(t.id, 'nextWeek').dueDate).toBe('2026-09-28')
    expect(repo.reschedule(t.id, 'today').dueDate).toBe('2026-09-24')
  })

  it('cambia priorità', () => {
    const t = repo.create({ title: 'X' })
    expect(repo.setPriority(t.id, 3).priority).toBe(3)
  })
})

describe('eliminazione con annullamento', () => {
  it('elimina logicamente e ripristina', () => {
    const t = repo.create({ title: 'X' })
    repo.remove(t.id)
    expect(repo.get(t.id)).toBeNull()
    expect(repo.query()).toEqual([])
    const back = repo.restore(t.id)
    expect(back.title).toBe('X')
    expect(repo.detail(t.id)!.events.map((e) => e.type)).toEqual(['created', 'deleted', 'restored'])
  })

  it('ripristinare un task non eliminato è un errore', () => {
    const t = repo.create({ title: 'X' })
    expect(() => repo.restore(t.id)).toThrow(NotFoundError)
  })

  it('la pulizia rimuove definitivamente solo gli eliminati da più di 30 giorni', () => {
    const a = repo.create({ title: 'vecchio' })
    const b = repo.create({ title: 'recente' })
    repo.remove(a.id)
    advance(20 * 86_400_000)
    repo.remove(b.id)
    advance(11 * 86_400_000)
    expect(repo.purgeDeleted(30)).toBe(1)
    expect(() => repo.restore(a.id)).toThrow(NotFoundError)
    expect(repo.restore(b.id).title).toBe('recente')
  })
})

describe('query e ricerca', () => {
  beforeEach(() => {
    repo.create({ title: 'Preventivo cucina', notes: 'Chiedere a Marco il perché dei costi', areaId: 1, priority: 3, people: ['Marco'], tags: ['soldi'] })
    repo.create({ title: 'Prenotare veterinario', areaId: 3, people: ['Anna'] })
    repo.create({ title: 'Pagare bollette', areaId: 2, tags: ['soldi'] })
    const done = repo.create({ title: 'Preventivo bagno', areaId: 1 })
    repo.complete(done.id)
  })

  const q = (filter: Parameters<TasksRepo['query']>[0]): string[] => repo.query(filter).map((t) => t.title)

  it('filtri per stato, area, priorità, persona, tag', () => {
    expect(q({ status: 'open' })).toEqual(['Preventivo cucina', 'Prenotare veterinario', 'Pagare bollette'])
    expect(q({ status: 'done' })).toEqual(['Preventivo bagno'])
    expect(q({ areaId: 1 })).toEqual(['Preventivo cucina', 'Preventivo bagno'])
    expect(q({ priority: 3 })).toEqual(['Preventivo cucina'])
    expect(q({ person: 'marco' })).toEqual(['Preventivo cucina'])
    expect(q({ tag: 'soldi', status: 'open' })).toEqual(['Preventivo cucina', 'Pagare bollette'])
  })

  it('ricerca full-text su titolo e note, per prefisso e senza accenti', () => {
    expect(q({ search: 'prev' })).toEqual(['Preventivo cucina', 'Preventivo bagno'])
    expect(q({ search: 'perche' })).toEqual(['Preventivo cucina'])
    expect(q({ search: 'costi marco' })).toEqual(['Preventivo cucina'])
    expect(q({ search: 'VETERINARIO' })).toEqual(['Prenotare veterinario'])
    expect(q({ search: 'inesistente' })).toEqual([])
  })

  it('la ricerca segue le modifiche del titolo', () => {
    const t = repo.query({ search: 'bollette' })[0]
    repo.update(t.id, { title: 'Pagare luce' })
    expect(q({ search: 'bollette' })).toEqual([])
    expect(q({ search: 'luce' })).toEqual(['Pagare luce'])
  })

  it('caratteri speciali nella ricerca non causano errori', () => {
    expect(() => q({ search: '"prev AND OR ( * -' })).not.toThrow()
    expect(toFtsQuery('  - * ')).toBeNull()
    expect(toFtsQuery('ciao "mondo"')).toBe('"ciao"* "mondo"*')
  })

  it('storico dei completati', () => {
    const t = repo.query({ search: 'veterinario' })[0]
    advance(3600_000)
    repo.complete(t.id)
    const all = repo.listCompleted()
    expect(all.total).toBe(2)
    expect(all.items.map((x) => x.title)).toEqual(['Prenotare veterinario', 'Preventivo bagno'])
    expect(repo.listCompleted({ search: 'bagno' }).items.map((x) => x.title)).toEqual(['Preventivo bagno'])
    expect(repo.listCompleted({ from: '2026-09-24T08:30:00Z' }).total).toBe(1)
    expect(repo.listCompleted({ limit: 1, offset: 1 }).items.map((x) => x.title)).toEqual(['Preventivo bagno'])
  })

  it('facets con i conteggi dei task aperti', () => {
    const f = repo.facets()
    expect(f.areas.map((a) => [a.name, a.openCount])).toEqual([
      ['lavoro', 1],
      ['casa', 1],
      ['personale', 1]
    ])
    expect(f.people).toEqual([
      { name: 'Anna', openCount: 1 },
      { name: 'Marco', openCount: 1 }
    ])
    expect(f.tags).toEqual([{ name: 'soldi', openCount: 2 }])
  })
})

describe('aree', () => {
  it('rinomina, archivia, nomi duplicati', () => {
    const a = repo.areas.upsert({ name: 'Progetto' })
    expect(a.color).toBeTruthy()
    expect(repo.areas.upsert({ id: a.id, name: 'Progetto X' }).name).toBe('Progetto X')
    expect(() => repo.areas.upsert({ name: 'LAVORO' })).toThrow(ValidationError)
    repo.areas.upsert({ id: a.id, name: 'Progetto X', archived: true })
    expect(repo.areas.list().map((x) => x.name)).not.toContain('Progetto X')
    expect(repo.areas.list(true).map((x) => x.name)).toContain('Progetto X')
  })

  it("eliminare un'area lascia i task senza area", () => {
    const t = repo.create({ title: 'X', areaId: 1 })
    repo.areas.remove(1)
    expect(repo.get(t.id)?.areaId).toBeNull()
  })
})

describe('impostazioni', () => {
  it('predefinite, modifica parziale e persistenza', () => {
    const settings = new SettingsRepo(db)
    expect(settings.getAll()).toEqual({ ...DEFAULT_SETTINGS, defaultAreaId: 1 })
    settings.set({ theme: 'dark', notifications: { ...DEFAULT_SETTINGS.notifications, remindBeforeMin: 15 } })
    const reloaded = new SettingsRepo(db).getAll()
    expect(reloaded.theme).toBe('dark')
    expect(reloaded.notifications.remindBeforeMin).toBe(15)
    expect(reloaded.notifications.enabled).toBe(true)
    expect(reloaded.globalHotkey).toBe(DEFAULT_SETTINGS.globalHotkey)
  })
})

describe('backup JSON', () => {
  function seed(): void {
    const area = repo.areas.upsert({ name: 'Progetto', color: '#123456' })
    const a = repo.create({ title: 'Uno', notes: 'n', areaId: area.id, dueDate: '2026-09-25', dueTime: '12:00', people: ['Marco'], tags: ['x'] })
    repo.create({ title: 'Due', priority: 3, parentId: a.id })
    const c = repo.create({ title: 'Tre' })
    repo.complete(c.id)
    const d = repo.create({ title: 'Eliminato' })
    repo.remove(d.id)
    new SettingsRepo(db).set({ theme: 'dark', firstRunDone: true })
  }

  it('esporta e reimporta gli stessi dati in un database vuoto', () => {
    seed()
    const backup = JSON.parse(JSON.stringify(exportBackup(db, now)))
    expect(backup.tasks.map((t: { title: string }) => t.title)).toEqual(['Uno', 'Due', 'Tre'])
    expect(backup.settings.firstRunDone).toBeUndefined()

    const other = openDatabase(':memory:').db
    const otherRepo = new TasksRepo(other, () => now)
    expect(importBackup(other, backup, now)).toEqual({ tasks: 3, areas: 4 })

    const all = (r: TasksRepo) => [1, 2, 3].map((id) => r.get(id))
    expect(all(otherRepo)).toEqual(all(repo))
    expect(otherRepo.get(2)?.parentId).toBe(1)
    expect(otherRepo.detail(1)?.events.map((e) => e.type)).toEqual(['created'])
    expect(otherRepo.query({ search: 'uno' }).map((t) => t.title)).toEqual(['Uno'])
    expect(new SettingsRepo(other).getAll()).toMatchObject({ theme: 'dark', firstRunDone: false })
  })

  it("l'import sostituisce i dati esistenti", () => {
    seed()
    const backup = exportBackup(db, now)
    const other = openDatabase(':memory:').db
    const otherRepo = new TasksRepo(other, () => now)
    otherRepo.create({ title: 'Da sovrascrivere' })
    importBackup(other, backup, now)
    expect(otherRepo.query().map((t) => t.title)).toEqual(['Uno', 'Tre'])
  })

  it('segna come già notificati i task con orario passato', () => {
    repo.create({ title: 'Passato', dueDate: '2026-09-24', dueTime: '09:00' })
    repo.create({ title: 'Futuro', dueDate: '2026-09-24', dueTime: '18:00' })
    const other = openDatabase(':memory:').db
    importBackup(other, exportBackup(db, now), now)
    const rows = other.prepare('SELECT title, due_notified_at FROM tasks ORDER BY id').all()
    expect(rows).toEqual([
      { title: 'Passato', due_notified_at: now.toISOString() },
      { title: 'Futuro', due_notified_at: null }
    ])
  })

  it('un backup non valido viene rifiutato senza toccare i dati', () => {
    seed()
    const before = repo.query().map((t) => t.title)
    const bad = { ...exportBackup(db, now), tasks: [{ id: 1, title: '' }] }
    expect(() => importBackup(db, bad, now)).toThrow(ValidationError)
    expect(() => importBackup(db, { format: 'altro' }, now)).toThrow(/formato sconosciuto/)
    expect(() => importBackup(db, null, now)).toThrow(ValidationError)
    expect(repo.query().map((t) => t.title)).toEqual(before)
  })

  it('riferimenti incoerenti vengono rifiutati', () => {
    const backup = exportBackup(db, now)
    const task = {
      id: 1, parentId: 7, title: 'X', notes: null, status: 'open', priority: 2, areaId: null, dueDate: null,
      dueTime: null, sortOrder: 0, sourceText: null, createdAt: now.toISOString(), updatedAt: now.toISOString(),
      lastActivityAt: now.toISOString(), completedAt: null, people: [], tags: [], events: []
    }
    expect(() => importBackup(db, { ...backup, tasks: [task] }, now)).toThrow(/task padre inesistente/)
    expect(() => importBackup(db, { ...backup, tasks: [{ ...task, parentId: null, areaId: 99 }] }, now)).toThrow(/area inesistente/)
  })
})
