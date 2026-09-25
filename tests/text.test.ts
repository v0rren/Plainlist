import { describe, expect, it } from 'vitest'
import { buildPersonOverview } from '../src/core/person'
import { buildSummary } from '../src/core/summary'
import { personToText, summaryToText, taskLine } from '../src/core/text'
import { makeTask } from './helpers'

const NOW = new Date('2026-09-24T08:00:00Z')
const TODAY = '2026-09-24'
const RECENT = '2026-09-23T08:00:00.000Z'

describe('taskLine', () => {
  it('dettagli nell\'ordine: scadenza, persone, area, stima, ripetizione, priorità', () => {
    const t = makeTask({
      title: 'Report',
      dueDate: '2026-09-25',
      dueTime: '12:00',
      people: ['Marco'],
      areaName: 'lavoro',
      estimateMin: 90,
      priority: 3,
      recurrence: { freq: 'weekly', interval: 1, byWeekday: [5], anchor: 'schedule' }
    })
    expect(taskLine(t, TODAY)).toBe('• Report — domani 12:00 · @Marco · #lavoro · ~1h30 · ogni venerdì · priorità alta')
  })

  it('senza dettagli solo il titolo', () => {
    expect(taskLine(makeTask({ title: 'Semplice' }), TODAY)).toBe('• Semplice')
  })
})

describe('summaryToText', () => {
  it('riepilogo completo pronto da incollare', () => {
    const tasks = [
      makeTask({ title: 'Scaduto', dueDate: '2026-09-22', priority: 3, lastActivityAt: RECENT }),
      makeTask({ title: 'Chiamata', dueDate: TODAY, dueTime: '15:00', lastActivityAt: RECENT }),
      makeTask({ title: 'Preventivo', dueDate: '2026-09-25', people: ['Marco'], lastActivityAt: RECENT }),
      makeTask({ title: 'Idea', lastActivityAt: RECENT }),
      makeTask({ title: 'Budget', waiting: true, people: ['Anna'], lastActivityAt: RECENT })
    ]
    const text = summaryToText(buildSummary(tasks, { now: NOW }), ['#lavoro'])
    expect(text).toBe(
      [
        'Update · giovedì 24 settembre',
        'Filtri: #lavoro',
        '',
        'SCADUTI (1)',
        '• Scaduto — mar 22 set · priorità alta',
        '',
        'OGGI (1)',
        '• Chiamata — oggi 15:00',
        '',
        'PROSSIMI 7 GIORNI',
        'Venerdì 25 settembre',
        '• Preventivo — domani · @Marco',
        '',
        'SENZA SCADENZA',
        '• Idea',
        '',
        'IN ATTESA',
        '• Budget — @Anna',
        '',
        'Da dove iniziare: Scaduto (scaduto da 2 giorni, priorità alta).',
        'Poi: Chiamata, Preventivo.'
      ].join('\n')
    )
  })

  it('niente di aperto', () => {
    expect(summaryToText(buildSummary([], { now: NOW }))).toBe('Update · giovedì 24 settembre\n\nNessun task aperto.')
  })
})

describe('personToText', () => {
  it('testo per il 1:1, senza ripetere il nome in ogni riga', () => {
    const tasks = [
      makeTask({ title: 'Budget Q4', waiting: true, people: ['Marco'] }),
      makeTask({ title: 'Feedback', dueDate: '2026-09-25', people: ['Marco', 'Anna'] }),
      makeTask({ title: 'Onboarding', status: 'done', completedAt: RECENT, people: ['Marco'] }),
      makeTask({ title: 'Altro', people: ['Anna'] })
    ]
    expect(personToText(buildPersonOverview(tasks, 'Marco', NOW))).toBe(
      [
        '1:1 con Marco · giovedì 24 settembre',
        '',
        'IN ATTESA DA MARCO',
        '• Budget Q4',
        '',
        'PROSSIMI 7 GIORNI',
        '• Feedback — domani',
        '',
        'COMPLETATI DI RECENTE',
        '✓ Onboarding'
      ].join('\n')
    )
  })

  it('nessun task con la persona', () => {
    expect(personToText(buildPersonOverview([], 'Luca', NOW))).toBe(
      '1:1 con Luca · giovedì 24 settembre\n\nNiente di aperto con Luca.'
    )
  })
})
