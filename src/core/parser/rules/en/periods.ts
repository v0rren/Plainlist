import {
  addDays,
  firstDayOfNextMonth,
  isoWeekday,
  lastDayOfMonth,
  makeDateKey,
  mondayOfNextWeek,
  parseDateKey,
  type DateKey
} from '../../../time'
import { defineRule, wordAt } from '../../types'

/** Venerdì di questa settimana (oggi incluso); di sabato e domenica, quello successivo. */
function friday(today: DateKey): DateKey {
  return addDays(today, (5 - isoWeekday(today) + 7) % 7)
}

function saturday(today: DateKey): DateKey {
  const wd = isoWeekday(today)
  return wd === 7 ? addDays(today, 6) : addDays(today, 6 - wd)
}

const nextSaturday = (today: DateKey): DateKey => addDays(mondayOfNextWeek(today), 5)
const endOfNextMonth = (today: DateKey): DateKey => lastDayOfMonth(firstDayOfNextMonth(today))
const endOfYear = (today: DateKey): DateKey => makeDateKey(parseDateKey(today).year, 12, 31)
const nextYear = (today: DateKey): DateKey => makeDateKey(parseDateKey(today).year + 1, 1, 1)

// "End of week" in inglese è il venerdì lavorativo; "weekend" è il sabato, come "fine settimana" in italiano.
const PATTERNS: Array<[string[], (today: DateKey) => DateKey]> = [
  [['next', 'week'], mondayOfNextWeek],
  [['end', 'of', 'week'], friday],
  [['end', 'of', 'the', 'week'], friday],
  [['eow'], friday],
  [['next', 'weekend'], nextSaturday],
  [['this', 'weekend'], saturday],
  [['the', 'weekend'], saturday],
  [['weekend'], saturday],
  [['week-end'], saturday],
  [['end', 'of', 'next', 'month'], endOfNextMonth],
  [['end', 'of', 'month'], lastDayOfMonth],
  [['end', 'of', 'the', 'month'], lastDayOfMonth],
  [['month', 'end'], lastDayOfMonth],
  [['eom'], lastDayOfMonth],
  [['next', 'month'], firstDayOfNextMonth],
  [['end', 'of', 'year'], endOfYear],
  [['end', 'of', 'the', 'year'], endOfYear],
  [['year', 'end'], endOfYear],
  [['eoy'], endOfYear],
  [['next', 'year'], nextYear]
]

/** "next week", "end of month", "this weekend", "eoy"… */
export const enPeriods = defineRule({
  id: 'en-periods',
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
