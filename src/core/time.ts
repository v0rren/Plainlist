import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { enGB } from 'date-fns/locale/en-GB'
import { it } from 'date-fns/locale/it'
import { getLanguage, t } from './i18n'

export const TIME_ZONE = 'Europe/Rome'

/** Data di calendario locale (Europe/Rome) nel formato 'YYYY-MM-DD'. */
export type DateKey = string
/** Orario locale nel formato 'HH:mm'. */
export type TimeKey = string

const DAY_MS = 86_400_000
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_KEY_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function inRome(date: Date | number = Date.now()): TZDate {
  return new TZDate(typeof date === 'number' ? date : date.getTime(), TIME_ZONE)
}

export function todayKey(now: Date = new Date()): DateKey {
  return format(inRome(now), 'yyyy-MM-dd')
}

export function nowTimeKey(now: Date = new Date()): TimeKey {
  return format(inRome(now), 'HH:mm')
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function makeDateKey(year: number, month: number, day: number): DateKey {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

export function makeTimeKey(hours: number, minutes: number): TimeKey {
  return `${pad2(hours)}:${pad2(minutes)}`
}

export function parseDateKey(key: DateKey): { year: number; month: number; day: number } {
  const m = DATE_KEY_RE.exec(key)
  if (!m) throw new Error(`Data non valida: ${key}`)
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function isValidDate(year: number, month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
}

export function isValidDateKey(key: unknown): key is DateKey {
  if (typeof key !== 'string') return false
  const m = DATE_KEY_RE.exec(key)
  return !!m && isValidDate(Number(m[1]), Number(m[2]), Number(m[3]))
}

export function isValidTimeKey(key: unknown): key is TimeKey {
  return typeof key === 'string' && TIME_KEY_RE.test(key)
}

function keyToUtc(key: DateKey): number {
  const { year, month, day } = parseDateKey(key)
  return Date.UTC(year, month - 1, day)
}

function utcToKey(ms: number): DateKey {
  const d = new Date(ms)
  return makeDateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

export function addDays(key: DateKey, days: number): DateKey {
  return utcToKey(keyToUtc(key) + days * DAY_MS)
}

/** Aggiunge mesi di calendario; se il giorno non esiste nel mese di arrivo, usa l'ultimo del mese. */
export function addMonths(key: DateKey, months: number): DateKey {
  const { year, month, day } = parseDateKey(key)
  const total = year * 12 + (month - 1) + months
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  return makeDateKey(y, m, Math.min(day, daysInMonth(y, m)))
}

/** Differenza in giorni di calendario: a - b. */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((keyToUtc(a) - keyToUtc(b)) / DAY_MS)
}

/** Giorno della settimana ISO: 1 = lunedì … 7 = domenica. */
export function isoWeekday(key: DateKey): number {
  const d = new Date(keyToUtc(key)).getUTCDay()
  return d === 0 ? 7 : d
}

/** Prossima occorrenza del giorno della settimana, oggi escluso. */
export function nextWeekday(today: DateKey, weekday: number): DateKey {
  const delta = (weekday - isoWeekday(today) + 7) % 7 || 7
  return addDays(today, delta)
}

export function mondayOfNextWeek(today: DateKey): DateKey {
  return addDays(today, 8 - isoWeekday(today))
}

export function lastDayOfMonth(key: DateKey): DateKey {
  const { year, month } = parseDateKey(key)
  return makeDateKey(year, month, daysInMonth(year, month))
}

export function firstDayOfNextMonth(key: DateKey): DateKey {
  const { year, month } = parseDateKey(key)
  return month === 12 ? makeDateKey(year + 1, 1, 1) : makeDateKey(year, month + 1, 1)
}

/** Istante UTC (ISO) corrispondente a data e ora locali di Roma. */
export function toDueAt(date: DateKey, time: TimeKey): string {
  const { year, month, day } = parseDateKey(date)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(new TZDate(year, month - 1, day, hh, mm, TIME_ZONE).getTime()).toISOString()
}

function tzDateOf(key: DateKey): TZDate {
  const { year, month, day } = parseDateKey(key)
  return new TZDate(year, month - 1, day, 12, 0, TIME_ZONE)
}

function dateLocale() {
  return getLanguage() === 'en' ? enGB : it
}

/** "ven 25 set", con l'anno se diverso da quello di riferimento. */
export function formatDateShort(key: DateKey, referenceToday?: DateKey): string {
  const sameYear = !referenceToday || parseDateKey(key).year === parseDateKey(referenceToday).year
  return format(tzDateOf(key), sameYear ? 'EEE d MMM' : 'EEE d MMM yyyy', { locale: dateLocale() })
}

/** "venerdì 25 settembre". */
export function formatDateLong(key: DateKey, referenceToday?: DateKey): string {
  const sameYear = !referenceToday || parseDateKey(key).year === parseDateKey(referenceToday).year
  return format(tzDateOf(key), sameYear ? 'EEEE d MMMM' : 'EEEE d MMMM yyyy', { locale: dateLocale() })
}

/** "oggi", "domani", "ieri" (nella lingua corrente) oppure la data breve; con l'orario se presente. */
export function formatDue(date: DateKey, time: TimeKey | null, today: DateKey): string {
  const delta = diffDays(date, today)
  const { dates } = t()
  const day =
    delta === 0 ? dates.today
    : delta === 1 ? dates.tomorrow
    : delta === -1 ? dates.yesterday
    : formatDateShort(date, today)
  return time ? `${day} ${time}` : day
}
