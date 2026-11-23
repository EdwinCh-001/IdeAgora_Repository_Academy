import { useEffect, useRef } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

interface NotificationModalProps {
  errorMessage?: string
  successMessage?: string
  onClose: () => void
}

export function NotificationModal({
  errorMessage,
  successMessage,
  onClose,
}: NotificationModalProps) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLElement>(null)
  const kind = errorMessage ? 'error' : successMessage ? 'success' : null
  const message = errorMessage || successMessage || ''
  const title =
    kind === 'error'
      ? 'No se pudo completar'
      : kind === 'success'
        ? 'Operación completada'
        : ''
  const Icon =
    kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle2 : Info

  useEffect(() => {
    if (!kind) return
    closeButton.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return

      const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>(
        'button:not(:disabled)',
      )
      if (!buttons?.length) return

      const firstButton = buttons[0]
      const lastButton = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === firstButton) {
        event.preventDefault()
        lastButton.focus()
      } else if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault()
        firstButton.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [kind, message, onClose])

  return (
    <AnimatePresence>
      {kind && (
        <m.div
          className="notification-backdrop"
          key={`${kind}-${message}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <m.section
            ref={dialog}
            className={`notification-dialog is-${kind}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="notification-title"
            aria-describedby="notification-message"
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <span className="notification-icon">
              <Icon size={21} aria-hidden="true" />
            </span>
            <div className="notification-copy">
              <h2 id="notification-title">{title}</h2>
              <p id="notification-message">{message}</p>
            </div>
            <button
              ref={closeButton}
              className="notification-close"
              type="button"
              aria-label="Cerrar notificación"
              onClick={onClose}
            >
              <X size={17} aria-hidden="true" />
            </button>
            <button
              className="button button-primary notification-confirm"
              type="button"
              onClick={onClose}
            >
              Entendido
            </button>
          </m.section>
        </m.div>
      )}
    </AnimatePresence>
  )
}
