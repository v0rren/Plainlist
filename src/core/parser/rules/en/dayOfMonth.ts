import { defineRule, wordAt } from '../../types'
import { resolveDayOfMonth } from '../dayOfMonth'
import { ordinalDay } from './lexicon'

/** "the 15th", "on the 1st" (con la preposizione): il prossimo giorno del mese con quel numero. */
export const enDayOfMonth = defineRule({
  id: 'en-day-of-month',
  kind: 'date',
  match(tokens, i, ctx) {
    if (wordAt(tokens, i) !== 'the') return null
    const day = ordinalDay(wordAt(tokens, i + 1))
    if (day === null) return null
    const value = resolveDayOfMonth(day, ctx.today)
    return value ? { length: 2, status: 'ok', value } : null
  }
})
