import { makeTimeKey } from '../../../time'
import { defineRule, wordAt, type RuleMatch } from '../../types'

const CLOCK_RE = /^(\d{1,2})(?:[:.](\d{2}))?(am|pm|a\.m|p\.m)?$/
const BARE_RE = /^(\d{1,2}):(\d{2})$/
const MERIDIEM: Record<string, 'am' | 'pm'> = { am: 'am', pm: 'pm', 'a.m': 'am', 'p.m': 'pm' }

function toTime(h: number, m: number, meridiem: 'am' | 'pm' | undefined, length: number, afternoonShift: boolean): RuleMatch<'time'> {
  if (m > 59) return { length, status: 'invalid', message: 'invalidTime' }
  if (meridiem) {
    if (h < 1 || h > 12) return { length, status: 'invalid', message: 'invalidTime' }
    return { length, status: 'ok', value: makeTimeKey((h % 12) + (meridiem === 'pm' ? 12 : 0), m) }
  }
  if (h > 23) return { length, status: 'invalid', message: 'invalidTime' }
  const hours = afternoonShift && h >= 1 && h <= 7 ? h + 12 : h
  return { length, status: 'ok', value: makeTimeKey(hours, m) }
}

/**
 * "at 3pm", "at 9:30", "at 3" (1…7 senza am/pm = pomeriggio), "3pm", "3:30 pm", "15:30", "noon", "at midnight".
 */
export const enTime = defineRule({
  id: 'en-time',
  kind: 'time',
  match(tokens, i) {
    const w = (k: number): string | undefined => wordAt(tokens, i + k)
    const at = w(0) === 'at' ? 1 : 0
    const word = w(at)
    if (word === undefined) return null

    if (word === 'noon' || word === 'midday') return { length: at + 1, status: 'ok', value: '12:00' }
    if (word === 'midnight') return { length: at + 1, status: 'ok', value: '00:00' }

    const clock = CLOCK_RE.exec(word)
    if (!clock) return null
    const separate = MERIDIEM[w(at + 1) ?? '']
    const meridiem = clock[3] ? MERIDIEM[clock[3]] : separate
    const length = at + 1 + (!clock[3] && separate ? 1 : 0)
    const h = Number(clock[1])
    const m = clock[2] ? Number(clock[2]) : 0

    if (at || meridiem) return toTime(h, m, meridiem, length, true)
    // Senza "at" e senza am/pm serve la forma hh:mm, altrimenti "3 mele" diventerebbe un orario.
    return BARE_RE.test(word) ? toTime(h, m, undefined, 1, false) : null
  }
})
