import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff, LockKeyhole, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api'

export function UnlockModal({
  title,
  kindLabel = 'შიგთავსი',
  hint = 'შიგთავსის სანახავად პაროლი აუცილებელია',
  submitLabel = 'გახსნა',
  busyLabel = 'მოწმდება…',
  variant = 'unlock',
  busy,
  onClose,
  onSubmit,
  footer,
  onForgot,
}: {
  title: string
  footer?: ReactNode
  onForgot?: () => void
  kindLabel?: string
  hint?: string
  submitLabel?: string
  busyLabel?: string
  variant?: 'unlock' | 'danger'
  busy?: boolean
  onClose: () => void
  onSubmit: (password: string) => Promise<void>
}) {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, busy])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = password
    if (trimmed.length < 4) {
      setError('პაროლი მინიმუმ 4 სიმბოლო უნდა იყოს.')
      return
    }
    setError(null)
    try {
      await onSubmit(trimmed)
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string; errors?: Record<string, string[]> }
        setError(
          body.message ??
            Object.values(body.errors ?? {})[0]?.[0] ??
            'ოპერაცია ვერ მოხერხდა',
        )
        return
      }
      setError('ქსელის შეცდომა')
    }
  }

  return createPortal(
    <div className="lock-backdrop" role="presentation">
      <form
        className={`lock-dialog ${variant === 'danger' ? 'lock-dialog-danger' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lock-dialog-title"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="lock-dialog-badge" aria-hidden>
          {variant === 'danger' ? <Trash2 size={22} /> : <LockKeyhole size={22} />}
        </div>

        <div className="lock-dialog-copy">
          <p className="lock-dialog-kicker">{kindLabel}</p>
          <h3 id="lock-dialog-title">{title}</h3>
          <p className="lock-dialog-hint">{hint}</p>
        </div>

        <label className="pwd-field">
          <span>პაროლი</span>
          <div className={`pwd-input-wrap ${error ? 'has-error' : ''}`}>
            <input
              type={visible ? 'text' : 'password'}
              value={password}
              autoFocus
              autoComplete="current-password"
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError(null)
              }}
              placeholder="შეიყვანე პაროლი"
            />
            <button
              type="button"
              className="pwd-visibility"
              title={visible ? 'დამალვა' : 'ჩვენება'}
              aria-label={visible ? 'დამალვა' : 'ჩვენება'}
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        {onForgot && <button type="button" className="btn-ghost" onClick={onForgot}>დაგავიწყდა ცხრილის პაროლი?</button>}
        {footer}
        {error && <p className="error lock-dialog-error">{error}</p>}

        <div className="lock-dialog-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            გაუქმება
          </button>
          <button
            type="submit"
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            disabled={busy || password.length < 4}
          >
            {busy ? busyLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
