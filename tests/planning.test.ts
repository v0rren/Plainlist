import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, importBackup, migrate, openDatabase } from '../src/main/data'
import { MIGRATIONS } from '../src/main/data/migrations'
import { TaskService } from '../src/main/services/taskService'

let now: Date
let service: TaskService

const days = (n: number): void => {
  now = new Date(now.getTime() + n * 86_400_000)
}

beforeEach(() => {
  now = new Date('2026-09-24T08:00:00Z') // giovedì 24/09/2026, 10:00 a Roma
  service = new TaskService(openDatabase(':memory:').db, () => now)
  service.settings.set({ defaultAreaId: null })
})

const open = () => service.tasks.query({ status: 'open' })

describe('task ricorrenti', () => {
  it('senza data prendono la prima occorrenza', () => {
    const t = service.quickAdd('Report ogni lunedì')
    expect(t.dueDate).toBe('2026-09-28')
    expect(t.recurrence).toEqual({ freq: 'weekly', interval: 1, byWeekday: [1], anchor: 'schedule' })
  })

  it('una ripetizione mensile senza giorno prende quello della scadenza', () => {
    const t = service.tasks.create({ title: 'X', dueDate: '2026-10-31', recurrence: { freq: 'monthly', interval: 1, anchor: 'schedule' } })
    expect(t.recurrence?.byMonthDay).toBe(31)
  })

  it('completando nasce la prossima occorrenza con gli stessi dati', () => {
    const t = service.quickAdd('Revisione KPI @Marco ogni lunedì alle 9 ~1h #lavoro !alta +kpi')
    service.tasks.complete(t.id)
    const next = open()
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({
      title: 'Revisione KPI',
      dueDate: '2026-10-05',
      dueTime: '09:00',
      dueAt: '2026-10-05T07:00:00.000Z',
      priority: 3,
      areaName: 'lavoro',
      people: ['Marco'],
      tags: ['kpi'],
      estimateMin: 60,
      recurrenceId: t.recurrenceId,
      status: 'open'
    })
    expect(service.tasks.get(t.id)?.status).toBe('done')
  })

  it('in ritardo salta alla prossima data futura', () => {
    const t = service.tasks.create({
      title: 'X',
      dueDate: '2026-09-07',
      recurrence: { freq: 'weekly', interval: 1, byWeekday: [1], anchor: 'schedule' }
    })
    service.tasks.complete(t.id)
    expect(open()[0].dueDate).toBe('2026-09-28')
  })

  it('dal completamento riparte da oggi', () => {
    const t = service.quickAdd('Piante ogni 7 giorni dal completamento')
    days(3)
    service.tasks.complete(t.id)
    expect(open()[0].dueDate).toBe('2026-10-04')
  })

  it('riaprendo subito, l\'occorrenza generata sparisce', () => {
    const t = service.quickAdd('Report ogni lunedì')
    service.tasks.complete(t.id)
    expect(open()).toHaveLength(1)
    service.tasks.complete(t.id, false)
    expect(open().map((x) => x.id)).toEqual([t.id])
  })

  it('se l\'occorrenza generata è già stata modificata, riaprire non la tocca', () => {
    const t = service.quickAdd('Report ogni lunedì')
    service.tasks.complete(t.id)
    const next = open()[0]
    now = new Date(now.getTime() + 60_000)
    service.tasks.update(next.id, { notes: 'già iniziato' })
    service.tasks.complete(t.id, false)
    expect(open()).toHaveLength(2)
  })

  it('una serie ha al massimo un\'occorrenza aperta', () => {
    const t = service.quickAdd('Report ogni lunedì')
    service.tasks.complete(t.id)
    service.tasks.complete(t.id, false)
    service.tasks.complete(t.id)
    expect(open()).toHaveLength(1)
  })

  it('togliere la ripetizione ferma la serie', () => {
    const t = service.quickAdd('Report ogni lunedì')
    service.tasks.update(t.id, { recurrence: null })
    service.tasks.complete(t.id)
    expect(open()).toHaveLength(0)
  })

  it('aggiungere una ripetizione a un task senza data imposta la prima occorrenza', () => {
    const t = service.quickAdd('Report')
    const u = service.tasks.update(t.id, { recurrence: { freq: 'monthly', interval: 1, byMonthDay: 5, anchor: 'schedule' } })
    expect(u.dueDate).toBe('2026-10-05')
    expect(u.recurrence?.byMonthDay).toBe(5)
  })

  it('cambiare la ripetizione aggiorna la regola esistente', () => {
    const t = service.quickAdd('Report ogni lunedì')
    const u = service.tasks.update(t.id, { recurrence: { freq: 'weekly', interval: 1, byWeekday: [5], anchor: 'schedule' } })
    expect(u.recurrenceId).toBe(t.recurrenceId)
    expect(u.recurrence?.byWeekday).toEqual([5])
  })
})

