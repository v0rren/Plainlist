import { describe, expect, it } from 'vitest'
import { parseQuickInput } from '../src/core/parser'

// Giovedì 24 settembre 2026, 10:00 a Roma
const THU = new Date('2026-09-24T08:00:00Z')
// Sabato 26 settembre 2026, 10:00
const SAT = new Date('2026-09-26T08:00:00Z')

function parse(text: string, now = THU) {
  return parseQuickInput(text, { now, language: 'en' })
}

function date(text: string, now = THU) {
  return parse(text, now).due?.date ?? null
}

describe('inglese: date relative e giorni della settimana', () => {
  it.each([
    ['today', '2026-09-24'],
    ['tonight', '2026-09-24'],
    ['tomorrow', '2026-09-25'],
    ['Tomorrow', '2026-09-25'],
    ['tmrw', '2026-09-25'],
    ['day after tomorrow', '2026-09-26'],
    ['the day after tomorrow', '2026-09-26'],
    ['friday', '2026-09-25'],
    ['monday', '2026-09-28'],
    ['thursday', '2026-10-01'],
    ['next friday', '2026-09-25'],
    ['this sunday', '2026-09-27']
  ])('%s → %s', (text, expected) => expect(date(text)).toBe(expected))
})

describe('inglese: periodi e "in N"', () => {
  it.each([
    ['next week', '2026-09-28'],
    ['end of week', '2026-09-25'],
    ['end of the week', '2026-09-25'],
    ['weekend', '2026-09-26'],
    ['this weekend', '2026-09-26'],
    ['next weekend', '2026-10-03'],
    ['end of month', '2026-09-30'],
    ['by the end of the month', '2026-09-30'],
    ['end of next month', '2026-10-31'],
    ['next month', '2026-10-01'],
    ['end of year', '2026-12-31'],
    ['next year', '2027-01-01'],
    ['in 3 days', '2026-09-27'],
    ['in a week', '2026-10-01'],
    ['in two months', '2026-11-24']
  ])('%s → %s', (text, expected) => expect(date(text)).toBe(expected))

  it('"end of week" di sabato è il venerdì successivo', () => {
    expect(date('end of week', SAT)).toBe('2026-10-02')
  })
})

describe('inglese: date esplicite (giorno/mese)', () => {
  it.each([
    ['15/10', '2026-10-15'],
    ['15/10/2027', '2027-10-15'],
    ['2026-10-15', '2026-10-15'],
    ['15 october', '2026-10-15'],
    ['15th october', '2026-10-15'],
    ['15th of october', '2026-10-15'],
    ['october 15', '2026-10-15'],
    ['Oct 15th', '2026-10-15'],
    ['October 15, 2027', '2027-10-15'],
    ['1 may', '2027-05-01'],
    ['on the 15th', '2026-10-15'],
    ['the 1st', '2026-10-01'],
    ['by friday', '2026-09-25'],
    ['due tomorrow', '2026-09-25']
  ])('%s → %s', (text, expected) => expect(date(text)).toBe(expected))

  it('data impossibile: resta nel titolo ed è segnalata in inglese', () => {
    const r = parse('Pay invoice 31/02')
    expect(r.due).toBeNull()
    expect(r.title).toBe('Pay invoice 31/02')
    expect(r.warnings).toEqual(['Invalid date: 31/02'])
  })

  it('i numeri da soli non sono date', () => {
    const r = parse('Buy 3 apples')
    expect(r.due).toBeNull()
    expect(r.title).toBe('Buy 3 apples')
  })
})

describe('inglese: orari', () => {
  it.each([
    ['at 3pm', '15:00'],
    ['at 3 pm', '15:00'],
    ['3pm', '15:00'],
    ['3:30pm', '15:30'],
    ['9am', '09:00'],
    ['12am', '00:00'],
    ['12pm', '12:00'],
    ['at 9:30', '09:30'],
    ['at 3', '15:00'],
    ['at 15', '15:00'],
    ['15:30', '15:30'],
    ['at noon', '12:00'],
    ['midnight', '00:00']
  ])('%s → %s', (text, expected) => expect(parse(`tomorrow ${text}`).due?.time).toBe(expected))

  it('orario non valido', () => {
    expect(parse('Call at 13pm').warnings).toEqual(['Invalid time: at 13pm'])
  })
})

