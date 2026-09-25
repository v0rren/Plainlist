import { defineRule, wordAt } from '../types'

const DECIMAL_RE = /^~(\d+(?:[.,]\d+)?)(m|min|h|ore|ora)$/
const HOURS_MINUTES_RE = /^~(\d{1,2})h(\d{1,2})$/
const BARE_RE = /^~\d+(?:[.,]\d+)?$/
const MAX_MINUTES = 7 * 24 * 60

/** "~30m", "~45min", "~2h", "~1,5h", "~1h30": stima del tempo necessario, in minuti. */
export const estimate = defineRule({
  id: 'estimate',
  kind: 'estimate',
  match(tokens, i) {
    const w = wordAt(tokens, i)
    if (w === undefined || !w.startsWith('~')) return null

    let minutes: number | null = null
    const hm = HOURS_MINUTES_RE.exec(w)
    const dec = DECIMAL_RE.exec(w)
    if (hm) minutes = Number(hm[1]) * 60 + Number(hm[2])
    else if (dec) {
      const n = Number(dec[1].replace(',', '.'))
      minutes = Math.round(dec[2].startsWith('m') ? n : n * 60)
    } else if (BARE_RE.test(w)) {
      return { length: 1, status: 'invalid', message: 'Stima senza unità (usa m oppure h)' }
    } else return null

    if (minutes < 1 || minutes > MAX_MINUTES) return { length: 1, status: 'invalid', message: 'Stima non valida' }
    return { length: 1, status: 'ok', value: minutes }
  }
})

export function formatEstimate(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}
