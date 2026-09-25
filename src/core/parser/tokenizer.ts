import { normalize } from './lexicon'

export interface Token {
  /** Testo originale del token. */
  raw: string
  /** Testo senza punteggiatura finale, con maiuscole e accenti originali. */
  core: string
  /** `core` normalizzato: minuscolo e senza accenti. */
  word: string
  start: number
  /** Fine di `core` nel testo originale (esclude la punteggiatura finale). */
  end: number
  quoted: boolean
}

const TOKEN_RE = /"[^"]*"?|\S+/g
const APOSTROPHE_SPLIT_RE = /^((?:l|dell|all|dall|nell|sull)['’])(.+)$/i
const TRAILING_PUNCT_RE = /[.,;:?)\]]+$/

function makeToken(raw: string, start: number): Token {
  const core = raw.replace(TRAILING_PUNCT_RE, '') || raw
  return { raw, core, word: normalize(core), start, end: start + core.length, quoted: false }
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  for (const m of text.matchAll(TOKEN_RE)) {
    const raw = m[0]
    const start = m.index ?? 0
    if (raw.startsWith('"')) {
      tokens.push({ raw, core: raw, word: normalize(raw), start, end: start + raw.length, quoted: true })
      continue
    }
    const split = APOSTROPHE_SPLIT_RE.exec(raw)
    if (split) {
      tokens.push(makeToken(split[1], start))
      tokens.push(makeToken(split[2], start + split[1].length))
    } else {
      tokens.push(makeToken(raw, start))
    }
  }
  return tokens
}
