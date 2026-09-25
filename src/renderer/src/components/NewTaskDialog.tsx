import { useState } from 'react'
import { api, errorMessage } from '../lib/ui'
import { useStore } from '../store'
import { Modal } from './Modal'
import { EMPTY_DRAFT, TaskFields, type TaskDraft } from './TaskFields'

export function NewTaskDialog() {
  const setOpen = useStore((s) => s.setNewTaskOpen)
  const defaultAreaId = useStore((s) => s.settings?.defaultAreaId ?? null)
  const select = useStore((s) => s.select)
  const [draft, setDraft] = useState<TaskDraft>({ ...EMPTY_DRAFT, areaId: defaultAreaId })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(): Promise<void> {
    if (!draft.title.trim() || busy) return
    setBusy(true)
    try {
      const task = await api.invoke('tasks:create', {
        title: draft.title,
        notes: draft.notes || null,
        priority: draft.priority,
        areaId: draft.areaId,
        dueDate: draft.dueDate || null,
        dueTime: draft.dueTime || null,
        people: draft.people,
        tags: draft.tags,
        startDate: draft.startDate || null,
        estimateMin: draft.estimateMin,
        waiting: draft.waiting,
        recurrence: draft.recurrence
      })
      setOpen(false)
      select(task.id, false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Nuovo task"
      onClose={() => setOpen(false)}
      footer={
        <>
          {error && <span className="mr-auto self-center text-sm text-danger">{error}</span>}
          <button className="btn" onClick={() => setOpen(false)}>
            Annulla
          </button>
          <button className="btn-primary" disabled={!draft.title.trim() || busy} onClick={() => void save()} title="Ctrl+Invio">
            Salva
          </button>
        </>
      }
    >
      <div
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault()
            void save()
          }
        }}
      >
        <TaskFields value={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} autoFocusTitle />
      </div>
    </Modal>
  )
}
