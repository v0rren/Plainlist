import type { Recurrence } from '../recurrence'
import type { DateKey, TimeKey } from '../time'
import type { Priority } from '../types'
import type { Token } from './tokenizer'

export interface RuleValues {
  date: DateKey
  time: TimeKey
  priority: Priority
  area: string
  person: string
  tag: string
  recurrence: Recurrence
  /** Data di inizio ("da lunedì"): prodotta dal parser a partire dalle regole di data. */
  start: DateKey
  estimate: number
  waiting: true
}

export type RuleKind = keyof RuleValues

export interface RuleContext {
  today: DateKey
  nowTime: TimeKey
}

export type RuleMatch<K extends RuleKind> =
  | { length: number; status: 'ok'; value: RuleValues[K]; warning?: string }
  | { length: number; status: 'invalid'; message: string }

export interface Rule<K extends RuleKind> {
  id: string
  kind: K
  match(tokens: Token[], index: number, ctx: RuleContext): RuleMatch<K> | null
}

export type AnyRule = { [K in RuleKind]: Rule<K> }[RuleKind]

export function defineRule<K extends RuleKind>(rule: Rule<K>): Rule<K> {
  return rule
}

/** Parola normalizzata del token in posizione `i`, se esiste e non è tra virgolette. */
export function wordAt(tokens: Token[], i: number): string | undefined {
  const t = tokens[i]
  return t && !t.quoted ? t.word : undefined
}
