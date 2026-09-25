import { describe, expect, it } from 'vitest'
import { groupOf, groupTasks } from '../src/core/grouping'
import { byDueThenPriority, byPriorityThenDue } from '../src/core/sorting'
import { makeTask, titles } from './helpers'

const TODAY = '2026-09-24'

describe('groupOf', () => {
  it.each([
    [{ dueDate: '2026-09-23' }, 'overdue'],
    [{ dueDate: '2025-01-01' }, 'overdue'],
    [{ dueDate: '2026-09-24' }, 'today'],
    [{ dueDate: '2026-09-24', dueTime: '08:00' }, 'today'],
    [{ dueDate: '2026-09-25' }, 'upcoming'],
    [{ dueDate: '2026-10-01' }, 'upcoming'],
    [{ dueDate: '2026-10-02' }, 'later'],
    [{ dueDate: null }, 'noDue'],
    [{ dueDate: '2026-09-01', status: 'done' as const }, 'completed']
  ])('%o → %s', (overrides, expected) => {
    expect(groupOf(makeTask(overrides), TODAY)).toBe(expected)
  })

  it("l'orizzonte dei prossimi giorni è configurabile", () => {
    expect(groupOf(makeTask({ dueDate: '2026-09-28' }), TODAY, 3)).toBe('later')
  })
})

describe('groupTasks', () => {
  it('restituisce sempre tutti i gruppi nell\'ordine giusto', () => {
    const groups = groupTasks([], TODAY)
    expect(groups.map((g) => g.label)).toEqual([
      'Scaduti',
      'Oggi',
      'Prossimi 7 giorni',
      'Più avanti',
      'Senza scadenza',
      'Completati'
    ])
    expect(groups.every((g) => g.tasks.length === 0)).toBe(true)
  })

  it('dentro ogni gruppo ordina per priorità e poi per scadenza', () => {
    const tasks = [
      makeTask({ title: 'media 25', dueDate: '2026-09-25', priority: 2 }),
      makeTask({ title: 'alta 30', dueDate: '2026-09-30', priority: 3 }),
      makeTask({ title: 'alta 28', dueDate: '2026-09-28', priority: 3 }),
      makeTask({ title: 'bassa 26', dueDate: '2026-09-26', priority: 1 })
    ]
    const upcoming = groupTasks(tasks, TODAY).find((g) => g.id === 'upcoming')!
    expect(titles(upcoming.tasks)).toEqual(['alta 28', 'alta 30', 'media 25', 'bassa 26'])
  })

  it('a parità di priorità e giorno, prima quelli con orario', () => {
    const tasks = [
      makeTask({ title: 'senza ora', dueDate: TODAY }),
      makeTask({ title: 'ore 15', dueDate: TODAY, dueTime: '15:00' }),
      makeTask({ title: 'ore 9', dueDate: TODAY, dueTime: '09:00' })
    ]
    expect(titles(groupTasks(tasks, TODAY)[1].tasks)).toEqual(['ore 9', 'ore 15', 'senza ora'])
  })

  it('completati dal più recente', () => {
    const tasks = [
      makeTask({ title: 'vecchio', status: 'done', completedAt: '2026-09-01T10:00:00Z' }),
      makeTask({ title: 'recente', status: 'done', completedAt: '2026-09-23T10:00:00Z' })
    ]
    expect(titles(groupTasks(tasks, TODAY)[5].tasks)).toEqual(['recente', 'vecchio'])
  })
})

describe('comparatori', () => {
  it('senza scadenza va in fondo', () => {
    const a = makeTask({ title: 'a', priority: 2 })
    const b = makeTask({ title: 'b', priority: 2, dueDate: '2030-01-01' })
    expect(titles([a, b].sort(byPriorityThenDue))).toEqual(['b', 'a'])
    expect(titles([a, b].sort(byDueThenPriority))).toEqual(['b', 'a'])
  })

  it('a parità di tutto, ordine di creazione', () => {
    const a = makeTask({ title: 'a', createdAt: '2026-09-02T00:00:00Z' })
    const b = makeTask({ title: 'b', createdAt: '2026-09-01T00:00:00Z' })
    expect(titles([a, b].sort(byPriorityThenDue))).toEqual(['b', 'a'])
  })
})
