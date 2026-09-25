import { describe, expect, it } from 'vitest'
import { formatEstimate, parseQuickInput } from '../src/core/parser'

// Giovedì 24 settembre 2026, 10:00 a Roma
const NOW = new Date('2026-09-24T08:00:00Z')
const parse = (text: string) => parseQuickInput(text, { now: NOW })

describe('ripetizioni', () => {
  it.each([
    ['Report ogni lunedì', 'Report', { freq: 'weekly', interval: 1, byWeekday: [1], anchor: 'schedule' }, '2026-09-28'],
    ['Palestra ogni lunedì e giovedì', 'Palestra', { freq: 'weekly', interval: 1, byWeekday: [1, 4], anchor: 'schedule' }, '2026-09-24'],
    ['Palestra ogni lunedì, giovedì', 'Palestra', { freq: 'weekly', interval: 1, byWeekday: [1, 4], anchor: 'schedule' }, '2026-09-24'],
    ['Pausa ogni giorno', 'Pausa', { freq: 'daily', interval: 1, anchor: 'schedule' }, '2026-09-24'],
    ['Mail ogni giorno lavorativo', 'Mail', { freq: 'daily', interval: 1, byWeekday: [1, 2, 3, 4, 5], anchor: 'schedule' }, '2026-09-24'],
    ['Mail nei giorni lavorativi', 'Mail', { freq: 'daily', interval: 1, byWeekday: [1, 2, 3, 4, 5], anchor: 'schedule' }, '2026-09-24'],
    ['Riunione ogni settimana', 'Riunione', { freq: 'weekly', interval: 1, anchor: 'schedule' }, '2026-09-24'],
    ['Sprint ogni 2 settimane', 'Sprint', { freq: 'weekly', interval: 2, anchor: 'schedule' }, '2026-09-24'],
    ['Fatture ogni 5 del mese', 'Fatture', { freq: 'monthly', interval: 1, byMonthDay: 5, anchor: 'schedule' }, '2026-10-05'],
    ['Affitto ogni mese il 1', 'Affitto', { freq: 'monthly', interval: 1, byMonthDay: 1, anchor: 'schedule' }, '2026-10-01'],
    ['Chiusura ogni fine mese', 'Chiusura', { freq: 'monthly', interval: 1, byMonthDay: -1, anchor: 'schedule' }, '2026-09-30'],
    ['Pulizie tutti i sabati', 'Pulizie', { freq: 'weekly', interval: 1, byWeekday: [6], anchor: 'schedule' }, '2026-09-26'],
    ['Messa tutte le domeniche', 'Messa', { freq: 'weekly', interval: 1, byWeekday: [7], anchor: 'schedule' }, '2026-09-27'],
    ['Vitamine tutti i giorni', 'Vitamine', { freq: 'daily', interval: 1, anchor: 'schedule' }, '2026-09-24'],
    ['Piante ogni 7 giorni dopo', 'Piante', { freq: 'daily', interval: 7, anchor: 'completion' }, '2026-09-24'],
    ['Piante ogni 7 giorni dal completamento', 'Piante', { freq: 'daily', interval: 7, anchor: 'completion' }, '2026-09-24'],
    ['Filtro ogni 3 mesi dopo il completamento', 'Filtro', { freq: 'monthly', interval: 3, anchor: 'completion' }, '2026-09-24']
  ])('%s', (text, title, recurrence, dueDate) => {
    const res = parse(text)
    expect(res.title).toBe(title)
    expect(res.recurrence).toEqual(recurrence)
    expect(res.due?.date).toBe(dueDate)
  })

  it('con orario già passato la prima occorrenza è la successiva', () => {
    expect(parse('Standup ogni giorno lavorativo alle 9:30').due).toEqual({ date: '2026-09-25', time: '09:30' })
    expect(parse('Standup ogni giorno lavorativo alle 11').due).toEqual({ date: '2026-09-24', time: '11:00' })
  })

  it('una data esplicita fissa la prima occorrenza', () => {
    const res = parse('Tagliando ogni anno 15/03')
    expect(res.recurrence?.freq).toBe('yearly')
    expect(res.due?.date).toBe('2027-03-15')
  })

  it('"ogni" senza un periodo riconosciuto resta nel titolo', () => {
    const res = parse('Ogni tanto chiamare la nonna')
    expect(res.recurrence).toBeNull()
    expect(res.title).toBe('Ogni tanto chiamare la nonna')
  })

  it('una seconda ripetizione è segnalata', () => {
    const res = parse('X ogni lunedì ogni giorno')
    expect(res.recurrence?.byWeekday).toEqual([1])
    expect(res.warnings).toContain('Più di una ripetizione, ignorata: ogni giorno')
  })
})

