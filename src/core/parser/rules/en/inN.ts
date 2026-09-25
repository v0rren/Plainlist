import { addDays, addMonths } from '../../../time'
import { lookup } from '../../lexicon'
import { defineRule, wordAt } from '../../types'
import { parseEnCount } from './lexicon'

type Unit = 'day' | 'week' | 'month' | 'year'

const UNITS: Record<string, Unit> = {
  day: 'day', days: 'day',
  week: 'week', weeks: 'week',
  month: 'month', months: 'month',
  year: 'year', years: 'year'
}

/** "in 3 days", "in a week", "in two months". */
export const enInN = defineRule({
  id: 'en-in-n',
  kind: 'date',
  match(tokens, i, ctx) {
    if (wordAt(tokens, i) !== 'in') return null
    const n = parseEnCount(wordAt(tokens, i + 1))
    const unit = lookup(UNITS, wordAt(tokens, i + 2))
    if (n === null || n < 1 || unit === undefined) return null
    const value =
      unit === 'day' ? addDays(ctx.today, n)
      : unit === 'week' ? addDays(ctx.today, n * 7)
      : unit === 'month' ? addMonths(ctx.today, n)
      : addMonths(ctx.today, n * 12)
    return { length: 3, status: 'ok', value }
  }
})
