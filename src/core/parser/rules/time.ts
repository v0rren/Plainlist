import { makeTimeKey } from '../../time'
import { defineRule, wordAt, type RuleMatch } from '../types'

const CLOCK_RE = /^(\d{1,2})(?:[:.](\d{2}))?$/
const BARE_RE = /^(\d{1,2}):(\d{2})$/

function toTime(h: number, m: number, length: number, afternoonShift: boolean): RuleMatch<'time'> {
  if (h > 23 || m > 59) return { length, status: 'invalid', message: 'invalidTime' }
  const hours = afternoonShift && h >= 1 && h <= 7 ? h + 12 : h
  return { length, status: 'ok', value: makeTimeKey(hours, m) }
}

/** "alle 15", "alle 9:30", "ore 15.30", "alle ore 8", "15:30", "a mezzogiorno". "alle 1…7" = pomeriggio. */
export const time = defineRule({
  id: 'time',
  kind: 'time',
  match(tokens, i) {
    const w = wordAt(tokens, i)
    if (w === undefined) return null

    if (w === 'alle' || w === 'ore') {
      const j = w === 'alle' && wordAt(tokens, i + 1) === 'ore' ? i + 2 : i + 1
      const m = CLOCK_RE.exec(wordAt(tokens, j) ?? '')
      if (!m) return null
      return toTime(Number(m[1]), m[2] ? Number(m[2]) : 0, j - i + 1, true)
    }

    if (w === 'mezzogiorno') return { length: 1, status: 'ok', value: '12:00' }
    if (w === 'a' && wordAt(tokens, i + 1) === 'mezzogiorno') return { length: 2, status: 'ok', value: '12:00' }

    const bare = BARE_RE.exec(w)
    if (bare) return toTime(Number(bare[1]), Number(bare[2]), 1, false)
    return null
  }
})
