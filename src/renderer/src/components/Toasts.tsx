import { AlertCircle, CheckCircle2, Undo2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../lib/ui'
import { useStore, type Toast } from '../store'

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useStore((s) => s.dismissToast)
  const [left, setLeft] = useState(Math.ceil(toast.timeoutMs / 1000))

  useEffect(() => {
    const end = Date.now() + toast.timeoutMs
    const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 250)
    const close = setTimeout(() => dismiss(toast.id), toast.timeoutMs)
    return () => {
      clearInterval(tick)
      clearTimeout(close)
    }
  }, [toast, dismiss])

  const Icon = toast.kind === 'error' ? AlertCircle : toast.kind === 'undo' ? Undo2 : CheckCircle2
  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className="flex max-w-lg items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-pop"
    >
      <Icon size={16} className={cn('shrink-0', toast.kind === 'error' ? 'text-danger' : 'text-muted')} />
      <span className="min-w-0 flex-1 break-words">{toast.message}</span>
      {toast.action && (
        <button
          className="shrink-0 rounded px-2 py-0.5 font-medium text-accent hover:bg-accent-soft"
          onClick={() => {
            toast.action!.run()
            dismiss(toast.id)
          }}
        >
          {toast.action.label}
          {toast.kind === 'undo' && <span className="ml-1 text-xs text-subtle">{left}s</span>}
        </button>
      )}
      <button className="shrink-0 text-subtle hover:text-fg" onClick={() => dismiss(toast.id)} title="Chiudi">
        <X size={14} />
      </button>
    </div>
  )
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  )
}
