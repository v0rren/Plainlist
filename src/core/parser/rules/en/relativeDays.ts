import { addDays } from '../../../time'
import { lookup } from '../../lexicon'
import { defineRule, wordAt } from '../../types'

const OFFSETS: Record<string, number> = { today: 0, tonight: 0, tomorrow: 1, tmrw: 1 }

/** "today", "tonight", "tomorrow", "tmrw", "(the) day after tomorrow". */
export const enRelativeDays = defineRule({
  id: 'en-relative-days',
  kind: 'date',
  match(tokens, i, ctx) {
    const w = (k: number): string | undefined => wordAt(tokens, i + k)
    const start = w(0) === 'the' ? 1 : 0
    if (w(start) === 'day' && w(start + 1) === 'after' && w(start + 2) === 'tomorrow') {
      return { length: start + 3, status: 'ok', value: addDays(ctx.today, 2) }
    }
    const offset = lookup(OFFSETS, w(0))
    if (offset === undefined) return null
    return { length: 1, status: 'ok', value: addDays(ctx.today, offset) }
  }
})
