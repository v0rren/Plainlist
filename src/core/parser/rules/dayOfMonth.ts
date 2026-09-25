import { addMonths, daysInMonth, makeDateKey, parseDateKey, type DateKey } from '../../time'
import { defineRule, wordAt } from '../types'

export const DAY_RE = /^(\d{1,2})°?$/

/** Prossimo giorno del mese con quel numero, oggi incluso; salta i mesi che non lo hanno. */
export function resolveDayOfMonth(day: number, today: DateKey): DateKey | null {
  if (day < 1 || day > 31) return null
  const { year, month } = parseDateKey(today)
  for (let k = 0; k <= 12; k++) {
    const candidate = parseDateKey(addMonths(makeDateKey(year, month, 1), k))
    if (day > daysInMonth(candidate.year, candidate.month)) continue
    const value = makeDateKey(candidate.year, candidate.month, day)
    if (value >= today) return value
  }
  return null
}

/** "il 15", "l'11". */
export const dayOfMonth = defineRule({
  id: 'day-of-month',
  kind: 'date',
  match(tokens, i, ctx) {
    const w = wordAt(tokens, i)
    if (w !== 'il' && w !== "l'") return null
    const m = DAY_RE.exec(wordAt(tokens, i + 1) ?? '')
    if (!m) return null
    const value = resolveDayOfMonth(Number(m[1]), ctx.today)
    return value ? { length: 2, status: 'ok', value } : null
  }
})
