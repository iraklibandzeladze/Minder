import { useState } from 'react'
import { CheckCircle2, LogIn } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { AuthScreen } from '@/components/AuthScreen'
import { useAcceptInvite, useInvitePreview, clearInvitePath } from '@/hooks/useShares'
import type { User } from '@/lib/types'

function roleLabel(role: string): string {
  if (role === 'moderator') return 'მოდერატორი'
  if (role === 'viewer') return 'მხოლოდ ნახვა'
  return role
}

export function InviteAcceptPage({
  token,
  user,
}: {
  token: string
  user: User | null
}) {
  const preview = useInvitePreview(token)
  const accept = useAcceptInvite()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function acceptInvite() {
    setError(null)
    try {
      await accept.mutateAsync(token)
      setDone(true)
      window.setTimeout(() => {
        clearInvitePath()
        window.location.assign('/')
      }, 900)
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string }
        setError(body.message ?? 'მოწვევის მიღება ვერ მოხერხდა')
        return
      }
      setError('ქსელის შეცდომა')
    }
  }

  if (preview.isLoading) {
    return (
      <div className="auth-shell">
        <p className="muted">მოწვევა იტვირთება…</p>
      </div>
    )
  }

  if (preview.isError || !preview.data) {
    return (
      <div className="auth-shell">
        <div className="invite-card">
          <h1>მოწვევა მიუწვდომელია</h1>
          <p className="muted">ბმული ვადაგასულია, გაუქმებულია ან არასწორია.</p>
          <button type="button" className="btn-primary" onClick={() => window.location.assign('/')}>
            მთავარზე დაბრუნება
          </button>
        </div>
      </div>
    )
  }

  const invite = preview.data
  const kindLabel = invite.shareable_type === 'note' ? 'ნოუთი' : 'ცხრილი'

  if (!user) {
    return (
      <div className="invite-auth-wrap">
        <div className="invite-banner">
          <LogIn size={16} />
          <div>
            <strong>
              {invite.inviter_name} გიწვევს: {kindLabel} „{invite.resource_title}“
            </strong>
            <p className="muted">
              შედი ან დარეგისტრირდი ელფოსტით <em>{invite.email}</em> · როლი:{' '}
              {roleLabel(invite.role)}
            </p>
          </div>
        </div>
        <AuthScreen
          forcedEmail={invite.email}
          initialMode="register"
          inviteHint="მოწვევის მისაღებად გამოიყენე ზუსტად ეს ელფოსტა"
        />
      </div>
    )
  }

  const emailMismatch = user.email.toLowerCase() !== invite.email.toLowerCase()

  return (
    <div className="auth-shell">
      <div className="invite-card">
        {done ? (
          <>
            <div className="invite-success" aria-hidden>
              <CheckCircle2 size={28} />
            </div>
            <h1>მოწვევა მიღებულია</h1>
            <p className="muted">გადაგიყვანთ აპლიკაციაში…</p>
          </>
        ) : (
          <>
            <p className="invite-kicker">მოწვევა</p>
            <h1>
              {kindLabel}: {invite.resource_title}
            </h1>
            <p className="muted">
              {invite.inviter_name} გიწვევს როლით: <strong>{roleLabel(invite.role)}</strong>
            </p>
            {emailMismatch ? (
              <p className="error">
                შედიხარ როგორც {user.email}, მოწვევა კი {invite.email}-ზეა. გამოდი და შედი
                სწორი ანგარიშით.
              </p>
            ) : (
              error && <p className="error">{error}</p>
            )}
            <div className="invite-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  clearInvitePath()
                  window.location.assign('/')
                }}
              >
                გაუქმება
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={emailMismatch || accept.isPending}
                onClick={() => void acceptInvite()}
              >
                {accept.isPending ? 'მიღება…' : 'მოწვევის მიღება'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
