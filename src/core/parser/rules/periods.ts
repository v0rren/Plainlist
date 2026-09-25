import {
  addDays,
  firstDayOfNextMonth,
  isoWeekday,
  lastDayOfMonth,
  makeDateKey,
  mondayOfNextWeek,
  parseDateKey,
  type DateKey
} from '../../time'
import { defineRule, wordAt } from '../types'

function saturday(today: DateKey): DateKey {
  const wd = isoWeekday(today)
  return wd === 7 ? addDays(today, 6) : addDays(today, 6 - wd)
}

const nextSaturday = (today: DateKey): DateKey => addDays(mondayOfNextWeek(today), 5)
const endOfNextMonth = (today: DateKey): DateKey => lastDayOfMonth(firstDayOfNextMonth(today))
const endOfYear = (today: DateKey): DateKey => makeDateKey(parseDateKey(today).year, 12, 31)

const PATTERNS: Array<[string[], (today: DateKey) => DateKey]> = [
  [['settimana', 'prossima'], mondayOfNextWeek],
  [['prossima', 'settimana'], mondayOfNextWeek],
  [['fine', 'settimana', 'prossima'], nextSaturday],
  [['weekend', 'prossimo'], nextSaturday],
  [['fine', 'settimana'], saturday],
  [['weekend'], saturday],
  [['week-end'], saturday],
  [['fine', 'mese', 'prossimo'], endOfNextMonth],
  [['fine', 'del', 'mese', 'prossimo'], endOfNextMonth],
  [['fine', 'mese'], lastDayOfMonth],
  [['fine', 'del', 'mese'], lastDayOfMonth],
  [['mese', 'prossimo'], firstDayOfNextMonth],
  [['prossimo', 'mese'], firstDayOfNextMonth],
  [['fine', 'anno'], endOfYear],
  [['fine', "dell'", 'anno'], endOfYear]
]

/** "settimana prossima", "fine mese", "weekend", "fine anno"… */
export const periods = defineRule({
  id: 'periods',
  kind: 'date',
  match(tokens, i, ctx) {
    let best: [number, DateKey] | null = null
    for (const [words, resolve] of PATTERNS) {
      if (best && words.length <= best[0]) continue
      if (words.every((word, k) => wordAt(tokens, i + k) === word)) best = [words.length, resolve(ctx.today)]
    }
    return best ? { length: best[0], status: 'ok', value: best[1] } : null
  }
})
