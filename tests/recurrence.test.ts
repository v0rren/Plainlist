import { describe, expect, it } from 'vitest'
import {
  describeRecurrence,
  firstOccurrence,
  fromRRule,
  nextAfterCompletion,
  nextOccurrence,
  normalizeRecurrence,
  toRRule,
  type Recurrence
} from '../src/core/recurrence'

const r = (x: Partial<Recurrence> & Pick<Recurrence, 'freq'>): Recurrence =>
  normalizeRecurrence({ interval: 1, anchor: 'schedule', ...x })

const DAILY = r({ freq: 'daily' })
const WORKDAYS = r({ freq: 'daily', byWeekday: [1, 2, 3, 4, 5] })
const WEEKLY = r({ freq: 'weekly' })
const MON_THU = r({ freq: 'weekly', byWeekday: [4, 1] })
const MONTH_5 = r({ freq: 'monthly', byMonthDay: 5 })
const MONTH_31 = r({ freq: 'monthly', byMonthDay: 31 })
const MONTH_END = r({ freq: 'monthly', byMonthDay: -1 })

describe('nextOccurrence (oggi = gio 24/09/2026)', () => {
  it.each([
    ['ogni giorno', DAILY, '2026-09-24', '2026-09-25'],
    ['ogni 3 giorni', r({ freq: 'daily', interval: 3 }), '2026-09-24', '2026-09-27'],
    ['giorni lavorativi da giovedì', WORKDAYS, '2026-09-24', '2026-09-25'],
    ['giorni lavorativi da venerdì', WORKDAYS, '2026-09-25', '2026-09-28'],
    ['ogni settimana', WEEKLY, '2026-09-24', '2026-10-01'],
    ['ogni 2 settimane', r({ freq: 'weekly', interval: 2 }), '2026-09-24', '2026-10-08'],
    ['lunedì e giovedì da giovedì', MON_THU, '2026-09-24', '2026-09-28'],
    ['lunedì e giovedì da lunedì', MON_THU, '2026-09-28', '2026-10-01'],
    ['il 5 del mese', MONTH_5, '2026-09-24', '2026-10-05'],
    ['il 5 del mese dal 5', MONTH_5, '2026-10-05', '2026-11-05'],
    ['il 31 in un mese di 30 giorni', MONTH_31, '2026-09-24', '2026-09-30'],
    ['il 31 dopo il 30 settembre', MONTH_31, '2026-09-30', '2026-10-31'],
    ['fine mese', MONTH_END, '2026-09-24', '2026-09-30'],
    ['fine mese a gennaio', MONTH_END, '2027-01-31', '2027-02-28'],
    ['ogni mese senza giorno', r({ freq: 'monthly' }), '2027-01-31', '2027-02-28'],
    ['ogni 2 mesi il 5', r({ freq: 'monthly', interval: 2, byMonthDay: 5 }), '2026-09-05', '2026-11-05'],
    ['ogni anno dal 29 febbraio', r({ freq: 'yearly' }), '2028-02-29', '2029-02-28'],
    ['fine anno', r({ freq: 'daily' }), '2026-12-31', '2027-01-01']
  ])('%s', (_label, rule, from, expected) => {
    expect(nextOccurrence(rule, from)).toBe(expected)
  })
})

describe('firstOccurrence', () => {
  it.each([
    ['ogni giorno', DAILY, '2026-09-24', '2026-09-24'],
    ['ogni lunedì detto di giovedì', r({ freq: 'weekly', byWeekday: [1] }), '2026-09-24', '2026-09-28'],
    ['ogni lunedì detto di lunedì', r({ freq: 'weekly', byWeekday: [1] }), '2026-09-28', '2026-09-28'],
    ['giorni lavorativi detto di sabato', WORKDAYS, '2026-09-26', '2026-09-28'],
    ['il 5 del mese', MONTH_5, '2026-09-24', '2026-10-05'],
    ['fine mese', MONTH_END, '2026-09-30', '2026-09-30']
  ])('%s', (_label, rule, today, expected) => {
    expect(firstOccurrence(rule, today)).toBe(expected)
  })
})

describe('nextAfterCompletion', () => {
  const MONDAY = r({ freq: 'weekly', byWeekday: [1] })

  it('dal calendario: completato in anticipo va alla data successiva', () => {
    expect(nextAfterCompletion(MONDAY, '2026-09-28', '2026-09-24')).toBe('2026-10-05')
  })

  it('dal calendario: completato in tempo', () => {
    expect(nextAfterCompletion(DAILY, '2026-09-24', '2026-09-24')).toBe('2026-09-25')
  })

  it('dal calendario: in ritardo salta alla prima data dopo oggi, senza arretrati', () => {
    expect(nextAfterCompletion(MONDAY, '2026-09-07', '2026-09-24')).toBe('2026-09-28')
    expect(nextAfterCompletion(DAILY, '2026-09-20', '2026-09-24')).toBe('2026-09-25')
    expect(nextAfterCompletion(MONTH_5, '2026-08-05', '2026-09-24')).toBe('2026-10-05')
  })

  it('dal completamento: l\'intervallo riparte da oggi', () => {
    const every7 = r({ freq: 'daily', interval: 7, anchor: 'completion' })
    expect(nextAfterCompletion(every7, '2026-09-10', '2026-09-24')).toBe('2026-10-01')
    expect(nextAfterCompletion(every7, '2026-10-30', '2026-09-24')).toBe('2026-10-01')
    const monthly = r({ freq: 'monthly', byMonthDay: 5, anchor: 'completion' })
    expect(nextAfterCompletion(monthly, '2026-09-05', '2026-09-24')).toBe('2026-10-24')
  })
})

describe('RRULE e descrizione', () => {
  it.each([
    [DAILY, 'FREQ=DAILY;INTERVAL=1', 'ogni giorno'],
    [WORKDAYS, 'FREQ=DAILY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR', 'ogni giorno lavorativo'],
    [MON_THU, 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TH', 'ogni lunedì e giovedì'],
    [r({ freq: 'weekly', byWeekday: [1, 3, 5] }), 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR', 'ogni lunedì, mercoledì e venerdì'],
    [r({ freq: 'weekly', interval: 2 }), 'FREQ=WEEKLY;INTERVAL=2', 'ogni 2 settimane'],
    [MONTH_5, 'FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=5', 'ogni mese il 5'],
    [MONTH_END, 'FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=-1', 'ogni fine mese'],
    [r({ freq: 'yearly' }), 'FREQ=YEARLY;INTERVAL=1', 'ogni anno'],
    [r({ freq: 'daily', interval: 7, anchor: 'completion' }), 'FREQ=DAILY;INTERVAL=7', 'ogni 7 giorni dal completamento']
  ])('%s', (rule, rrule, text) => {
    expect(toRRule(rule)).toBe(rrule)
    expect(fromRRule(rrule, rule.anchor)).toEqual(rule)
    expect(describeRecurrence(rule)).toBe(text)
  })

  it('normalizza valori fuori scala', () => {
    expect(normalizeRecurrence({ freq: 'weekly', interval: 3, byWeekday: [8, 1, 1], anchor: 'schedule' })).toEqual({
      freq: 'weekly',
      interval: 1,
      byWeekday: [1],
      anchor: 'schedule'
    })
    expect(normalizeRecurrence({ freq: 'daily', interval: 0, anchor: 'schedule' }).interval).toBe(1)
  })
})
