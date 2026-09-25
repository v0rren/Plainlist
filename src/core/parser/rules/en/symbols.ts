import type { Priority } from '../../../types'
import { lookup } from '../../lexicon'
import { defineRule, wordAt } from '../../types'

const PRIORITY_WORDS: Record<string, Priority> = {
  '!high': 3,
  '!medium': 2,
  '!med': 2,
  '!low': 1,
  '!!!': 3,
  '!!': 2,
  '!': 1
}

export const enPriority = defineRule({
  id: 'en-priority',
  kind: 'priority',
  match(tokens, i) {
    const value = lookup(PRIORITY_WORDS, wordAt(tokens, i))
    return value === undefined ? null : { length: 1, status: 'ok', value }
  }
})

/** "+waiting": task delegato o in attesa di qualcun altro. Viene prima della regola dei tag. */
export const enWaiting = defineRule({
  id: 'en-waiting',
  kind: 'waiting',
  match(tokens, i) {
    return wordAt(tokens, i) === '+waiting' ? { length: 1, status: 'ok', value: true } : null
  }
})
