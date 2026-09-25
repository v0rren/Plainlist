import { describe, expect, it } from 'vitest'
import { buildSummary, isStale, suggestionOrder, suggestionReason } from '../src/core/summary'
import { makeTask, titles } from './helpers'

const NOW = new Date('2026-09-24T08:00:00Z')
const TODAY = '2026-09-24'
const RECENT = '2026-09-23T08:00:00.000Z'
const OLD = '2026-09-01T08:00:00.000Z'

describe('buildSummary: sezioni', () => {
  const tasks = [
    makeTask({ title: 'scaduto vecchio', dueDate: '2026-09-20', lastActivityAt: OLD }),
    makeTask({ title: 'scaduto ieri', dueDate: '2026-09-23', priority: 3, lastActivityAt: RECENT }),
    makeTask({ title: 'oggi 15', dueDate: TODAY, dueTime: '15:00', lastActivityAt: RECENT }),
    makeTask({ title: 'oggi alta', dueDate: TODAY, priority: 3, lastActivityAt: RECENT }),
    makeTask({ title: 'venerdì', dueDate: '2026-09-25', lastActivityAt: RECENT }),
    makeTask({ title: 'venerdì alta', dueDate: '2026-09-25', priority: 3, lastActivityAt: RECENT }),
    makeTask({ title: 'lunedì', dueDate: '2026-09-28', lastActivityAt: RECENT }),
    makeTask({ title: 'lontano recente', dueDate: '2026-12-01', lastActivityAt: RECENT }),
    makeTask({ title: 'lontano fermo', dueDate: '2026-12-01', lastActivityAt: OLD }),
    makeTask({ title: 'senza data', lastActivityAt: RECENT }),
    makeTask({ title: 'senza data alta', priority: 3, lastActivityAt: RECENT }),
    makeTask({ title: 'senza data fermo', lastActivityAt: OLD }),
    makeTask({ title: 'fatto', status: 'done', dueDate: '2026-09-20', completedAt: RECENT })
  ]
  const s = buildSummary(tasks, { now: NOW })

  it('scaduti dal più vecchio', () => {
    expect(titles(s.overdue)).toEqual(['scaduto vecchio', 'scaduto ieri'])
  })

  it('oggi: prima con orario, poi per priorità', () => {
    expect(titles(s.dueToday)).toEqual(['oggi 15', 'oggi alta'])
  })

  it('prossimi 7 giorni raggruppati per giorno', () => {
    expect(s.upcoming.map((d) => [d.label, titles(d.tasks)])).toEqual([
      ['Venerdì 25 settembre', ['venerdì alta', 'venerdì']],
      ['Lunedì 28 settembre', ['lunedì']]
    ])
  })

  it('senza scadenza per priorità, esclusi i fermi', () => {
    expect(titles(s.noDue)).toEqual(['senza data alta', 'senza data'])
  })

  it('fermi: solo quelli non già elencati sopra', () => {
    expect(titles(s.stale)).toEqual(['lontano fermo', 'senza data fermo'])
  })

  it('i task lontani e attivi non compaiono, i completati nemmeno', () => {
    const all = [...s.overdue, ...s.dueToday, ...s.upcoming.flatMap((d) => d.tasks), ...s.noDue, ...s.stale]
    expect(titles(all)).not.toContain('lontano recente')
    expect(titles(all)).not.toContain('fatto')
    expect(new Set(all).size).toBe(all.length)
  })

  it('conteggi', () => {
    expect(s.counts).toEqual({ open: 12, overdue: 2, today: 2, upcoming: 3, noDue: 2, stale: 2, waiting: 0 })
  })
})

