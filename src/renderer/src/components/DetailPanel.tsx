import type { TaskDetail, TaskEvent, TaskPatch } from '@shared/types'
import { Sun, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, cn, errorMessage, formatDateTime } from '../lib/ui'
import { taskActions, useStore } from '../store'
import { TaskFields, type TaskDraft } from './TaskFields'
import { Checkbox } from './TaskRow'

const EVENT_LABEL: Record<TaskEvent['type'], string> = {
  created: 'Creato',
  updated: 'Modificato',
  completed: 'Completato',
  reopened: 'Riaperto',
  rescheduled: 'Scadenza cambiata',
  deleted: 'Eliminato',
  restored: 'Ripristinato'
}

function toDraft(t: TaskDetail): TaskDraft {
  return {
    title: t.title,
    notes: t.notes ?? '',
    dueDate: t.dueDate ?? '',
    dueTime: t.dueTime ?? '',
    priority: t.priority,
    areaId: t.areaId,
    people: t.people,
    tags: t.tags,
    startDate: t.startDate ?? '',
    estimateMin: t.estimateMin,
    waiting: t.waiting,
    recurrence: t.recurrence
  }
}

function toPatch(patch: Partial<TaskDraft>): TaskPatch {
  const out: TaskPatch = {}
  if (patch.title !== undefined) out.title = patch.title
  if (patch.notes !== undefined) out.notes = patch.notes || null
  if (patch.dueDate !== undefined) out.dueDate = patch.dueDate || null
  if (patch.dueTime !== undefined) out.dueTime = patch.dueTime || null
  if (patch.priority !== undefined) out.priority = patch.priority
  if (patch.areaId !== undefined) out.areaId = patch.areaId
  if (patch.people !== undefined) out.people = patch.people
  if (patch.tags !== undefined) out.tags = patch.tags
  if (patch.startDate !== undefined) out.startDate = patch.startDate || null
  if (patch.estimateMin !== undefined) out.estimateMin = patch.estimateMin
  if (patch.waiting !== undefined) out.waiting = patch.waiting
  if (patch.recurrence !== undefined) out.recurrence = patch.recurrence
  return out
}

export function DetailPanel({ id }: { id: number }) {
  const closeDetail = useStore((s) => s.closeDetail)
  const toast = useStore((s) => s.toast)
  const today = useStore((s) => s.today)
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [draft, setDraft] = useState<TaskDraft | null>(null)
  const draftRef = useRef<TaskDraft | null>(null)
  draftRef.current = draft

  const load = useCallback(async () => {
    const detail = await api.invoke('tasks:get', { id })
    setTask(detail)
    const current = draftRef.current
    const editing = document.activeElement?.closest('[data-detail]') && current
    setDraft((prev) => (detail ? (editing && prev ? { ...toDraft(detail), title: prev.title, notes: prev.notes } : toDraft(detail)) : null))
  }, [id])

  useEffect(() => {
    setDraft(null)
    void load()
    return window.api.on('tasks:changed', ({ ids }) => {
      if (ids.length === 0 || ids.includes(id)) void load()
    })
  }, [id, load])

  async function save(patch: Partial<TaskDraft>): Promise<void> {
    try {
      await api.invoke('tasks:update', { id, patch: toPatch(patch) })
    } catch (err) {
      toast({ kind: 'error', message: errorMessage(err) })
      void load()
    }
  }

  if (!task || !draft) {
    return <aside className="w-[380px] shrink-0 border-l border-line bg-surface" />
  }

  const textFields = new Set(['title', 'notes'])

  return (
    <aside data-detail className="flex w-[380px] shrink-0 flex-col border-l border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Checkbox
          checked={task.status === 'done'}
          onChange={(v) => void taskActions.complete(task.id, v)}
          label="Completato"
        />
        <span className="flex-1 text-sm text-muted">{task.status === 'done' ? 'Completato' : 'Da fare'}</span>
        {task.status === 'open' && (
          <button
            className={cn('icon-btn', task.myDayDate === today && 'text-warning hover:text-warning')}
            title={task.myDayDate === today ? 'Togli da Il mio giorno' : 'Aggiungi a Il mio giorno'}
            onClick={() => void taskActions.setMyDay(task.id, task.myDayDate !== today)}
          >
            <Sun size={16} />
          </button>
        )}
        <button className="icon-btn hover:text-danger" title="Elimina" onClick={() => void taskActions.remove(task)}>
          <Trash2 size={16} />
        </button>
        <button className="icon-btn" title="Chiudi (Esc)" onClick={closeDetail}>
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <TaskFields
          value={draft}
          onChange={(patch) => {
            setDraft({ ...draft, ...patch })
            const immediate = Object.fromEntries(Object.entries(patch).filter(([k]) => !textFields.has(k)))
            if (Object.keys(immediate).length) void save(immediate)
          }}
          onTextCommit={(field) => {
            const value = draft[field]
            const original = field === 'title' ? task.title : (task.notes ?? '')
            if (value.trim() === original.trim()) return
            if (field === 'title' && !value.trim()) {
              setDraft({ ...draft, title: task.title })
              return
            }
            void save({ [field]: value })
          }}
        />

        {task.sourceText && (
          <div className="mt-5 rounded-md bg-surface-2 px-3 py-2 text-xs text-muted">
            <div className="mb-0.5 font-medium">Inserito come</div>
            <code className="break-words whitespace-pre-wrap">{task.sourceText}</code>
          </div>
        )}

        <div className="mt-5">
          <div className="mb-1.5 text-xs font-semibold tracking-wide text-subtle uppercase">Storico</div>
          <ol className="space-y-1 text-xs text-muted">
            {[...task.events].reverse().map((e) => (
              <li key={e.id} className="flex gap-2">
                <span className="w-24 shrink-0 text-subtle">{formatDateTime(e.at)}</span>
                <span>
                  {EVENT_LABEL[e.type]}
                  {e.type === 'rescheduled' && e.payload && (
                    <span className="text-subtle">
                      {' '}
                      · {String(e.payload.from ?? 'nessuna')} → {String(e.payload.to ?? 'nessuna')}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          {task.completedAt && (
            <div className="mt-2 text-xs text-success">Completato il {formatDateTime(task.completedAt)}</div>
          )}
        </div>
      </div>
    </aside>
  )
}
