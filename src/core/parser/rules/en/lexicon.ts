import { lookup } from '../../lexicon'

export const EN_WEEKDAYS: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7
}

export const EN_WEEKDAYS_PLURAL: Record<string, number> = {
  mondays: 1,
  tuesdays: 2,
  wednesdays: 3,
  thursdays: 4,
  fridays: 5,
  saturdays: 6,
  sundays: 7
}

export const EN_MONTHS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1,
  two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10
}

/** "by friday", "on the 15th", "due tomorrow", "for monday". */
export const EN_DATE_PREPOSITIONS = new Set(['by', 'on', 'for', 'due', 'before'])

/** "next friday", "this friday", "coming friday": la prossima occorrenza, oggi escluso. */
export const EN_NEXT_WORDS = new Set(['next', 'this', 'coming'])

/** "15th", "1st", "22nd", "3rd". */
export const ORDINAL_RE = /^(\d{1,2})(?:st|nd|rd|th)$/

/** Giorno con o senza suffisso ordinale: "15", "15th". */
export const EN_DAY_RE = /^(\d{1,2})(?:st|nd|rd|th)?$/

export function parseEnCount(word: string | undefined): number | null {
  if (word === undefined) return null
  if (/^\d{1,3}$/.test(word)) return Number(word)
  return lookup(NUMBER_WORDS, word) ?? null
}

export function ordinalDay(word: string | undefined): number | null {
  const m = ORDINAL_RE.exec(word ?? '')
  if (!m) return null
  const n = Number(m[1])
  return n >= 1 && n <= 31 ? n : null
}
