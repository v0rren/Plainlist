import { WORKDAYS, normalizeRecurrence, type Recurrence, type RecurrenceFreq } from '../../recurrence'
import { WEEKDAYS, lookup, parseCount } from '../lexicon'
import { defineRule, wordAt } from '../types'

const PLURAL_WEEKDAYS: Record<string, number> = { ...WEEKDAYS, sabati: 6, domeniche: 7 }

const UNITS: Record<string, RecurrenceFreq> = {
  giorno: 'daily', giorni: 'daily',
  settimana: 'weekly', settimane: 'weekly',
  mese: 'monthly', mesi: 'monthly',
  anno: 'yearly', anni: 'yearly'
}

const PLURAL_UNITS: Record<string, RecurrenceFreq> = {
  giorni: 'daily',
  settimane: 'weekly',
  mesi: 'monthly',
  anni: 'yearly'
}

function dayNumber(word: string | undefined): number | null {
  if (!word || !/^\d{1,2}°?$/.test(word)) return null
  const n = parseInt(word, 10)
  return n >= 1 && n <= 31 ? n : null
}

/**
 * "ogni giorno", "ogni giorno lavorativo", "ogni lunedì e giovedì", "ogni 2 settimane", "ogni mese il 5",
 * "ogni 5 del mese", "ogni fine mese", "ogni anno", "tutti i lunedì", "nei giorni lavorativi".
 * Con "dal completamento" / "dopo il completamento" / "dopo" la prossima data riparte dal completamento.
 */
export const recurrence = defineRule({
  id: 'recurrence',
  kind: 'recurrence',
  match(tokens, i) {
    const w = (k: number): string | undefined => wordAt(tokens, i + k)
    let r: Omit<Recurrence, 'anchor'> | null = null
    let k = 0

    const weekdayList = (start: number, map: Record<string, number>): [number[], number] => {
      const days: number[] = []
      let j = start
      while (true) {
        const d = lookup(map, w(j))
        if (d !== undefined) {
          days.push(d)
          j++
        } else if (w(j) === 'e' && lookup(map, w(j + 1)) !== undefined && days.length) {
          j++
        } else break
      }
      return [days, j]
    }

    if (w(0) === 'ogni') {
      const next = w(1)
      if (next === 'giorno' && (w(2) === 'lavorativo' || w(2) === 'feriale')) {
        r = { freq: 'daily', interval: 1, byWeekday: WORKDAYS }
        k = 3
      } else if (next === 'giorno') {
        r = { freq: 'daily', interval: 1 }
        k = 2
      } else if (next === 'settimana') {
        r = { freq: 'weekly', interval: 1 }
        k = 2
      } else if (next === 'mese') {
        const day = w(2) === 'il' ? dayNumber(w(3)) : null
        r = day ? { freq: 'monthly', interval: 1, byMonthDay: day } : { freq: 'monthly', interval: 1 }
        k = day ? 4 : 2
      } else if (next === 'anno') {
        r = { freq: 'yearly', interval: 1 }
        k = 2
      } else if (next === 'fine' && w(2) === 'mese') {
        r = { freq: 'monthly', interval: 1, byMonthDay: -1 }
        k = 3
      } else if (lookup(WEEKDAYS, next) !== undefined) {
        const [days, end] = weekdayList(1, WEEKDAYS)
        r = { freq: 'weekly', interval: 1, byWeekday: days }
        k = end
      } else if (dayNumber(next) !== null && w(2) === 'del' && w(3) === 'mese') {
        r = { freq: 'monthly', interval: 1, byMonthDay: dayNumber(next)! }
        k = 4
      } else {
        const n = parseCount(next)
        const freq = lookup(UNITS, w(2))
        if (n === null || n < 1 || !freq) return null
        r = { freq, interval: n }
        k = 3
      }
    } else if (
      (w(0) === 'tutti' && (w(1) === 'i' || w(1) === 'gli')) ||
      (w(0) === 'tutte' && w(1) === 'le')
    ) {
      const freq = lookup(PLURAL_UNITS, w(2))
      if (freq) {
        r = { freq, interval: 1 }
        k = 3
      } else {
        const [days, end] = weekdayList(2, PLURAL_WEEKDAYS)
        if (!days.length) return null
        r = { freq: 'weekly', interval: 1, byWeekday: days }
        k = end
      }
    } else if (w(0) === 'nei' && w(1) === 'giorni' && (w(2) === 'lavorativi' || w(2) === 'feriali')) {
      r = { freq: 'daily', interval: 1, byWeekday: WORKDAYS }
      k = 3
    }

    if (!r) return null

    let anchor: Recurrence['anchor'] = 'schedule'
    if (w(k) === 'dopo' && w(k + 1) === 'il' && w(k + 2) === 'completamento') {
      anchor = 'completion'
      k += 3
    } else if (w(k) === 'dal' && w(k + 1) === 'completamento') {
      anchor = 'completion'
      k += 2
    } else if (w(k) === 'dopo' && w(k + 1) === undefined) {
      anchor = 'completion'
      k += 1
    }

    return { length: k, status: 'ok', value: normalizeRecurrence({ ...r, anchor }) }
  }
})
