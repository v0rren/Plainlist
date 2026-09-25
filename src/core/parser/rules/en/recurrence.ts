import { WORKDAYS, normalizeRecurrence, type Recurrence, type RecurrenceFreq } from '../../../recurrence'
import { lookup } from '../../lexicon'
import { defineRule, wordAt } from '../../types'
import { EN_WEEKDAYS, EN_WEEKDAYS_PLURAL, ordinalDay, parseEnCount } from './lexicon'

const UNITS: Record<string, RecurrenceFreq> = {
  day: 'daily', days: 'daily',
  week: 'weekly', weeks: 'weekly',
  month: 'monthly', months: 'monthly',
  year: 'yearly', years: 'yearly'
}

const ADVERBS: Record<string, RecurrenceFreq> = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  yearly: 'yearly',
  annually: 'yearly'
}

/** Parole che possono seguire "daily", "weekly"… senza farli diventare parte del titolo. */
const TAIL_WORDS = new Set(['at', 'on', 'from', 'after', 'starting', 'by', 'until'])

type Base = Omit<Recurrence, 'anchor'>

/**
 * "every day", "daily", "every weekday", "on weekdays", "every monday and thursday", "on mondays",
 * "every 2 weeks", "every other week", "every month on the 5th", "every 5th of the month",
 * "every end of month", "monthly", "every year". Con "after completion" / "from completion"
 * la prossima data riparte dal completamento.
 */
export const enRecurrence = defineRule({
  id: 'en-recurrence',
  kind: 'recurrence',
  match(tokens, i) {
    const w = (k: number): string | undefined => wordAt(tokens, i + k)
    let r: Base | null = null
    let k = 0

    const weekdayList = (start: number, map: Record<string, number>): [number[], number] => {
      const days: number[] = []
      let j = start
      while (true) {
        const d = lookup(map, w(j))
        if (d !== undefined) {
          days.push(d)
          j++
        } else if (w(j) === 'and' && lookup(map, w(j + 1)) !== undefined && days.length) {
          j++
        } else break
      }
      return [days, j]
    }

    /** "… on the 5th", "… on the last day", "… on the 5th" dopo "every month" o "monthly". */
    const monthDay = (base: Base, at: number): [Base, number] => {
      if (w(at) !== 'on') return [base, at]
      const the = w(at + 1) === 'the' ? 1 : 0
      const day = ordinalDay(w(at + 1 + the))
      if (day !== null) return [{ ...base, byMonthDay: day }, at + 2 + the]
      if (w(at + 1 + the) === 'last' && w(at + 2 + the) === 'day') return [{ ...base, byMonthDay: -1 }, at + 3 + the]
      return [base, at]
    }

    const monthEnd = (at: number): number | null => {
      // "end of month", "end of the month", "last day of the month"
      const start = w(at) === 'end' ? at + 1 : w(at) === 'last' && w(at + 1) === 'day' ? at + 2 : null
      if (start === null || w(start) !== 'of') return null
      if (w(start + 1) === 'month') return start + 2
      if (w(start + 1) === 'the' && w(start + 2) === 'month') return start + 3
      return null
    }

    /**
     * "daily", "weekly"… da soli fanno spesso parte del titolo ("Weekly review", "Send weekly report"):
     * valgono come ripetizione solo in fondo al testo o prima di un'altra indicazione ("at 9", "#work", "!high").
     */
    const endsPhrase = (at: number): boolean => {
      const next = tokens[i + at]
      return next === undefined || next.quoted || /^[#@!~+]/.test(next.word) || TAIL_WORDS.has(next.word)
    }

    const workdays: Base = { freq: 'daily', interval: 1, byWeekday: WORKDAYS }

    if (w(0) === 'every') {
      const next = w(1)
      const end = monthEnd(1)
      if (next === 'weekday' || next === 'workday') {
        r = workdays
        k = 2
      } else if ((next === 'working' || next === 'business') && w(2) === 'day') {
        r = workdays
        k = 3
      } else if (next === 'day') {
        r = { freq: 'daily', interval: 1 }
        k = 2
      } else if (next === 'week') {
        r = { freq: 'weekly', interval: 1 }
        k = 2
      } else if (next === 'month' && w(2) === 'end') {
        r = { freq: 'monthly', interval: 1, byMonthDay: -1 }
        k = 3
      } else if (next === 'month') {
        ;[r, k] = monthDay({ freq: 'monthly', interval: 1 }, 2)
      } else if (next === 'year') {
        r = { freq: 'yearly', interval: 1 }
        k = 2
      } else if (end !== null) {
        r = { freq: 'monthly', interval: 1, byMonthDay: -1 }
        k = end
      } else if (next === 'other' && lookup(UNITS, w(2)) && !w(2)!.endsWith('s')) {
        r = { freq: UNITS[w(2)!], interval: 2 }
        k = 3
      } else if (lookup(EN_WEEKDAYS, next) !== undefined) {
        const [days, stop] = weekdayList(1, EN_WEEKDAYS)
        r = { freq: 'weekly', interval: 1, byWeekday: days }
        k = stop
      } else if (ordinalDay(next) !== null && lookup(UNITS, w(2)) === undefined) {
        r = { freq: 'monthly', interval: 1, byMonthDay: ordinalDay(next)! }
        k = 2
        if (w(2) === 'of' && (w(3) === 'the' || w(3) === 'each' || w(3) === 'every') && w(4) === 'month') k = 5
      } else {
        const n = parseEnCount(next)
        const freq = lookup(UNITS, w(2))
        if (n === null || n < 1 || !freq) return null
        r = { freq, interval: n }
        k = 3
      }
    } else if (lookup(ADVERBS, w(0)) !== undefined && endsPhrase(1)) {
      const freq = ADVERBS[w(0)!]
      ;[r, k] = freq === 'monthly' ? monthDay({ freq, interval: 1 }, 1) : [{ freq, interval: 1 }, 1]
    } else if ((w(0) === 'weekdays' && endsPhrase(1)) || (w(0) === 'on' && (w(1) === 'weekdays' || w(1) === 'workdays'))) {
      r = workdays
      k = w(0) === 'on' ? 2 : 1
    } else if (w(0) === 'on' && lookup(EN_WEEKDAYS_PLURAL, w(1)) !== undefined) {
      const [days, stop] = weekdayList(1, EN_WEEKDAYS_PLURAL)
      r = { freq: 'weekly', interval: 1, byWeekday: days }
      k = stop
    }

    if (!r) return null

    let anchor: Recurrence['anchor'] = 'schedule'
    if ((w(k) === 'after' || w(k) === 'from') && (w(k + 1) === 'completion' || w(k + 1) === 'completing')) {
      anchor = 'completion'
      k += 2
    }

    return { length: k, status: 'ok', value: normalizeRecurrence({ ...r, anchor }) }
  }
})
