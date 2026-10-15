import { useEffect, useState, type FormEvent } from 'react'
import { Check, Clock, Crown } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { useCancelProRequest, useLogout, useRequestPro, useUpdateProfile } from '@/hooks/useAuth'
import type { User } from '@/lib/types'

function apiMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string; errors?: Record<string, string[]> }
    return body.message ?? Object.values(body.errors ?? {})[0]?.[0] ?? fallback
  }
  return 'ქსელის შეცდომა'
}

function usage(used: number, max: number | null): string {
  return max == null ? `${used} / ∞` : `${used} / ${max}`
}

const PRO_PERKS = [
  'ულიმიტო ცხრილები, ნოუთები და სიტყვები',
  'ცხრილების და ნოუთების გაზიარება სხვებთან',
  'პაროლით დაცვა',
]

function PlanCard({ user }: { user: User }) {
  const requestPro = useRequestPro()
  const cancelRequest = useCancelProRequest()
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPro = user.plan === 'pro' || user.is_admin
  const pending = user.pro_requested_at != null
  const limits = user.limits

  async function submit() {
    setError(null)
    try {
      await requestPro.mutateAsync({ note: note.trim() || undefined })
      setOpen(false)
      setNote('')
    } catch (err) {
      setError(apiMessage(err, 'მოთხოვნა ვერ გაიგზავნა'))
    }
  }

  async function cancel() {
    setError(null)
    try {
      await cancelRequest.mutateAsync()
    } catch (err) {
      setError(apiMessage(err, 'გაუქმება ვერ მოხერხდა'))
    }
  }

  return (
    <section className={`plan-card ${isPro ? 'is-pro' : ''}`}>
      <div className="plan-card-head">
        <div className="plan-card-title">
          <Crown size={16} />
          <strong>{isPro ? 'Pro' : 'უფასო გეგმა'}</strong>
          {user.is_admin && <span className="muted">· ადმინი</span>}
        </div>
        {!isPro && !pending && (
          <button type="button" className="btn-primary" onClick={() => setOpen((v) => !v)}>
            Pro-ზე გადასვლა
          </button>
        )}
      </div>

      <ul className="plan-usage">
        <li>
          <span className="muted">ცხრილები</span>
          <strong>{usage(limits.sheets_used, limits.max_sheets)}</strong>
        </li>
        <li>
          <span className="muted">ნოუთები</span>
          <strong>{usage(limits.notes_used, limits.max_notes)}</strong>
        </li>
        <li>
          <span className="muted">სიტყვები</span>
          <strong>{usage(limits.words_used, limits.max_words)}</strong>
        </li>
      </ul>

      {isPro ? (
        <ul className="plan-perks">
          {PRO_PERKS.map((p) => (
            <li key={p}>
              <Check size={14} /> {p}
            </li>
          ))}
        </ul>
      ) : pending ? (
        <div className="plan-pending">
          <p>
            <Clock size={14} /> მოთხოვნა გაგზავნილია — ელოდება ადმინის დადასტურებას. Pro-ს
            გააქტიურებისას ელფოსტაზე შეტყობინება მოგივა.
          </p>
          <button
            type="button"
            className="btn-ghost"
            disabled={cancelRequest.isPending}
            onClick={() => void cancel()}
          >
            მოთხოვნის გაუქმება
          </button>
        </div>
      ) : (
        <>
          <ul className="plan-perks muted">
            {PRO_PERKS.map((p) => (
              <li key={p}>
                <Check size={14} /> {p}
              </li>
            ))}
          </ul>
          {open && (
            <div className="plan-request-form">
              <label>
                შეტყობინება ადმინისთვის (არასავალდებულო)
                <textarea
                  rows={2}
                  value={note}
                  maxLength={500}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="მაგ. რისთვის გჭირდება Pro"
                />
              </label>
              <div className="plan-request-actions">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  გაუქმება
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={requestPro.isPending}
                  onClick={() => void submit()}
                >
                  {requestPro.isPending ? 'იგზავნება…' : 'მოთხოვნის გაგზავნა'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="error">{error}</p>}
    </section>
  )
}

export function ProfileView({ user }: { user: User }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const update = useUpdateProfile()
  const logout = useLogout()

  useEffect(() => {
    setName(user.name)
    setEmail(user.email)
  }, [user.name, user.email])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)

    const changingPassword = password.length > 0
    if (changingPassword && password !== passwordConfirmation) {
      setError('ახალი პაროლები არ ემთხვევა.')
      return
    }

    try {
      await update.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        ...(changingPassword
          ? {
              ...(user.has_password ? { current_password: currentPassword } : {}),
              password,
              password_confirmation: passwordConfirmation,
            }
          : {}),
      })
      setCurrentPassword('')
      setPassword('')
      setPasswordConfirmation('')
      setSaved(true)
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string; errors?: Record<string, string[]> }
        setError(
          body.message ??
            Object.values(body.errors ?? {})[0]?.[0] ??
            'შენახვა ვერ მოხერხდა',
        )
        return
      }
      setError('ქსელის შეცდომა')
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <header className="profile-header">
          <div className="profile-avatar" aria-hidden>
            {(user.name.trim()[0] ?? 'U').toUpperCase()}
          </div>
          <div>
            <h1>პროფილი</h1>
            <p className="muted">ანგარიშის მონაცემები და პაროლი</p>
          </div>
        </header>

        <PlanCard user={user} />

        <form className="profile-form" onSubmit={onSubmit}>
          <label>
            სახელი
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              maxLength={80}
            />
          </label>

          <label>
            ელფოსტა
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <div className="profile-section">
            <h2>{user.has_password ? 'პაროლის შეცვლა' : 'პაროლის დაყენება'}</h2>
            <p className="muted profile-hint">
              {user.has_password
                ? 'ცარიელი დატოვე, თუ პაროლის შეცვლა არ გინდა.'
                : 'ანგარიში Google/Facebook-ით შეიქმნა. პაროლი დააყენე, თუ ელფოსტითაც გინდა შესვლა.'}
            </p>

            {user.has_password && (
              <label>
                მიმდინარე პაროლი
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
            )}

            <label>
              ახალი პაროლი
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </label>

            <label>
              ახალი პაროლი (გამეორება)
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </label>
          </div>

          {error && <p className="error">{error}</p>}
          {saved && !error && <p className="profile-success">შეინახა.</p>}

          <div className="profile-actions">
            <button type="submit" className="btn-primary" disabled={update.isPending}>
              {update.isPending ? 'ინახება…' : 'შენახვა'}
            </button>
            <button
              type="button"
              className="btn-ghost profile-logout"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              გასვლა
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
