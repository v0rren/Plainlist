import { useDraggable } from '@dnd-kit/core'
import { t } from '@core/i18n'
import { formatEstimate } from '@core/parser'
import { describeRecurrence } from '@core/recurrence'
import { formatDateShort } from '@core/time'
import type { Task } from '@shared/types'
import { AtSign, CalendarClock, CalendarPlus, Check, EyeOff, Flag, Hourglass, Repeat, Sun, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DUE_TONE_CLASS, PRIORITIES, cn, dueInfo, priorityMeta } from '../lib/ui'
import { taskActions, useStore } from '../store'

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange(v: boolean): void; label: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
        checked ? 'border-success bg-success text-surface' : 'border-line-strong hover:border-accent'
      )}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  )
}

function PriorityMenu({ task }: { task: Task }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        className="icon-btn"
        title={t().priority.change}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
      >
        <Flag size={15} />
      </button>
      {open && (
        <div className="absolute top-8 right-0 z-20 w-32 rounded-md border border-line bg-surface p-1 shadow-pop">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-surface-2',
                task.priority === p.value && 'font-medium'
              )}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                void taskActions.setPriority(task.id, p.value)
              }}
            >
              <span className={cn('h-2 w-2 rounded-full', p.bg)} /> {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TaskRow({ task, today }: { task: Task; today: string }) {
  const selected = useStore((s) => s.selectedId === task.id)
  const select = useStore((s) => s.select)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { taskId: task.id, title: task.title },
    disabled: task.status === 'done'
  })
  const rowRef = useRef<HTMLDivElement | null>(null)
  const done = task.status === 'done'
  const due = dueInfo(task, today)
  const prio = priorityMeta(task.priority)
  const inMyDay = task.myDayDate === today
  const hidden = task.startDate !== null && task.startDate > today
  const m = t()
  const hasMeta =
    due || task.areaName || task.people.length > 0 || task.tags.length > 0 || task.notes ||
    task.recurrence || task.estimateMin || task.waiting || hidden

  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        rowRef.current = node
      }}
      {...attributes}
      {...listeners}
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      onClick={() => select(task.id, true)}
      className={cn(
        'group relative flex cursor-default items-center gap-3 rounded-md border px-3 py-2 outline-none',
        selected ? 'border-accent/40 bg-accent-soft' : 'border-transparent hover:bg-surface-2',
        isDragging && 'opacity-40'
      )}
    >
      <span className={cn('absolute top-2 bottom-2 left-0 w-[3px] rounded-full', !done && task.priority !== 2 && prio.bg)} />
      <Checkbox checked={done} onChange={(v) => void taskActions.complete(task.id, v)} label={m.common.complete} />
      <div className="min-w-0 flex-1">
        <div className={cn('truncate', done ? 'text-subtle line-through' : 'text-fg')}>{task.title}</div>
        {hasMeta && (
          <div className="mt-0.5 flex items-center gap-3 truncate text-xs text-muted">
            {hidden && (
              <span className="inline-flex items-center gap-0.5 text-subtle" title={m.row.hiddenUntil}>
                <EyeOff size={11} /> {m.row.from(formatDateShort(task.startDate!, today))}
              </span>
            )}
            {due && <span className={DUE_TONE_CLASS[due.tone]}>{due.text}</span>}
            {task.recurrence && (
              <span className="inline-flex items-center gap-0.5" title={describeRecurrence(task.recurrence)}>
                <Repeat size={11} />
              </span>
            )}
            {task.waiting && (
              <span className="inline-flex items-center gap-0.5 text-warning">
                <Hourglass size={11} /> {m.common.waiting}
              </span>
            )}
            {task.estimateMin && <span>~{formatEstimate(task.estimateMin)}</span>}
            {task.areaName && <span>#{task.areaName}</span>}
            {task.people.length > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <AtSign size={11} />
                {task.people.join(', ')}
              </span>
            )}
            {task.tags.map((t) => (
              <span key={t} className="text-subtle">
                +{t}
              </span>
            ))}
            {task.notes && <span className="truncate text-subtle">{task.notes.split('\n')[0]}</span>}
          </div>
        )}
      </div>
      {!done && inMyDay && <Sun size={13} className="shrink-0 text-warning group-hover:hidden" />}
      {!done && task.priority === 3 && <Flag size={13} className="shrink-0 text-prio-high group-hover:hidden" />}
      {!done && (
        <div
          className={cn('hidden shrink-0 items-center gap-0.5 group-hover:flex', selected && 'flex')}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            className={cn('icon-btn', inMyDay && 'text-warning')}
            title={inMyDay ? m.common.removeFromMyDay : m.common.addToMyDay}
            onClick={(e) => {
              e.stopPropagation()
              void taskActions.setMyDay(task.id, !inMyDay)
            }}
          >
            <Sun size={15} />
          </button>
          <button
            className="icon-btn"
            title={m.row.toTomorrow}
            onClick={(e) => {
              e.stopPropagation()
              void taskActions.reschedule(task.id, 'tomorrow')
            }}
          >
            <CalendarPlus size={15} />
          </button>
          <button
            className="icon-btn"
            title={m.row.toNextWeek}
            onClick={(e) => {
              e.stopPropagation()
              void taskActions.reschedule(task.id, 'nextWeek')
            }}
          >
            <CalendarClock size={15} />
          </button>
          <PriorityMenu task={task} />
          <button
            className="icon-btn hover:text-danger"
            title={m.row.deleteHint}
            onClick={(e) => {
              e.stopPropagation()
              void taskActions.remove(task)
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
