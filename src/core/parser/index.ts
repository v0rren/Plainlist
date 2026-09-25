import { firstOccurrence, nextOccurrence, type Recurrence } from '../recurrence'
import { nowTimeKey, todayKey, addDays, type DateKey, type TimeKey } from '../time'
import type { Priority } from '../types'
import { DATE_PREPOSITIONS, MONTHS, lookup, normalize } from './lexicon'
import { DEFAULT_RULES } from './rules'
import { DAY_RE, resolveDayOfMonth } from './rules/dayOfMonth'
import { tokenize, type Token } from './tokenizer'
import { wordAt, type AnyRule, type RuleContext, type RuleKind, type RuleMatch } from './types'

export type { AnyRule, Rule, RuleContext, RuleKind, RuleMatch } from './types'
export { defineRule, wordAt } from './types'
export { DEFAULT_RULES } from './rules'
export { formatEstimate } from './rules/estimate'

export interface ParsedName {
  name: string
  isNew: boolean
}

export type SpanStatus = 'ok' | 'ambiguous' | 'invalid'

export interface ParseSpan {
  start: number
  end: number
  text: string
  kind: RuleKind
  status: SpanStatus
}

export interface ParseResult {
  title: string
  due: { date: DateKey; time: TimeKey | null } | null
  priority: Priority | null
  area: ParsedName | null
  people: ParsedName[]
  tags: string[]
  recurrence: Recurrence | null
  /** Data da cui il task diventa visibile ("da lunedì", "dal 15/10"). */
  start: DateKey | null
  estimate: number | null
  waiting: boolean
  spans: ParseSpan[]
  warnings: string[]
}

export interface ParseOptions {
  now?: Date
  knownAreas?: string[]
  knownPeople?: string[]
  rules?: AnyRule[]
}

interface Candidate {
  kind: RuleKind
  match: RuleMatch<RuleKind>
  /** Preposizioni assorbite prima della regola ("entro", "per il"…). */
  prefix: number
}

const MAX_PREPOSITIONS = 2

const DUPLICATE_MESSAGE: Partial<Record<RuleKind, string>> = {
  date: 'Più di una data, ignorata',
  time: 'Più di un orario, ignorato',
  priority: 'Più di una priorità, ignorata',
  area: "Più di un'area, ignorata",
  recurrence: 'Più di una ripetizione, ignorata',
  start: 'Più di una data di inizio, ignorata',
  estimate: 'Più di una stima, ignorata'
}

const START_WORDS = new Set(['da', 'dal', "dall'", 'dalla'])

/** Dopo queste parole il nome della persona resta nel titolo ("Budget da Marco", "Scrivere a Marco"). */
const LINKING_WORDS = new Set([
  'a', 'ad', 'al', 'allo', 'alla', "all'", 'ai', 'agli', 'alle',
  'da', 'dal', 'dallo', 'dalla', "dall'", 'dai', 'dagli', 'dalle',
  'di', 'del', 'dello', 'della', "dell'", 'dei', 'degli', 'delle',
  'con', 'col', 'per', 'su', 'sul', 'tra', 'fra', 'verso', 'insieme'
])

function totalLength(c: Candidate): number {
  return c.prefix + c.match.length
}

function matchAt(tokens: Token[], i: number, ctx: RuleContext, rules: AnyRule[], depth = 0): Candidate | null {
  let best: Candidate | null = null
  for (const rule of rules) {
    const match = rule.match(tokens, i, ctx) as RuleMatch<RuleKind> | null
    if (match && match.length > 0 && (!best || match.length > totalLength(best))) {
      best = { kind: rule.kind, match, prefix: 0 }
    }
  }
  if (depth === 0) {
    const start = matchStart(tokens, i, ctx, rules)
    if (start && (!best || totalLength(start) > totalLength(best))) best = start
  }
  const w = wordAt(tokens, i)
  if (w !== undefined && DATE_PREPOSITIONS.has(w) && depth < MAX_PREPOSITIONS) {
    const dateRules = rules.filter((r) => r.kind === 'date')
    const inner = matchAt(tokens, i + 1, ctx, dateRules, depth + 1)
    if (inner && (!best || totalLength(inner) + 1 > totalLength(best))) {
      best = { ...inner, prefix: inner.prefix + 1 }
    }
  }
  return best
}

