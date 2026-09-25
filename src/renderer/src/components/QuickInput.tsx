import { formatEstimate, parseQuickInput, type ParseResult } from '@core/parser'
import { describeRecurrence } from '@core/recurrence'
import { formatDateShort, todayKey } from '@core/time'
import type { Task } from '@shared/types'
import {
  AlertTriangle,
  AtSign,
  CalendarDays,
  CornerDownLeft,
  EyeOff,
  Flag,
  Hash,
  Hourglass,
  Plus,
  Repeat,
  Tag,
  Timer
} from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { api, cn, dueWithDate, errorMessage, priorityMeta } from '../lib/ui'

export interface QuickInputHandle {
  focus(): void
}

interface Props {
  knownAreas: string[]
  knownPeople: string[]
  defaultAreaName: string | null
  onAdded?(task: Task): void
  onEscape?(): void
  autoFocus?: boolean
  compact?: boolean
}

export const QuickInput = forwardRef<QuickInputHandle, Props>(function QuickInput(
  { knownAreas, knownPeople, defaultAreaName, onAdded, onEscape, autoFocus, compact },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (compact) return
    const onFill = (e: Event): void => {
      setText((e as CustomEvent<string>).detail)
      setError(null)
    }
    window.addEventListener('plainlist:fill-quick', onFill)
    return () => window.removeEventListener('plainlist:fill-quick', onFill)
  }, [compact])

  useImperativeHandle(ref, () => ({
    focus() {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }))

  const parsed = useMemo(
    () => (text.trim() ? parseQuickInput(text, { now: new Date(), knownAreas, knownPeople }) : null),
    [text, knownAreas, knownPeople]
  )

  async function submit(): Promise<void> {
    if (!parsed || !parsed.title || busy) return
    setBusy(true)
    setError(null)
    try {
      const task = await api.invoke('tasks:quickAdd', { text })
      setText('')
      onAdded?.(task)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full">
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-surface px-3 transition-colors',
          compact ? 'h-12' : 'h-11',
          'border-line focus-within:border-accent'
        )}
      >
        <Plus size={18} className="shrink-0 text-accent" />
        <input
          id="quick-input"
          ref={inputRef}
          autoFocus={autoFocus}
          value={text}
          spellCheck={false}
          placeholder="Cosa devi fare? es. Mandare preventivo @Marco venerdì alle 12 #lavoro !alta"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-subtle"
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void submit()
            } else if (e.key === 'Escape') {
              if (text) setText('')
              else inputRef.current?.blur()
              onEscape?.()
            }
          }}
        />
        {parsed && (
          <button
            className="btn-ghost shrink-0 text-xs"
            disabled={!parsed.title || busy}
            onClick={() => void submit()}
            title="Aggiungi (Invio)"
          >
            <CornerDownLeft size={14} /> Aggiungi
          </button>
        )}
      </div>
      {parsed && <ParsePreview parsed={parsed} defaultAreaName={defaultAreaName} error={error} />}
    </div>
  )
})

function ParsePreview({
  parsed,
  defaultAreaName,
  error
}: {
  parsed: ParseResult
  defaultAreaName: string | null
  error: string | null
}) {
  const today = todayKey()
  const priority = parsed.priority ? priorityMeta(parsed.priority) : null
  const problems = parsed.spans.filter((s) => s.status !== 'ok')

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted">
      {parsed.title ? (
        <span className="max-w-[40ch] truncate font-medium text-fg" title={parsed.title}>
          {parsed.title}
        </span>
      ) : (
        <span className="font-medium text-danger">Titolo mancante</span>
      )}
      {parsed.due && (
        <span className="inline-flex items-center gap-1 text-fg">
          <CalendarDays size={13} className="text-accent" />
          {dueWithDate(parsed.due.date, parsed.due.time, today)}
        </span>
      )}
      {parsed.recurrence && (
        <span className="inline-flex items-center gap-1 text-fg">
          <Repeat size={13} className="text-accent" />
          {describeRecurrence(parsed.recurrence)}
        </span>
      )}
      {parsed.start && (
        <span className="inline-flex items-center gap-1">
          <EyeOff size={13} />
          visibile dal {formatDateShort(parsed.start, today)}
        </span>
      )}
      {parsed.estimate && (
        <span className="inline-flex items-center gap-1">
          <Timer size={13} />~{formatEstimate(parsed.estimate)}
        </span>
      )}
      {parsed.waiting && (
        <span className="inline-flex items-center gap-1 text-warning">
          <Hourglass size={13} />
          in attesa
        </span>
      )}
      <span className={cn('inline-flex items-center gap-1', priority ? priority.text : 'text-subtle')}>
        <Flag size={13} />
        {priority ? priority.label : 'Media'}
      </span>
      {parsed.area ? (
        <span className="inline-flex items-center gap-0.5">
          <Hash size={13} />
          {parsed.area.name}
          {parsed.area.isNew && <em className="ml-1 text-subtle not-italic">(nuova)</em>}
        </span>
      ) : (
        defaultAreaName && (
          <span className="inline-flex items-center gap-0.5 text-subtle">
            <Hash size={13} />
            {defaultAreaName} (predefinita)
          </span>
        )
      )}
      {parsed.people.map((p) => (
        <span key={p.name} className="inline-flex items-center gap-0.5">
          <AtSign size={13} />
          {p.name}
          {p.isNew && <em className="ml-1 text-subtle not-italic">(nuova)</em>}
        </span>
      ))}
      {parsed.tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-0.5">
          <Tag size={12} />
          {t}
        </span>
      ))}
      {problems.map((s) => (
        <span
          key={`${s.start}-${s.text}`}
          className={cn(
            'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
            s.status === 'invalid' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'
          )}
          title={parsed.warnings.find((w) => w.endsWith(s.text))}
        >
          <AlertTriangle size={12} />
          <span className="font-medium">{s.text}</span>
          {s.status === 'invalid' ? 'non riconosciuto, resta nel titolo' : 'ignorato, resta nel titolo'}
        </span>
      ))}
      {parsed.warnings
        .filter((w) => w.startsWith('Data nel passato'))
        .map((w) => (
          <span key={w} className="inline-flex items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-warning">
            <AlertTriangle size={12} />
            {w}
          </span>
        ))}
      {error && <span className="text-danger">{error}</span>}
    </div>
  )
}