describe('data di inizio', () => {
  it('nasconde il task fino a quel giorno', () => {
    service.quickAdd('Bilancio da lunedì')
    service.quickAdd('Visibile')
    const titles = (view: 'all' | 'scheduled') => service.list({ view }).groups.flatMap((g) => g.tasks.map((t) => t.title))
    expect(titles('all')).toEqual(['Visibile'])
    expect(titles('scheduled')).toEqual(['Bilancio'])
    expect(service.facets().counts).toMatchObject({ all: 1, scheduled: 1 })
    expect(service.summary({}).counts.open).toBe(1)

    days(4)
    expect(titles('all')).toEqual(['Bilancio', 'Visibile'])
    expect(titles('scheduled')).toEqual([])
  })
})

describe('in attesa', () => {
  it('vista dedicata, sezione del riepilogo, escluso dal suggerimento', () => {
    service.quickAdd('Report da Marco @Marco +attesa oggi !alta')
    service.quickAdd('Mio compito domani')
    expect(service.list({ view: 'waiting' }).groups.flatMap((g) => g.tasks.map((t) => t.title))).toEqual(['Report da Marco'])
    const s = service.summary({})
    expect(s.waiting.map((t) => t.title)).toEqual(['Report da Marco'])
    expect(s.dueToday).toEqual([])
    expect(s.suggestion?.first.task.title).toBe('Mio compito')
    expect(s.counts).toMatchObject({ waiting: 1, open: 2 })
  })
})

describe('il mio giorno', () => {
  it('aggiungere, stime, suggerimenti e reset il giorno dopo', () => {
    service.settings.set({ workdayMinutes: 240 })
    const a = service.quickAdd('Scrivere report ~2h domani')
    const b = service.quickAdd('Telefonata ~30m')
    const c = service.quickAdd('Senza stima')
    service.quickAdd('Scaduto 20/09/2026')
    service.quickAdd('Oggi oggi')
    service.quickAdd('Delegato oggi +attesa')
    service.quickAdd('Più avanti da lunedì oggi')
    service.quickAdd('Importante !alta')

    for (const t of [a, b, c]) service.tasks.setMyDay(t.id, true)
    service.tasks.complete(b.id)

    const day = service.myDay()
    expect(day.planned.map((t) => t.title)).toEqual(['Scrivere report', 'Senza stima'])
    expect(day.done.map((t) => t.title)).toEqual(['Telefonata'])
    expect(day.estimate).toEqual({ plannedMin: 120, unestimated: 1, doneMin: 30, capacityMin: 240 })
    expect(day.suggestions.overdue.map((t) => t.title)).toEqual(['Scaduto'])
    expect(day.suggestions.today.map((t) => t.title)).toEqual(['Oggi'])
    expect(day.suggestions.tomorrow).toEqual([])
    expect(day.suggestions.important.map((t) => t.title)).toEqual(['Importante'])
    expect(service.facets().counts.myDay).toBe(2)

    days(1)
    expect(service.myDay().planned).toEqual([])
    expect(service.myDay().suggestions.today.map((t) => t.title)).toEqual(['Scrivere report'])
  })

  it('togliere dal mio giorno', () => {
    const t = service.quickAdd('X')
    service.tasks.setMyDay(t.id, true)
    service.tasks.setMyDay(t.id, false)
    expect(service.myDay().planned).toEqual([])
  })
})

