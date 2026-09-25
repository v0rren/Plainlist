import { describe, expect, it } from 'vitest'
import { rescheduleDate } from '../src/core/reschedule'
import {
  addDays,
  addMonths,
  diffDays,
  formatDateLong,
  formatDateShort,
  formatDue,
  isValidDateKey,
  isValidTimeKey,
  isoWeekday,
  mondayOfNextWeek,
  nextWeekday,
  toDueAt,
  todayKey
} from '../src/core/time'

describe('aritmetica sulle date', () => {
  it('addDays attraversa mesi e anni', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
  })

  it('addMonths si ferma all\'ultimo giorno del mese', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15')
  })

  it('diffDays e giorno della settimana', () => {
    expect(diffDays('2027-01-01', '2026-12-31')).toBe(1)
    expect(diffDays('2026-09-20', '2026-09-24')).toBe(-4)
    expect(isoWeekday('2026-09-24')).toBe(4)
    expect(isoWeekday('2026-09-27')).toBe(7)
  })

  it('nextWeekday esclude oggi, mondayOfNextWeek', () => {
    expect(nextWeekday('2026-09-24', 4)).toBe('2026-10-01')
    expect(nextWeekday('2026-09-24', 5)).toBe('2026-09-25')
    expect(mondayOfNextWeek('2026-09-24')).toBe('2026-09-28')
    expect(mondayOfNextWeek('2026-09-28')).toBe('2026-10-05')
    expect(mondayOfNextWeek('2026-09-27')).toBe('2026-09-28')
  })

  it('validazione', () => {
    expect(isValidDateKey('2026-02-29')).toBe(false)
    expect(isValidDateKey('2028-02-29')).toBe(true)
    expect(isValidDateKey('2026-9-1')).toBe(false)
    expect(isValidTimeKey('23:59')).toBe(true)
    expect(isValidTimeKey('24:00')).toBe(false)
    expect(isValidTimeKey('9:00')).toBe(false)
  })
})

describe('fuso orario', () => {
  it('todayKey usa Europe/Rome', () => {
    expect(todayKey(new Date('2026-09-24T21:59:00Z'))).toBe('2026-09-24')
    expect(todayKey(new Date('2026-09-24T22:00:00Z'))).toBe('2026-09-25')
    expect(todayKey(new Date('2026-12-31T23:00:00Z'))).toBe('2027-01-01')
  })

  it("toDueAt gestisce il cambio dell'ora legale", () => {
    expect(toDueAt('2026-10-24', '10:00')).toBe('2026-10-24T08:00:00.000Z')
    expect(toDueAt('2026-10-25', '10:00')).toBe('2026-10-25T09:00:00.000Z')
    expect(toDueAt('2027-03-28', '10:00')).toBe('2027-03-28T08:00:00.000Z')
  })
})

describe('formattazione in italiano', () => {
  it('data breve e lunga', () => {
    expect(formatDateShort('2026-09-25', '2026-09-24')).toBe('ven 25 set')
    expect(formatDateShort('2027-01-15', '2026-09-24')).toBe('ven 15 gen 2027')
    expect(formatDateLong('2026-09-25', '2026-09-24')).toBe('venerdì 25 settembre')
  })

  it('scadenza relativa', () => {
    expect(formatDue('2026-09-24', '15:00', '2026-09-24')).toBe('oggi 15:00')
    expect(formatDue('2026-09-25', null, '2026-09-24')).toBe('domani')
    expect(formatDue('2026-09-23', null, '2026-09-24')).toBe('ieri')
    expect(formatDue('2026-10-02', '12:00', '2026-09-24')).toBe('ven 2 ott 12:00')
  })
})

describe('rimanda', () => {
  it.each([
    ['today', '2026-09-24'],
    ['tomorrow', '2026-09-25'],
    ['nextWeek', '2026-09-28']
  ] as const)('%s → %s', (target, expected) => {
    expect(rescheduleDate(target, '2026-09-24')).toBe(expected)
  })

  it('data esplicita', () => {
    expect(rescheduleDate({ date: '2026-11-02' }, '2026-09-24')).toBe('2026-11-02')
  })
})
