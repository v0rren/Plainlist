import { addDays, addMonths } from '../../time'
import { lookup, parseCount } from '../lexicon'
import { defineRule, wordAt } from '../types'

type Unit = 'day' | 'week' | 'month' | 'year'

const UNITS: Record<string, Unit> = {
  giorno: 'day', giorni: 'day', gg: 'day',
  settimana: 'week', settimane: 'week',
  mese: 'month', mesi: 'month',
  anno: 'year', anni: 'year'
}

/** "tra 3 giorni", "fra una settimana", "tra 2 mesi". */
export const inN = defineRule({
  id: 'in-n',
  kind: 'date',
  match(tokens, i, ctx) {
    const w = wordAt(tokens, i)
    if (w !== 'tra' && w !== 'fra') return null
    const n = parseCount(wordAt(tokens, i + 1))
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