describe('persone', () => {
  it('vista per il 1:1', () => {
    service.quickAdd('Aspetto il budget @Marco +attesa')
    service.quickAdd('Feedback a @Marco venerdì')
    service.quickAdd('Scaduto con @marco 20/09/2026')
    service.quickAdd('Altro @Anna')
    const done = service.quickAdd('Fatto con @Marco')
    service.tasks.complete(done.id)

    const p = service.person('Marco')
    expect(p.waiting.map((t) => t.title)).toEqual(['Aspetto il budget'])
    expect(p.open.map((g) => [g.id, g.tasks.map((t) => t.title)])).toEqual([
      ['overdue', ['Scaduto con Marco']],
      ['upcoming', ['Feedback a Marco']]
    ])
    expect(p.recentDone.map((t) => t.title)).toEqual(['Fatto con Marco'])
    expect(p.counts).toEqual({ open: 3, waiting: 1, overdue: 1 })
  })
})

describe('backup e migrazioni', () => {
  it('il backup v2 conserva ripetizioni, inizio, stima, attesa e mio giorno', () => {
    const t = service.quickAdd('Report @Marco ogni lunedì ~1h +attesa da lunedì')
    service.tasks.setMyDay(t.id, true)
    service.tasks.complete(t.id)
    const data = JSON.parse(JSON.stringify(exportBackup(service.db, now)))
    expect(data.version).toBe(2)

    const other = new TaskService(openDatabase(':memory:').db, () => now)
    importBackup(other.db, data, now)
    const [done, next] = [other.tasks.get(t.id)!, other.tasks.query({ status: 'open' })[0]]
    expect(done).toMatchObject({ status: 'done', startDate: '2026-09-28', estimateMin: 60, waiting: true, myDayDate: '2026-09-24' })
    expect(next.recurrence).toEqual(t.recurrence)
    expect(next.recurrenceId).toBe(done.recurrenceId)

    other.tasks.complete(next.id)
    expect(other.tasks.query({ status: 'open' })).toHaveLength(1)
  })

  it('un backup v1 si importa ancora', () => {
    const v1 = {
      format: 'plainlist-backup',
      version: 1,
      exportedAt: now.toISOString(),
      areas: [{ id: 1, name: 'lavoro', color: null, sortOrder: 0, archived: false }],
      tasks: [
        {
          id: 1, parentId: null, title: 'Vecchio', notes: null, status: 'open', priority: 2, areaId: 1,
          dueDate: null, dueTime: null, sortOrder: 0, sourceText: null, createdAt: now.toISOString(),
          updatedAt: now.toISOString(), lastActivityAt: now.toISOString(), completedAt: null,
          people: [], tags: [], events: []
        }
      ],
      settings: {}
    }
    importBackup(service.db, v1, now)
    expect(service.tasks.get(1)).toMatchObject({ title: 'Vecchio', waiting: false, estimateMin: null, recurrence: null })
  })

  it('la migrazione 3 conserva i task esistenti', () => {
    const { db } = openDatabase(':memory:', { migrations: MIGRATIONS.filter((m) => m.version <= 2) })
    db.prepare(
      `INSERT INTO tasks (title, created_at, updated_at, last_activity_at) VALUES ('Prima', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z')`
    ).run()
    migrate(db)
    const svc = new TaskService(db, () => now)
    expect(svc.tasks.get(1)).toMatchObject({ title: 'Prima', startDate: null, estimateMin: null, waiting: false, myDayDate: null })
  })
})