/** "da lunedì", "dal 15/10", "dal 15", "a partire da domani": una data introdotta come inizio. */
function matchStart(tokens: Token[], i: number, ctx: RuleContext, rules: AnyRule[]): Candidate | null {
  let lead: number
  if (wordAt(tokens, i) === 'a' && wordAt(tokens, i + 1) === 'partire' && START_WORDS.has(wordAt(tokens, i + 2) ?? '')) {
    lead = 3
  } else if (START_WORDS.has(wordAt(tokens, i) ?? '')) {
    lead = 1
  } else return null

  const inner = matchAt(tokens, i + lead, ctx, rules.filter((r) => r.kind === 'date'), 1)
  if (inner) return { kind: 'start', match: { ...inner.match, length: lead + totalLength(inner) }, prefix: 0 }

  const leadWord = wordAt(tokens, i + lead - 1)
  const day = DAY_RE.exec(wordAt(tokens, i + lead) ?? '')
  if ((leadWord === 'dal' || leadWord === "dall'") && day && lookup(MONTHS, wordAt(tokens, i + lead + 1)) === undefined) {
    const value = resolveDayOfMonth(Number(day[1]), ctx.today)
    if (value) return { kind: 'start', match: { length: lead + 1, status: 'ok', value }, prefix: 0 }
  }
  return null
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function canonical(name: string, known: string[], fallback: (n: string) => string): ParsedName {
  const key = normalize(name)
  const hit = known.find((k) => normalize(k) === key)
  return hit ? { name: hit, isNew: false } : { name: fallback(name), isNew: true }
}

export function cleanTitle(text: string): string {
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])(?=\s|$)/g, '$1')
    .replace(/^[\s,.;:–—-]+/, '')
    .replace(/[\s,;:–—-]+$/, '')
    .trim()
  return capitalize(cleaned)
}

/** Sostituisce gli intervalli con il testo indicato (stringa vuota = rimuovi). */
function replaceRanges(text: string, ranges: Array<[number, number, string]>): string {
  let out = ''
  let pos = 0
  for (const [start, end, replacement] of [...ranges].sort((a, b) => a[0] - b[0])) {
    out += text.slice(pos, start) + (replacement ? replacement : ' ')
    pos = end
  }
  return out + text.slice(pos)
}