describe('buildSummary: filtri', () => {
  const tasks = [
    makeTask({ title: 'lavoro marco', areaId: 1, people: ['Marco'], dueDate: TODAY }),
    makeTask({ title: 'lavoro', areaId: 1, dueDate: TODAY }),
    makeTask({ title: 'casa marco', areaId: 2, people: ['Marco', 'Anna'], dueDate: TODAY })
  ]

  it('per area', () => {
    expect(titles(buildSummary(tasks, { now: NOW, areaId: 1 }).dueToday)).toEqual(['lavoro marco', 'lavoro'])
  })

  it('per persona, senza distinguere maiuscole', () => {
    expect(titles(buildSummary(tasks, { now: NOW, person: 'marco' }).dueToday)).toEqual(['lavoro marco', 'casa marco'])
  })

  it('area e persona insieme', () => {
    expect(titles(buildSummary(tasks, { now: NOW, areaId: 2, person: 'Marco' }).dueToday)).toEqual(['casa marco'])
  })
})

describe('suggerimento', () => {
  it('scaduti alti, poi oggi alti per orario, poi il resto per scadenza, poi senza scadenza', () => {
    const tasks = [
      makeTask({ title: 'senza data alta', priority: 3 }),
      makeTask({ title: 'domani bassa', dueDate: '2026-09-25', priority: 1 }),
      makeTask({ title: 'oggi alta senza ora', dueDate: TODAY, priority: 3 }),
      makeTask({ title: 'scaduto medio', dueDate: '2026-09-10', priority: 2 }),
      makeTask({ title: 'oggi alta 9', dueDate: TODAY, dueTime: '09:00', priority: 3 }),
      makeTask({ title: 'scaduto alto recente', dueDate: '2026-09-22', priority: 3 }),
      makeTask({ title: 'scaduto alto vecchio', dueDate: '2026-09-15', priority: 3 }),
      makeTask({ title: 'oggi media', dueDate: TODAY, priority: 2 }),
      makeTask({ title: 'senza data bassa', priority: 1 })
    ]
    expect(titles(suggestionOrder(tasks, TODAY))).toEqual([
      'scaduto alto vecchio',
      'scaduto alto recente',
      'oggi alta 9',
      'oggi alta senza ora',
      'scaduto medio',
      'oggi media',
      'domani bassa',
      'senza data alta',
      'senza data bassa'
    ])
  })

  it('il riepilogo propone il primo e i due successivi, con il motivo', () => {
    const tasks = [
      makeTask({ title: 'A', dueDate: '2026-09-22', priority: 3 }),
      makeTask({ title: 'B', dueDate: TODAY, dueTime: '15:00', priority: 3 }),
      makeTask({ title: 'C', dueDate: '2026-09-25' }),
      makeTask({ title: 'D' })
    ]
    const { suggestion } = buildSummary(tasks, { now: NOW })
    expect(suggestion?.first).toEqual({ task: tasks[0], reason: 'scaduto da 2 giorni, priorità alta' })
    expect(suggestion?.next.map((n) => n.reason)).toEqual([
      'in scadenza oggi alle 15:00, priorità alta',
      'scadenza domani, priorità media'
    ])
  })

  it('nessun task aperto: nessun suggerimento', () => {
    expect(buildSummary([makeTask({ status: 'done' })], { now: NOW }).suggestion).toBeNull()
  })

  it.each([
    [{ dueDate: '2026-09-23', priority: 1 as const }, 'scaduto da 1 giorno, priorità bassa'],
    [{ dueDate: TODAY }, 'in scadenza oggi, priorità media'],
    [{ dueDate: '2026-10-02', dueTime: '12:00' }, 'scadenza ven 2 ott 12:00, priorità media'],
    [{}, 'senza scadenza, priorità media']
  ])('motivo %o', (overrides, expected) => {
    expect(suggestionReason(makeTask(overrides), TODAY)).toBe(expected)
  })
})

describe('isStale', () => {
  it('fermo dopo più di 14 giorni esatti', () => {
    const exactly = new Date(NOW.getTime() - 14 * 86_400_000).toISOString()
    const more = new Date(NOW.getTime() - 14 * 86_400_000 - 60_000).toISOString()
    expect(isStale(makeTask({ lastActivityAt: exactly }), NOW)).toBe(false)
    expect(isStale(makeTask({ lastActivityAt: more }), NOW)).toBe(true)
  })

  it('soglia configurabile', () => {
    expect(isStale(makeTask({ lastActivityAt: RECENT }), NOW, 0)).toBe(true)
  })
})
