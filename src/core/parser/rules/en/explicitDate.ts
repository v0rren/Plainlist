import { lookup } from '../../lexicon'
import { defineRule, wordAt } from '../../types'
import { ISO_RE, SLASH_RE, resolveDayMonth } from '../explicitDate'
import { EN_DAY_RE, EN_MONTHS } from './lexicon'

const YEAR_RE = /^\d{4}$/

/**
 * "15/10", "15/10/2027", "2026-10-15" (giorno/mese, come in italiano), "15 october", "15th of oct 2027",
 * "october 15", "oct 15th, 2027".
 */
export const enExplicitDate = defineRule({
  id: 'en-explicit-date',
  kind: 'date',
  match(tokens, i, ctx) {
    const w = (k: number): string | undefined => wordAt(tokens, i + k)
    const first = w(0)
    if (first === undefined) return null

    const slash = SLASH_RE.exec(first)
    if (slash) {
      const y =
        slash[3] === undefined ? undefined : slash[3].length === 2 ? 2000 + Number(slash[3]) : Number(slash[3])
      return resolveDayMonth(Number(slash[1]), Number(slash[2]), y, ctx, 1)
    }

    const iso = ISO_RE.exec(first)
    if (iso) return resolveDayMonth(Number(iso[3]), Number(iso[2]), Number(iso[1]), ctx, 1)

    const withYear = (day: number, month: number, used: number) => {
      const year = w(used)
      return year !== undefined && YEAR_RE.test(year)
        ? resolveDayMonth(day, month, Number(year), ctx, used + 1)
        : resolveDayMonth(day, month, undefined, ctx, used)
    }

    const day = EN_DAY_RE.exec(first)
    if (day) {
      const ofShift = w(1) === 'of' ? 1 : 0
      const month = lookup(EN_MONTHS, w(1 + ofShift))
      return month === undefined ? null : withYear(Number(day[1]), month, 2 + ofShift)
    }

    const month = lookup(EN_MONTHS, first)
    const after = EN_DAY_RE.exec(w(1) ?? '')
    if (month !== undefined && after) return withYear(Number(after[1]), month, 2)
    return null
  }
})
