export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/’/g, "'")
}

export const WEEKDAYS: Record<string, number> = {
  lunedi: 1,
  martedi: 2,
  mercoledi: 3,
  giovedi: 4,
  venerdi: 5,
  sabato: 6,
  domenica: 7
}

export const MONTHS: Record<string, number> = {
  gennaio: 1, gen: 1,
  febbraio: 2, feb: 2,
  marzo: 3, mar: 3,
  aprile: 4, apr: 4,
  maggio: 5, mag: 5,
  giugno: 6, giu: 6,
  luglio: 7, lug: 7,
  agosto: 8, ago: 8,
  settembre: 9, set: 9, sett: 9,
  ottobre: 10, ott: 10,
  novembre: 11, nov: 11,
  dicembre: 12, dic: 12
}

export const NUMBER_WORDS: Record<string, number> = {
  un: 1, uno: 1, una: 1,
  due: 2, tre: 3, quattro: 4, cinque: 5,
  sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10
}

export const DATE_PREPOSITIONS = new Set(['entro', 'per', 'il', 'lo', "l'", 'di'])

export const NEXT_WORDS = new Set(['prossimo', 'prossima'])

export function parseCount(word: string | undefined): number | null {
  if (word === undefined) return null
  if (/^\d{1,3}$/.test(word)) return Number(word)
  return lookup(NUMBER_WORDS, word) ?? null
}

export function lookup<T>(map: Record<string, T>, key: string | undefined): T | undefined {
  return key !== undefined && Object.hasOwn(map, key) ? map[key] : undefined
}
