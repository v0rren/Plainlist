import { nextWeekday } from '../../../time'
import { lookup } from '../../lexicon'
import { defineRule, wordAt } from '../../types'
import { EN_NEXT_WORDS, EN_WEEKDAYS } from './lexicon'

/** "friday", "next friday", "this friday": prossima occorrenza, oggi escluso (come in italiano). */
export const enWeekdays = defineRule({
  id: 'en-weekdays',
  kind: 'date',
  match(tokens, i, ctx) {
    const w = wordAt(tokens, i)
    const day = lookup(EN_WEEKDAYS, w)
    if (day !== undefined) return { length: 1, status: 'ok', value: nextWeekday(ctx.today, day) }
    if (EN_NEXT_WORDS.has(w ?? '')) {
      const after = lookup(EN_WEEKDAYS, wordAt(tokens, i + 1))
      if (after !== undefined) return { length: 2, status: 'ok', value: nextWeekday(ctx.today, after) }
    }
    return null
  }
})
