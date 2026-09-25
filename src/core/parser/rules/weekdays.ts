import { nextWeekday } from '../../time'
import { NEXT_WORDS, WEEKDAYS, lookup } from '../lexicon'
import { defineRule, wordAt } from '../types'

/** "venerdì", "venerdì prossimo", "prossimo venerdì": prossima occorrenza, oggi escluso. */
export const weekdays = defineRule({
  id: 'weekdays',
  kind: 'date',
  match(tokens, i, ctx) {
    const w = wordAt(tokens, i)
    const day = lookup(WEEKDAYS, w)
    if (day !== undefined) {
      const length = NEXT_WORDS.has(wordAt(tokens, i + 1) ?? '') ? 2 : 1
      return { length, status: 'ok', value: nextWeekday(ctx.today, day) }
    }
    if (NEXT_WORDS.has(w ?? '')) {
      const after = lookup(WEEKDAYS, wordAt(tokens, i + 1))
      if (after !== undefined) return { length: 2, status: 'ok', value: nextWeekday(ctx.today, after) }
    }
    return null
  }
})
