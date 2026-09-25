import { formatEstimate } from '@core/parser'
import { WORKDAYS, describeRecurrence, isWorkdays, normalizeRecurrence, type Recurrence } from '@core/recurrence'
import { addDays, mondayOfNextWeek, parseDateKey, todayKey } from '@core/time'
import type { Priority } from '@shared/types'
import { Hourglass, X } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { PRIORITIES, cn } from '../lib/ui'
import { useStore } from '../store'

export interface TaskDraft {
  title: string
  notes: string
  dueDate: string
  dueTime: string
  priority: Priority
  areaId: number | null
  people: string[]
  tags: string[]
  startDate: string
  estimateMin: number | null
  waiting: boolean
  recurrence: Recurrence | null
}

export const EMPTY_DRAFT: TaskDraft = {
  title: '',
  notes: '',
  dueDate: '',
  dueTime: '',
  priority: 2,
  areaId: null,
  people: [],
  tags: [],
  startDate: '',
  estimateMin: null,
  waiting: false,
  recurrence: null
}

const ESTIMATES = [15, 30, 45, 60, 90, 120, 180, 240, 480]
const WEEKDAY_SHORT = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const WEEKDAY_FULL = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica']

type RepeatKind = '' | 'daily' | 'workdays' | 'weekly' | 'monthly' | 'yearly'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-3">
      <span className="pt-1.5 text-xs font-medium text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function ChipsInput({
  values,
  onChange,
  suggestions,
  placeholder,
  prefix
}: {
  values: string[]
  onChange(values: string[]): void
  suggestions: string[]
  placeholder: string
  prefix: string
}) {
  const [text, setText] = useState('')
  const listId = useId()
  const add = (raw: string): void => {
    const value = raw.trim().replace(/^[@#+]/, '')
    if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) onChange([...values, value])
    setText('')
  }
  return (
    <div className="field flex min-h-[34px] flex-wrap items-center gap-1 py-1">
      {values.map((v) => (
        <span key={v} className="chip bg-surface-3 text-fg">
          {prefix}
          {v}
          <button
            type="button"
            className="text-subtle hover:text-fg"
            onClick={() => onChange(values.filter((x) => x !== v))}
            title="Rimuovi"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        list={listId}
        value={text}
        placeholder={values.length ? '' : placeholder}
        onChange={(e) => {
          const v = e.target.value
          if (suggestions.includes(v)) add(v)
          else setText(v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(text)
          } else if (e.key === 'Backspace' && !text && values.length) {
            onChange(values.slice(0, -1))
          }
        }}
        onBlur={() => text && add(text)}
        className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !values.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  )
}

function repeatKind(r: Recurrence | null): RepeatKind {
  if (!r) return ''
  if (isWorkdays(r)) return 'workdays'
  return r.freq
}

function RecurrenceEditor({
  value,
  dueDate,
  onChange
}: {
  value: Recurrence | null
  dueDate: string
  onChange(r: Recurrence | null): void
}) {
  const kind = repeatKind(value)
  const anchor = value?.anchor ?? 'schedule'
  const dueDay = dueDate ? parseDateKey(dueDate).day : undefined

  const setKind = (k: RepeatKind): void => {
    if (!k) return onChange(null)
    const base = { interval: 1, anchor }
    if (k === 'workdays') return onChange({ freq: 'daily', byWeekday: WORKDAYS, ...base })
    if (k === 'monthly') return onChange({ freq: 'monthly', byMonthDay: dueDay, ...base })
    onChange({ freq: k, ...base })
  }
  const update = (patch: Partial<Recurrence>): void => {
    if (value) onChange(normalizeRecurrence({ ...value, ...patch }))
  }
  const unit = { daily: 'giorni', weekly: 'settimane', monthly: 'mesi', yearly: 'anni' } as const

  return (
    <div className="space-y-1.5">
      <select value={kind} onChange={(e) => setKind(e.target.value as RepeatKind)} className="field">
        <option value="">Non si ripete</option>
        <option value="daily">Ogni giorno</option>
        <option value="workdays">Giorni lavorativi</option>
        <option value="weekly">Ogni settimana</option>
        <option value="monthly">Ogni mese</option>
        <option value="yearly">Ogni anno</option>
      </select>

      {value && kind !== 'workdays' && !(kind === 'weekly' && value.byWeekday?.length) && (
        <div className="flex items-center gap-2 text-sm text-muted">
          ogni
          <input
            type="number"
            min={1}
            max={365}
            value={value.interval}
            onChange={(e) => update({ interval: Number(e.target.value) || 1 })}
            className="field w-16 py-1 text-right"
          />
          {unit[value.freq]}
        </div>
      )}

      {value && kind === 'weekly' && (
        <div className="flex gap-1">
          {WEEKDAY_SHORT.map((label, i) => {
            const day = i + 1
            const on = value.byWeekday?.includes(day) ?? false
            return (
              <button
                type="button"
                key={day}
                title={WEEKDAY_FULL[i]}
                onClick={() => {
                  const days = on ? (value.byWeekday ?? []).filter((d) => d !== day) : [...(value.byWeekday ?? []), day]
                  onChange(normalizeRecurrence({ ...value, byWeekday: days.length ? days : undefined }))
                }}
                className={cn(
                  'h-7 w-7 rounded-full border text-xs',
                  on ? 'border-accent bg-accent text-accent-fg' : 'border-line text-muted hover:bg-surface-2'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {value && kind === 'monthly' && (
        <div className="flex items-center gap-2 text-sm text-muted">
          il giorno
          <select
            value={value.byMonthDay ?? dueDay ?? ''}
            onChange={(e) => update({ byMonthDay: e.target.value ? Number(e.target.value) : undefined })}
            className="field w-auto py-1"
          >
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
            <option value={-1}>ultimo del mese</option>
          </select>
        </div>
      )}

      {value && (
        <>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={anchor === 'completion'}
              onChange={(e) => update({ anchor: e.target.checked ? 'completion' : 'schedule' })}
            />
            Riparti dal giorno in cui lo completi
          </label>
          <p className="text-xs text-subtle">
            {describeRecurrence(value)}. Completando il task compare il successivo.
          </p>
        </>
      )}
    </div>
  )
}

interface Props {
  value: TaskDraft
  onChange(patch: Partial<TaskDraft>): void
  /** Chiamato quando un campo di testo perde il fuoco (per il salvataggio automatico). */
  onTextCommit?(field: 'title' | 'notes'): void
  autoFocusTitle?: boolean
}

export function TaskFields({ value, onChange, onTextCommit, autoFocusTitle }: Props) {
  const facets = useStore((s) => s.facets)
  const today = todayKey()
  const quickDates: Array<[string, string]> = [
    ['Oggi', today],
    ['Domani', addDays(today, 1)],
    ['Lunedì prossimo', mondayOfNextWeek(today)]
  ]
  const estimates =
    value.estimateMin && !ESTIMATES.includes(value.estimateMin) ? [...ESTIMATES, value.estimateMin].sort((a, b) => a - b) : ESTIMATES

  return (
    <div className="space-y-3">
      <input
        autoFocus={autoFocusTitle}
        value={value.title}
        onChange={(e) => onChange({ title: e.target.value })}
        onBlur={() => onTextCommit?.('title')}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder="Titolo"
        className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-lg font-semibold outline-none hover:border-line focus:border-accent"
      />
      <textarea
        value={value.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        onBlur={() => onTextCommit?.('notes')}
        placeholder="Note"
        rows={3}
        className="field resize-y text-sm"
      />

      <Row label="Scadenza">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={value.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value, ...(e.target.value ? {} : { dueTime: '' }) })}
            className="field w-auto"
          />
          <input
            type="time"
            value={value.dueTime}
            disabled={!value.dueDate}
            onChange={(e) => onChange({ dueTime: e.target.value })}
            className="field w-auto disabled:opacity-40"
            title={value.dueDate ? 'Orario (facoltativo)' : 'Imposta prima una data'}
          />
          {value.dueDate && !value.recurrence && (
            <button type="button" className="btn-ghost text-xs" onClick={() => onChange({ dueDate: '', dueTime: '' })}>
              <X size={13} /> Nessuna
            </button>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {quickDates.map(([label, date]) => (
            <button
              type="button"
              key={label}
              className={cn('chip hover:bg-surface-3 hover:text-fg', value.dueDate === date && 'bg-accent-soft text-accent')}
              onClick={() => onChange({ dueDate: date })}
            >
              {label}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Ripetizione">
        <RecurrenceEditor
          value={value.recurrence}
          dueDate={value.dueDate}
          onChange={(recurrence) => onChange({ recurrence })}
        />
      </Row>

      <Row label="Visibile dal">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={value.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="field w-auto"
            title="Fino a questa data il task resta nascosto (lo trovi in Programmati)"
          />
          {value.startDate && (
            <button type="button" className="btn-ghost text-xs" onClick={() => onChange({ startDate: '' })}>
              <X size={13} /> Sempre visibile
            </button>
          )}
        </div>
      </Row>

      <Row label="Priorità">
        <div className="inline-flex rounded-md border border-line p-0.5">
          {PRIORITIES.map((p) => (
            <button
              type="button"
              key={p.value}
              onClick={() => onChange({ priority: p.value })}
              className={cn(
                'flex items-center gap-1.5 rounded px-3 py-1 text-sm',
                value.priority === p.value ? 'bg-surface-3 font-medium' : 'text-muted hover:text-fg'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', p.bg)} /> {p.label}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Stima">
        <select
          value={value.estimateMin ?? ''}
          onChange={(e) => onChange({ estimateMin: e.target.value ? Number(e.target.value) : null })}
          className="field w-auto"
        >
          <option value="">Nessuna</option>
          {estimates.map((m) => (
            <option key={m} value={m}>
              {formatEstimate(m)}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Area">
        <select
          value={value.areaId ?? ''}
          onChange={(e) => onChange({ areaId: e.target.value ? Number(e.target.value) : null })}
          className="field"
        >
          <option value="">Nessuna</option>
          {facets?.areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Persone">
        <ChipsInput
          values={value.people}
          onChange={(people) => onChange({ people })}
          suggestions={facets?.people.map((p) => p.name) ?? []}
          placeholder="Aggiungi una persona"
          prefix="@"
        />
        <button
          type="button"
          onClick={() => onChange({ waiting: !value.waiting })}
          className={cn(
            'mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs',
            value.waiting ? 'border-warning bg-warning-soft text-warning' : 'border-line text-muted hover:bg-surface-2'
          )}
          title="Delegato o in attesa di qualcun altro: non compare nei suggerimenti su cosa fare"
        >
          <Hourglass size={12} /> {value.waiting ? 'In attesa di altri' : 'Segna come in attesa'}
        </button>
      </Row>

      <Row label="Tag">
        <ChipsInput
          values={value.tags}
          onChange={(tags) => onChange({ tags })}
          suggestions={facets?.tags.map((t) => t.name) ?? []}
          placeholder="Aggiungi un tag"
          prefix="+"
        />
      </Row>
    </div>
  )
}