export function parseQuickInput(text: string, options: ParseOptions = {}): ParseResult {
  const now = options.now ?? new Date()
  const rules = options.rules ?? DEFAULT_RULES
  const ctx: RuleContext = { today: todayKey(now), nowTime: nowTimeKey(now) }
  const tokens = tokenize(text)

  const spans: ParseSpan[] = []
  const warnings: string[] = []
  const consumed: Array<[number, number]> = []
  const inlinePeople: Array<{ start: number; end: number; name: string }> = []
  /** Come è stata trattata ogni persona, per indice del token: tolta dal titolo o lasciata come nome. */
  const personMode = new Map<number, 'removed' | 'inline'>()
  let date: DateKey | null = null
  let time: TimeKey | null = null
  let priority: Priority | null = null
  let area: string | null = null
  const people: string[] = []
  const tags: string[] = []
  let recurrence: Recurrence | null = null
  let startDate: DateKey | null = null
  let estimate: number | null = null
  let waiting = false

  const isSet = (kind: RuleKind): boolean =>
    (kind === 'date' && date !== null) ||
    (kind === 'time' && time !== null) ||
    (kind === 'priority' && priority !== null) ||
    (kind === 'area' && area !== null) ||
    (kind === 'recurrence' && recurrence !== null) ||
    (kind === 'start' && startDate !== null) ||
    (kind === 'estimate' && estimate !== null)

  let i = 0
  while (i < tokens.length) {
    if (tokens[i].quoted) {
      i++
      continue
    }
    const candidate = matchAt(tokens, i, ctx, rules)
    if (!candidate) {
      i++
      continue
    }

    const { kind, match, prefix } = candidate
    const ruleStart = i + prefix
    const ruleEnd = ruleStart + match.length - 1
    const start = tokens[ruleStart].start
    const end = tokens[ruleEnd].end
    const ruleText = text.slice(start, end)

    if (match.status === 'invalid') {
      spans.push({ start, end, text: ruleText, kind, status: 'invalid' })
      warnings.push(`${match.message}: ${ruleText}`)
    } else if (isSet(kind)) {
      spans.push({ start, end, text: ruleText, kind, status: 'ambiguous' })
      warnings.push(`${DUPLICATE_MESSAGE[kind]}: ${ruleText}`)
    } else {
      const value = match.value
      switch (kind) {
        case 'date':
          date = value as DateKey
          break
        case 'time':
          time = value as TimeKey
          break
        case 'priority':
          priority = value as Priority
          break
        case 'area':
          area = value as string
          break
        case 'person':
          if (!people.some((p) => normalize(p) === normalize(value as string))) people.push(value as string)
          break
        case 'tag':
          if (!tags.includes(value as string)) tags.push(value as string)
          break
        case 'recurrence':
          recurrence = value as Recurrence
          break
        case 'start':
          startDate = value as DateKey
          break
        case 'estimate':
          estimate = value as number
          break
        case 'waiting':
          waiting = true
          break
      }
      let consumeStart = tokens[i].start
      const before = tokens[i - 1]
      const listed = kind === 'person' && before !== undefined && (before.word === 'e' || before.word === 'ed')
        ? personMode.get(i - 2)
        : undefined
      const linked =
        listed === 'inline' ||
        (listed === undefined &&
          kind === 'person' &&
          before !== undefined &&
          !before.quoted &&
          LINKING_WORDS.has(before.word) &&
          !consumed.some(([s, e]) => before.start >= s && before.start < e))
      if (listed === 'removed') consumeStart = before.start
      if (linked) inlinePeople.push({ start: consumeStart, end, name: value as string })
      else consumed.push([consumeStart, end])
      if (kind === 'person') personMode.set(i, linked ? 'inline' : 'removed')
      spans.push({ start: consumeStart, end, text: text.slice(consumeStart, end), kind, status: 'ok' })
      if (match.warning) warnings.push(`${match.warning}: ${ruleText}`)
    }
    i = ruleEnd + 1
  }

  let due: ParseResult['due'] = null
  if (date !== null) due = { date, time }
  else if (recurrence !== null) {
    let first = firstOccurrence(recurrence, ctx.today)
    if (first === ctx.today && time !== null && time <= ctx.nowTime) first = nextOccurrence(recurrence, ctx.today)
    due = { date: first, time }
  } else if (time !== null) due = { date: time > ctx.nowTime ? ctx.today : addDays(ctx.today, 1), time }

  if (startDate !== null && due !== null && startDate > due.date) warnings.push('La data di inizio è dopo la scadenza')

  const personName = (raw: string): string =>
    canonical(raw, options.knownPeople ?? [], (n) => n.split(' ').map(capitalize).join(' ')).name
  const ranges: Array<[number, number, string]> = [
    ...consumed.map(([s, e]): [number, number, string] => [s, e, '']),
    ...inlinePeople.map((p): [number, number, string] => [p.start, p.end, personName(p.name)])
  ]

  return {
    title: cleanTitle(replaceRanges(text, ranges)),
    due,
    priority,
    area: area === null ? null : canonical(area, options.knownAreas ?? [], (n) => n),
    people: people.map((p) =>
      canonical(p, options.knownPeople ?? [], (n) => n.split(' ').map(capitalize).join(' '))
    ),
    tags,
    recurrence,
    start: startDate,
    estimate,
    waiting,
    spans,
    warnings
  }
}
