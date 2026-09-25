import { beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../src/main/data'
import { TaskService } from '../src/main/services/taskService'

let now: Date
let service: TaskService

beforeEach(() => {
  now = new Date('2026-09-24T08:00:00Z')
  service = new TaskService(openDatabase(':memory:').db, () => now)
})

describe('quickAdd', () => {
  it('interpreta il testo e salva il task', () => {
    const t = service.quickAdd('Mandare preventivo @Marco venerdì alle 12 #Lavoro !alta +offerte')
    expect(t).toMatchObject({
      title: 'Mandare preventivo',
      dueDate: '2026-09-25',
      dueTime: '12:00',
      priority: 3,
      areaName: 'lavoro',
      people: ['Marco'],
      tags: ['offerte'],
      sourceText: 'Mandare preventivo @Marco venerdì alle 12 #Lavoro !alta +offerte'
    })
  })

  it('riusa persone esistenti e crea aree nuove', () => {
    service.quickAdd('Uno @Anna_Bianchi')
    const t = service.quickAdd('Due @anna_bianchi #ProgettoX')
    expect(t.people).toEqual(['Anna Bianchi'])
    expect(t.areaName).toBe('ProgettoX')
    expect(service.facets().people).toHaveLength(1)
  })

  it('senza #area il task va in lavoro', () => {
    expect(service.quickAdd('Report trimestrale').areaName).toBe('lavoro')
  })

  it('con "Nessuna" come area predefinita il task resta senza area', () => {
    service.settings.set({ defaultAreaId: null })
    expect(service.quickAdd('Spesa').areaId).toBeNull()
  })

  it("usa l'area predefinita scelta nelle impostazioni", () => {
    service.settings.set({ defaultAreaId: 2 })
    expect(service.quickAdd('Spesa').areaName).toBe('casa')
    expect(service.quickAdd('Report #lavoro').areaName).toBe('lavoro')
  })

  it("ignora un'area predefinita non più esistente", () => {
    service.settings.set({ defaultAreaId: 99 })
    expect(service.quickAdd('Spesa').areaId).toBeNull()
  })

  it('priorità media se non indicata', () => {
    expect(service.quickAdd('X').priority).toBe(2)
  })

  it('rifiuta un testo senza titolo', () => {
    expect(() => service.quickAdd('domani !alta')).toThrow('Il titolo è obbligatorio')
  })
})

describe('viste della lista', () => {
  beforeEach(() => {
    service.settings.set({ defaultAreaId: null })
    service.quickAdd('Scaduto 22/09/2026 #lavoro')
    service.quickAdd('Oggi oggi #casa')
    service.quickAdd('Domani domani @Marco')
    service.quickAdd('Lunedì lunedì !alta')
    service.quickAdd('Lontano 15/10')
    service.quickAdd('Senza data')
    const done = service.quickAdd('Fatto')
    service.tasks.complete(done.id)
    const old = service.quickAdd('Fatto tempo fa')
    service.tasks.complete(old.id)
    service.tasks.update(old.id, {})
    service.db.prepare("UPDATE tasks SET completed_at = '2026-09-01T08:00:00.000Z' WHERE id = ?").run(old.id)
  })

  const titles = (view: Parameters<TaskService['list']>[0]['view'], extra = {}) =>
    service.list({ view, ...extra }).groups.flatMap((g) => g.tasks.map((t) => t.title))

  it('tutti: aperti raggruppati più i completati recenti', () => {
    const groups = service.list({ view: 'all' }).groups
    expect(Object.fromEntries(groups.map((g) => [g.id, g.tasks.map((t) => t.title)]))).toEqual({
      overdue: ['Scaduto'],
      today: ['Oggi'],
      upcoming: ['Lunedì', 'Domani'],
      later: ['Lontano'],
      noDue: ['Senza data'],
      completed: ['Fatto']
    })
  })

  it('oggi comprende gli scaduti', () => {
    expect(titles('today')).toEqual(['Scaduto', 'Oggi'])
  })

  it('domani, prossimi giorni, senza scadenza', () => {
    expect(titles('tomorrow')).toEqual(['Domani'])
    expect(titles('upcoming')).toEqual(['Lunedì', 'Domani'])
    expect(titles('noDue')).toEqual(['Senza data'])
  })

  it('filtri combinati con la vista', () => {
    expect(titles('all', { areaId: 1 })).toEqual(['Scaduto'])
    expect(titles('all', { person: 'marco' })).toEqual(['Domani'])
    expect(titles('all', { priority: 3 })).toEqual(['Lunedì'])
    expect(titles('all', { search: 'lont' })).toEqual(['Lontano'])
    expect(titles('all', { search: '   ' })).toHaveLength(7)
  })

  it('conteggi per la barra laterale', () => {
    expect(service.facets().counts).toEqual({ all: 6, today: 2, tomorrow: 1, upcoming: 2, noDue: 1, waiting: 0, scheduled: 0, myDay: 0 })
  })

  it("l'orizzonte dei prossimi giorni segue le impostazioni", () => {
    service.settings.set({ upcomingDays: 30 })
    expect(titles('upcoming')).toEqual(['Lunedì', 'Domani', 'Lontano'])
  })

  it('riepilogo filtrato', () => {
    const s = service.summary({ areaId: 1 })
    expect(s.overdue.map((t) => t.title)).toEqual(['Scaduto'])
    expect(s.counts.open).toBe(1)
    expect(s.suggestion?.first.reason).toBe('scaduto da 2 giorni, priorità media')
  })
})
