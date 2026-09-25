import type { Priority } from '../../types'
import { lookup } from '../lexicon'
import { defineRule, wordAt } from '../types'

const PRIORITY_WORDS: Record<string, Priority> = {
  '!alta': 3,
  '!media': 2,
  '!bassa': 1,
  '!!!': 3,
  '!!': 2,
  '!': 1
}

const AREA_RE = /^#(\p{L}[\p{L}\p{N}_-]*)$/u
const PERSON_RE = /^@(\p{L}[\p{L}\p{N}_'’-]*)$/u
const TAG_RE = /^\+(\p{L}[\p{L}\p{N}_-]*)$/u

export const priority = defineRule({
  id: 'priority',
  kind: 'priority',
  match(tokens, i) {
    const value = lookup(PRIORITY_WORDS, wordAt(tokens, i))
    return value === undefined ? null : { length: 1, status: 'ok', value }
  }
})

export const area = defineRule({
  id: 'area',
  kind: 'area',
  match(tokens, i) {
    const t = tokens[i]
    const m = t && !t.quoted ? AREA_RE.exec(t.core) : null
    return m ? { length: 1, status: 'ok', value: m[1] } : null
  }
})

export const person = defineRule({
  id: 'person',
  kind: 'person',
  match(tokens, i) {
    const t = tokens[i]
    const m = t && !t.quoted ? PERSON_RE.exec(t.core) : null
    return m ? { length: 1, status: 'ok', value: m[1].replace(/_/g, ' ') } : null
  }
})

export const tag = defineRule({
  id: 'tag',
  kind: 'tag',
  match(tokens, i) {
    const t = tokens[i]
    const m = t && !t.quoted ? TAG_RE.exec(t.core) : null
    return m ? { length: 1, status: 'ok', value: m[1].toLowerCase() } : null
  }
})

/** "+attesa": task delegato o in attesa di qualcun altro. Viene prima della regola dei tag. */
export const waiting = defineRule({
  id: 'waiting',
  kind: 'waiting',
  match(tokens, i) {
    return wordAt(tokens, i) === '+attesa' ? { length: 1, status: 'ok', value: true } : null
  }
})
