import { isValidDate, makeDateKey, parseDateKey } from '../../time'
import { MONTHS, lookup } from '../lexicon'
import { defineRule, wordAt, type RuleContext, type RuleMatch } from '../types'

export const SLASH_RE = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/
export const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_RE = /^(\d{1,2})°?$/
const YEAR_RE = /^\d{4}$/

// Chiavi dei messaggi: il parser le traduce nella lingua dell'utente.
const INVALID = 'invalidDate'

/**
 * Senza anno: prossima occorrenza da oggi (incluso). Se nell'anno corrente è già passata
 * o non esiste (29/02), si passa agli anni successivi.
 */
export function resolveDayMonth(
  day: number,
  month: number,
  year: number | undefined,
  ctx: RuleContext,
  length: number
): RuleMatch<'date'> {
  if (month < 1 || month > 12 || day < 1 || day > 31) return { length, status: 'invalid', message: INVALID }
  if (year !== undefined) {
    if (!isValidDate(year, month, day)) return { length, status: 'invalid', message: INVALID }
    const value = makeDateKey(year, month, day)
    return value < ctx.today
      ? { length, status: 'ok', value, warning: 'pastDate' }
      : { length, status: 'ok', value }
  }
  const current = parseDateKey(ctx.today).year
  for (let y = current; y <= current + 8; y++) {
    if (!isValidDate(y, month, day)) continue
    const value = makeDateKey(y, month, day)
    if (value >= ctx.today) return { length, status: 'ok', value }
  }
  return { length, status: 'invalid', message: INVALID }
}

/** "15/10", "15/10/2027", "15/10/27", "2026-10-15", "15 ottobre", "1° ott 2027". */
export const explicitDate = defineRule({
  id: 'explicit-date',
  kind: 'date',
  match(tokens, i, ctx) {
    const w = wordAt(tokens, i)
    if (w === undefined) return null

    const slash = SLASH_RE.exec(w)
    if (slash) {
      const y =
        slash[3] === undefined ? undefined : slash[3].length === 2 ? 2000 + Number(slash[3]) : Number(slash[3])
      return resolveDayMonth(Number(slash[1]), Number(slash[2]), y, ctx, 1)
    }

    const iso = ISO_RE.exec(w)
    if (iso) return resolveDayMonth(Number(iso[3]), Number(iso[2]), Number(iso[1]), ctx, 1)

    const day = DAY_RE.exec(w)
    if (day) {
      const month = lookup(MONTHS, wordAt(tokens, i + 1))
      if (month === undefined) return null
      const yearWord = wordAt(tokens, i + 2)
      if (yearWord !== undefined && YEAR_RE.test(yearWord)) {
        return resolveDayMonth(Number(day[1]), month, Number(yearWord), ctx, 3)
      }
      return resolveDayMonth(Number(day[1]), month, undefined, ctx, 2)
    }
    return null
  }
})