describe('data di inizio', () => {
  it.each([
    ['Preparare bilancio da lunedì', 'Preparare bilancio', '2026-09-28'],
    ['Ferie dal 15', 'Ferie', '2026-10-15'],
    ['Ferie dal 15 ottobre', 'Ferie', '2026-10-15'],
    ['Report dal 15/10', 'Report', '2026-10-15'],
    ["Report dall'11 ottobre", 'Report', '2026-10-11'],
    ['Studiare a partire da domani', 'Studiare', '2026-09-25'],
    ['Studiare a partire dal 1° ottobre', 'Studiare', '2026-10-01'],
    ['Budget da settimana prossima', 'Budget', '2026-09-28']
  ])('%s', (text, title, start) => {
    const res = parse(text)
    expect(res.title).toBe(title)
    expect(res.start).toBe(start)
    expect(res.due).toBeNull()
  })

  it('inizio e scadenza insieme', () => {
    const res = parse('Report da venerdì entro giovedì')
    expect(res.start).toBe('2026-09-25')
    expect(res.due?.date).toBe('2026-10-01')
    expect(res.title).toBe('Report')
  })

  it('avvisa se l\'inizio è dopo la scadenza', () => {
    expect(parse('Report dal 30/10 entro 15/10').warnings).toContain('La data di inizio è dopo la scadenza')
  })

  it('"da" senza data resta nel titolo', () => {
    for (const text of ['Lavorare da casa', 'Pane da Rossi', 'Chiamare dal medico']) {
      const res = parse(text)
      expect(res.start, text).toBeNull()
      expect(res.title, text).toBe(text)
    }
  })
})

describe('stima', () => {
  it.each([
    ['~30m', 30],
    ['~45min', 45],
    ['~2h', 120],
    ['~1,5h', 90],
    ['~1.5h', 90],
    ['~1h30', 90],
    ['~3ore', 180]
  ])('%s → %i minuti', (token, minutes) => {
    const res = parse(`Report ${token} domani`)
    expect(res.estimate).toBe(minutes)
    expect(res.title).toBe('Report')
  })

  it('senza unità o fuori scala non viene interpretata', () => {
    expect(parse('Report ~30').warnings).toContain('Stima senza unità (usa m oppure h): ~30')
    expect(parse('Report ~0m').estimate).toBeNull()
    expect(parse('Report ~0m').title).toBe('Report ~0m')
  })

  it('formattazione', () => {
    expect(formatEstimate(45)).toBe('45m')
    expect(formatEstimate(120)).toBe('2h')
    expect(formatEstimate(90)).toBe('1h30')
    expect(formatEstimate(65)).toBe('1h05')
  })
})

describe('in attesa', () => {
  it('+attesa segna il task e non diventa un tag', () => {
    const res = parse('Report @Marco +attesa +urgente')
    expect(res.waiting).toBe(true)
    expect(res.tags).toEqual(['urgente'])
    expect(res.title).toBe('Report')
  })

  it('senza +attesa il task non è in attesa', () => {
    expect(parse('Report @Marco').waiting).toBe(false)
  })
})

describe('tutto insieme', () => {
  it('Revisione KPI @Marco ogni lunedì alle 9 ~1h #lavoro !alta da lunedì prossimo', () => {
    const res = parse('Revisione KPI @Marco ogni lunedì alle 9 ~1h #lavoro !alta da lunedì prossimo')
    expect(res).toMatchObject({
      title: 'Revisione KPI',
      priority: 3,
      estimate: 60,
      start: '2026-09-28',
      due: { date: '2026-09-28', time: '09:00' },
      recurrence: { freq: 'weekly', byWeekday: [1] },
      warnings: []
    })
  })
})
