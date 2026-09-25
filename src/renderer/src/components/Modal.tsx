import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 520
}: {
  title: string
  onClose(): void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 pt-[10vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      data-modal
    >
      <div role="dialog" aria-label={title} className="flex max-h-[80vh] flex-col rounded-xl border border-line bg-surface shadow-pop" style={{ width }}>
        <div className="flex items-center border-b border-line px-4 py-3">
          <h2 className="flex-1 font-semibold">{title}</h2>
          <button className="icon-btn" onClick={onClose} title="Chiudi (Esc)">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel
}: {
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm(): void
  onCancel(): void
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={440}
      footer={
        <>
          <button className="btn" onClick={onCancel}>
            Annulla
          </button>
          <button
            autoFocus
            className={danger ? 'btn-primary bg-danger' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-muted">{message}</div>
    </Modal>
  )
}
