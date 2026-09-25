import { t } from './i18n'
import {
  addDays,
  addMonths,
  daysInMonth,
  isoWeekday,
  makeDateKey,
  parseDateKey,
  type DateKey
} from './time'

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly'

/** `schedule`: la prossima data segue il calendario. `completion`: riparte dal giorno del completamento. */
export type RecurrenceAnchor = 'schedule' | 'completion'

export interface Recurrence {
  freq: RecurrenceFreq
  interval: number
  /** Giorni della settimana ISO (1 = lunedì … 7 = domenica). Con questi l'intervallo è sempre 1. */
  byWeekday?: number[]
  /** Giorno del mese; -1 = ultimo giorno. */
  byMonthDay?: number
  anchor: RecurrenceAnchor
}

const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
export const WORKDAYS = [1, 2, 3, 4, 5]

export function isWorkdays(r: Recurrence): boolean {
  return r.freq === 'daily' && sameDays(r.byWeekday ?? [], WORKDAYS)
}

function sameDays(a: number[], b: number[]): boolean {
  return a.length === b.length && [...a].sort().every((d, i) => d === [...b].sort()[i])
}

export function normalizeRecurrence(r: Recurrence): Recurrence {
  const interval = Math.max(1, Math.floor(r.interval || 1))
  const byWeekday = r.byWeekday?.length ? [...new Set(r.byWeekday)].filter((d) => d >= 1 && d <= 7).sort() : undefined
  const out: Recurrence = { freq: r.freq, interval: byWeekday ? 1 : interval, anchor: r.anchor }
  if (byWeekday && (r.freq === 'weekly' || r.freq === 'daily')) out.byWeekday = byWeekday
  if (r.freq === 'monthly' && r.byMonthDay !== undefined && (r.byMonthDay === -1 || (r.byMonthDay >= 1 && r.byMonthDay <= 31))) {
    out.byMonthDay = r.byMonthDay
  }
  return out
}

export function toRRule(r: Recurrence): string {
  const parts = [`FREQ=${r.freq.toUpperCase()}`, `INTERVAL=${r.interval}`]
  if (r.byWeekday?.length) parts.push(`BYDAY=${r.byWeekday.map((d) => WEEKDAY_CODES[d - 1]).join(',')}`)
  if (r.byMonthDay !== undefined) parts.push(`BYMONTHDAY=${r.byMonthDay}`)
  return parts.join(';')
}

export function fromRRule(rrule: string, anchor: RecurrenceAnchor = 'schedule'): Recurrence {
  const fields = Object.fromEntries(rrule.split(';').map((p) => p.split('=') as [string, string]))
  const freq = (fields.FREQ ?? 'DAILY').toLowerCase() as RecurrenceFreq
  const r: Recurrence = { freq, interval: Number(fields.INTERVAL ?? 1) || 1, anchor }
  if (fields.BYDAY) r.byWeekday = fields.BYDAY.split(',').map((c) => WEEKDAY_CODES.indexOf(c) + 1).filter((d) => d > 0)
  if (fields.BYMONTHDAY) r.byMonthDay = Number(fields.BYMONTHDAY)
  return normalizeRecurrence(r)
}

export function describeRecurrence(r: Recurrence): string {
  const m = t().recurrence
  let text: string
  if (isWorkdays(r)) text = m.workdays
  else if (r.byWeekday?.length) text = m.onWeekdays(m.join(r.byWeekday.map((d) => m.weekdayNames[d - 1])))
  else {
    const n = r.interval
    switch (r.freq) {
      case 'daily':
        text = m.daily(n)
        break
      case 'weekly':
        text = m.weekly(n)
        break
      case 'monthly':
        text =
          r.byMonthDay === -1 ? m.monthlyLastDay(n)
          : r.byMonthDay !== undefined ? m.monthlyOnDay(m.monthly(n), r.byMonthDay)
          : m.monthly(n)
        break
      case 'yearly':
        text = m.yearly(n)
        break
    }
  }
  return r.anchor === 'completion' ? m.fromCompletion(text) : text
}

function monthDay(year: number, month: number, byMonthDay: number): number {
  const last = daysInMonth(year, month)
  return byMonthDay === -1 ? last : Math.min(byMonthDay, last)
}

export function matchesRecurrence(r: Recurrence, date: DateKey): boolean {
  if (r.byWeekday?.length) return r.byWeekday.includes(isoWeekday(date))
  if (r.freq === 'monthly' && r.byMonthDay !== undefined) {
    const { year, month, day } = parseDateKey(date)
    return day === monthDay(year, month, r.byMonthDay)
  }
  return true
}

/** Prima occorrenza strettamente successiva a `from`, seguendo il calendario. */
export function nextOccurrence(r: Recurrence, from: DateKey): DateKey {
  if (r.byWeekday?.length) {
    for (let k = 1; k <= 7; k++) {
      const candidate = addDays(from, k)
      if (r.byWeekday.includes(isoWeekday(candidate))) return candidate
    }
  }
  switch (r.freq) {
    case 'daily':
      return addDays(from, r.interval)
    case 'weekly':
      return addDays(from, 7 * r.interval)
    case 'monthly': {
      if (r.byMonthDay === undefined) return addMonths(from, r.interval)
      const { year, month, day } = parseDateKey(from)
      const sameMonth = monthDay(year, month, r.byMonthDay)
      if (r.interval === 1 && sameMonth > day) return makeDateKey(year, month, sameMonth)
      const target = parseDateKey(addMonths(makeDateKey(year, month, 1), r.interval))
      return makeDateKey(target.year, target.month, monthDay(target.year, target.month, r.byMonthDay))
    }
    case 'yearly':
      return addMonths(from, 12 * r.interval)
  }
}

/** Prima occorrenza a partire da oggi (incluso): serve quando un task ricorrente nasce senza data. */
export function firstOccurrence(r: Recurrence, today: DateKey): DateKey {
  return matchesRecurrence(r, today) ? today : nextOccurrence(r, today)
}

/**
 * Data della prossima occorrenza quando si completa quella con scadenza `dueDate`.
 * - `schedule`: se era in tempo, la successiva sul calendario; se era in ritardo, la prima dopo oggi
 *   (niente arretrati accumulati).
 * - `completion`: l'intervallo riparte da oggi.
 */
export function nextAfterCompletion(r: Recurrence, dueDate: DateKey | null, today: DateKey): DateKey {
  if (r.anchor === 'completion') {
    if (r.byWeekday?.length) return nextOccurrence(r, today)
    const fromToday = { ...r, byMonthDay: undefined }
    return nextOccurrence(fromToday, today)
  }
  if (dueDate && dueDate >= today) return nextOccurrence(r, dueDate)
  return nextOccurrence(r, today)
}
