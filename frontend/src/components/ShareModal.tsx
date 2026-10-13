import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Link2, Mail, UserPlus, X } from 'lucide-react'
import { ApiError } from '@/lib/api'
import {
  useCreateShare,
  useRevokeShare,
  useShares,
} from '@/hooks/useShares'
import type { ShareableType, ShareRole, ResourceShare } from '@/lib/types'

const ROLES: { value: ShareRole; label: string; hint: string }[] = [
  { value: 'moderator', label: 'მოდერატორი', hint: 'შეუძლია რედაქტირება' },
  { value: 'viewer', label: 'მხოლოდ ნახვა', hint: 'მხოლოდ ნახვა, ცვლილების გარეშე' },
]

function roleLabel(role: ShareRole): string {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

function statusLabel(status: string): string {
  if (status === 'accepted') return 'მიღებული'
  if (status === 'pending') return 'მოლოდინში'
  return status
}

export function ShareModal({
  shareableType,
  shareableId,
  title,
  canInviteModerator,
  onClose,
}: {
  shareableType: ShareableType
  shareableId: number
  title: string
  canInviteModerator: boolean
  onClose: () => void
}) {
  const shares = useShares(shareableType, shareableId)
  const createShare = useCreateShare(shareableType, shareableId)
  const revokeShare = useRevokeShare(shareableType, shareableId)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShareRole>('viewer')
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const availableRoles = canInviteModerator
    ? ROLES
    : ROLES.filter((r) => r.value === 'viewer')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function onInvite(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createShare.mutateAsync({
        email: email.trim(),
        role,
      })
      setEmail('')
      setRole('viewer')
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string; errors?: Record<string, string[]> }
        setError(
          body.message ??
            Object.values(body.errors ?? {})[0]?.[0] ??
            'მოწვევა ვერ გაიგზავნა',
        )
        return
      }
      setError('ქსელის შეცდომა')
    }
  }

  async function copyLink(share: ResourceShare) {
    if (!share.invite_url) return
    await navigator.clipboard.writeText(share.invite_url)
    setCopiedId(share.id)
    window.setTimeout(() => setCopiedId(null), 1500)
  }

  const list = shares.data ?? []

  return createPortal(
    <div className="lock-backdrop" role="presentation">
      <div
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="share-dialog-close" onClick={onClose} aria-label="დახურვა">
          <X size={16} />
        </button>

        <header className="share-dialog-head">
          <div className="share-dialog-badge" aria-hidden>
            <UserPlus size={20} />
          </div>
          <div>
            <p className="share-dialog-kicker">გაზიარება</p>
            <h3 id="share-dialog-title">{title}</h3>
            <p className="muted">მოიწვიე ელფოსტით — მოდერატორი ან მხოლოდ ნახვა</p>
          </div>
        </header>

        <form className="share-invite-form" onSubmit={(e) => void onInvite(e)}>
          <label className="pwd-field">
            <span>ელფოსტა</span>
            <div className="pwd-input-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="name@example.com"
                required
                autoFocus
              />
              <span className="pwd-visibility" aria-hidden>
                <Mail size={15} />
              </span>
            </div>
          </label>

          <div className="share-role-grid" role="radiogroup" aria-label="როლი">
            {availableRoles.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`share-role-card ${role === opt.value ? 'active' : ''}`}
                onClick={() => setRole(opt.value)}
              >
                <strong>{opt.label}</strong>
                <span>{opt.hint}</span>
              </button>
            ))}
          </div>

          {error && <p className="error">{error}</p>}

          <button
            type="submit"
            className="btn-primary share-invite-submit"
            disabled={createShare.isPending || email.trim() === ''}
          >
            {createShare.isPending ? 'იგზავნება…' : 'მოწვევის გაგზავნა'}
          </button>
        </form>

        <div className="share-list">
          <h4>მოწვეულები</h4>
          {shares.isLoading && <p className="muted">იტვირთება…</p>}
          {!shares.isLoading && list.length === 0 && (
            <p className="muted">ჯერ არავინაა მოწვეული.</p>
          )}
          {list.map((share) => (
            <div key={share.id} className="share-list-item">
              <div className="share-list-meta">
                <strong>{share.member_name ?? share.email}</strong>
                <span className="muted">
                  {roleLabel(share.role)} · {statusLabel(share.status)}
                </span>
              </div>
              <div className="share-list-actions">
                {share.status === 'pending' && share.invite_url && (
                  <button
                    type="button"
                    className="btn-icon"
                    title="ბმულის კოპირება"
                    onClick={() => void copyLink(share)}
                  >
                    {copiedId === share.id ? <Link2 size={14} /> : <Copy size={14} />}
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost share-revoke"
                  disabled={revokeShare.isPending}
                  onClick={() => {
                    if (confirm(`გავაუქმოთ წვდომა „${share.email}“-სთვის?`)) {
                      revokeShare.mutate(share.id)
                    }
                  }}
                >
                  გაუქმება
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
