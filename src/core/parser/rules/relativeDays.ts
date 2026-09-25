import { addDays } from '../../time'
import { lookup } from '../lexicon'
import { defineRule, wordAt } from '../types'

const OFFSETS: Record<string, number> = { oggi: 0, domani: 1, dopodomani: 2 }

export const relativeDays = defineRule({
  id: 'relative-days',
  kind: 'date',
  match(tokens, i, ctx) {
    const offset = lookup(OFFSETS, wordAt(tokens, i))
    if (offset === undefined) return null
    return { length: 1, status: 'ok', value: addDays(ctx.today, offset) }
  }
})