describe('inglese: ripetizioni', () => {
  it.each([
    ['every day', { freq: 'daily', interval: 1, anchor: 'schedule' }],
    ['daily', { freq: 'daily', interval: 1, anchor: 'schedule' }],
    ['every weekday', { freq: 'daily', interval: 1, byWeekday: [1, 2, 3, 4, 5], anchor: 'schedule' }],
    ['on weekdays', { freq: 'daily', interval: 1, byWeekday: [1, 2, 3, 4, 5], anchor: 'schedule' }],
    ['every monday', { freq: 'weekly', interval: 1, byWeekday: [1], anchor: 'schedule' }],
    ['every monday and thursday', { freq: 'weekly', interval: 1, byWeekday: [1, 4], anchor: 'schedule' }],
    ['on mondays and fridays', { freq: 'weekly', interval: 1, byWeekday: [1, 5], anchor: 'schedule' }],
    ['every week', { freq: 'weekly', interval: 1, anchor: 'schedule' }],
    ['weekly', { freq: 'weekly', interval: 1, anchor: 'schedule' }],
    ['every 2 weeks', { freq: 'weekly', interval: 2, anchor: 'schedule' }],
    ['every other week', { freq: 'weekly', interval: 2, anchor: 'schedule' }],
    ['every 15 days', { freq: 'daily', interval: 15, anchor: 'schedule' }],
    ['every month', { freq: 'monthly', interval: 1, anchor: 'schedule' }],
    ['every month on the 5th', { freq: 'monthly', interval: 1, byMonthDay: 5, anchor: 'schedule' }],
    ['monthly on the 5th', { freq: 'monthly', interval: 1, byMonthDay: 5, anchor: 'schedule' }],
    ['every 5th of the month', { freq: 'monthly', interval: 1, byMonthDay: 5, anchor: 'schedule' }],
    ['every end of month', { freq: 'monthly', interval: 1, byMonthDay: -1, anchor: 'schedule' }],
    ['every month end', { freq: 'monthly', interval: 1, byMonthDay: -1, anchor: 'schedule' }],
    ['every year', { freq: 'yearly', interval: 1, anchor: 'schedule' }],
    ['every 3 months', { freq: 'monthly', interval: 3, anchor: 'schedule' }],
    ['every 7 days after completion', { freq: 'daily', interval: 7, anchor: 'completion' }]
  ])('%s', (text, expected) => expect(parse(`Review ${text}`).recurrence).toEqual(expected))

  it.each([
    ['Standup daily at 9', 'Standup', 'daily'],
    ['Water the plants weekly', 'Water the plants', 'weekly'],
    ['Invoices monthly on the 5th #work', 'Invoices', 'monthly'],
    ['Backup weekly !high', 'Backup', 'weekly']
  ])('"%s": avverbio come ripetizione', (text, title, freq) => {
    const r = parse(text)
    expect(r.title).toBe(title)
    expect(r.recurrence?.freq).toBe(freq)
  })

  it.each(['Weekly review', 'Send weekly report', 'Daily standup notes', 'Prepare monthly budget', 'Weekdays schedule'])(
    '"%s": avverbio dentro il titolo, nessuna ripetizione',
    (text) => {
      const r = parse(text)
      expect(r.title).toBe(text)
      expect(r.recurrence).toBeNull()
    }
  )

  it('la prima scadenza segue la ripetizione', () => {
    const r = parse('KPI review @Marco every monday at 9 ~1h !high')
    expect(r.title).toBe('KPI review')
    expect(r.due).toEqual({ date: '2026-09-28', time: '09:00' })
    expect(r.estimate).toBe(60)
    expect(r.priority).toBe(3)
  })
})

describe('inglese: simboli, inizio e persone', () => {
  it('esempio completo', () => {
    const r = parse('Send quote @Marco friday at 12 #work !high')
    expect(r.title).toBe('Send quote')
    expect(r.due).toEqual({ date: '2026-09-25', time: '12:00' })
    expect(r.priority).toBe(3)
    expect(r.area?.name).toBe('work')
    expect(r.people.map((p) => p.name)).toEqual(['Marco'])
  })

  it.each([
    ['!high', 3],
    ['!medium', 2],
    ['!med', 2],
    ['!low', 1],
    ['!!!', 3]
  ])('priorità %s', (word, expected) => expect(parse(`Report ${word}`).priority).toBe(expected))

  it('le parole italiane non vengono interpretate', () => {
    const r = parse('Report domani !alta')
    expect(r.due).toBeNull()
    expect(r.priority).toBeNull()
  })

  it('+waiting non diventa un tag', () => {
    const r = parse('Q4 budget from @Anna +waiting')
    expect(r.waiting).toBe(true)
    expect(r.tags).toEqual([])
    expect(r.title).toBe('Q4 budget from Anna')
  })

  it('persone dopo una preposizione restano nel titolo', () => {
    expect(parse('Lunch with @Marco and @Anna').title).toBe('Lunch with Marco and Anna')
    expect(parse('Call @Marco').title).toBe('Call')
  })

  it.each([
    ['Budget starting monday by 15/10', '2026-09-28', '2026-10-15'],
    ['Holidays from next week', '2026-09-28', null],
    ['Report starting from tomorrow', '2026-09-25', null],
    ['Plan as of 1st october', '2026-10-01', null]
  ])('%s', (text, start, due) => {
    const r = parse(text)
    expect(r.start).toBe(start)
    expect(r.due?.date ?? null).toBe(due)
  })

  it('stime con ore in inglese', () => {
    expect(parse('Report ~2hrs').estimate).toBe(120)
    expect(parse('Report ~1.5h').estimate).toBe(90)
    expect(parse('Report ~45min').estimate).toBe(45)
  })

  it('avvisi duplicati in inglese', () => {
    expect(parse('Report tomorrow friday').warnings).toEqual(['More than one date, ignored: friday'])
  })
})

describe('lingua predefinita', () => {
  it('senza lingua il parser resta italiano', () => {
    expect(parseQuickInput('Report domani', { now: THU }).due?.date).toBe('2026-09-25')
    expect(parseQuickInput('Report tomorrow', { now: THU }).due).toBeNull()
  })
})
