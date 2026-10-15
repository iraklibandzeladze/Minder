import { useEffect, useState, type FormEvent } from 'react'
import { Check, Clock, Crown, Minus } from 'lucide-react'
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

const PLAN_FEATURES: { label: string; free: string; pro: string; freeOn: boolean }[] = [
  { label: 'ცხრილები', free: '5', pro: 'ულიმიტო', freeOn: true },
  { label: 'ნოუთები', free: '15', pro: 'ულიმიტო', freeOn: true },
  { label: 'გაზიარება', free: 'არა', pro: 'კი', freeOn: false },
  { label: 'პაროლით დაცვა', free: 'არა', pro: 'კი', freeOn: false },
  { label: 'ლექსიკონი', free: 'არა', pro: 'კი', freeOn: false },
]

function PlanPicker({ user }: { user: User }) {
  const requestPro = useRequestPro()
  const cancelRequest = useCancelProRequest()
  const [note, setNote] = useState('')
  const [pickingPro, setPickingPro] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPro = user.plan === 'pro' || user.is_admin
  const pending = user.pro_requested_at != null
  const limits = user.limits

  async function choosePro() {
    if (isPro) return
    if (pending) return
    setError(null)
    try {
      await requestPro.mutateAsync({ note: note.trim() || undefined })
      setPickingPro(false)
      setNote('')
    } catch (err) {
      setError(apiMessage(err, 'მოთხოვნა ვერ გაიგზავნა'))
    }
  }

  async function stayFree() {
    setError(null)
    setPickingPro(false)
    if (pending) {
      try {
        await cancelRequest.mutateAsync()
      } catch (err) {
        setError(apiMessage(err, 'გაუქმება ვერ მოხერხდა'))
      }
    }
  }

  return (
    <section className="plan-picker">
      <header className="plan-picker-head">
        <div>
          <h2>გეგმა</h2>
          <p className="muted">აირჩიე უფასო ან Pro — Pro-ს ადმინი ადასტურებს.</p>
        </div>
        <p className="plan-usage-line muted">
          გამოყენებული: ცხრილები {usage(limits.sheets_used, limits.max_sheets)} · ნოუთები{' '}
          {usage(limits.notes_used, limits.max_notes)}
          {limits.can_dictionary
            ? ` · სიტყვები ${usage(limits.words_used, limits.max_words)}`
            : ''}
        </p>
      </header>

      <div className="plan-options">
        <article className={`plan-option ${!isPro ? 'is-current' : ''}`}>
          <div className="plan-option-head">
            <strong>უფასო</strong>
            {!isPro && !pending && <span className="plan-badge">აქტიური</span>}
            {!isPro && pending && <span className="plan-badge muted">მიმდინარე</span>}
          </div>
          <ul className="plan-feature-list">
            {PLAN_FEATURES.map((f) => (
              <li key={f.label} className={f.freeOn ? '' : 'is-off'}>
                {f.freeOn ? <Check size={14} /> : <Minus size={14} />}
                <span>
                  {f.label}: <strong>{f.free}</strong>
                </span>
              </li>
            ))}
          </ul>
          {isPro ? (
            <p className="muted plan-option-hint">Pro-დან უფასოზე ადმინი გადაგიყვანს.</p>
          ) : pending ? (
            <button
              type="button"
              className="btn-ghost"
              disabled={cancelRequest.isPending}
              onClick={() => void stayFree()}
            >
              უფასოზე დარჩენა
            </button>
          ) : (
            <button type="button" className="btn-ghost" disabled>
              არჩეული
            </button>
          )}
        </article>

        <article className={`plan-option is-pro ${isPro ? 'is-current' : ''} ${pending ? 'is-pending' : ''}`}>
          <div className="plan-option-head">
            <strong>
              <Crown size={14} /> Pro
            </strong>
            {isPro && <span className="plan-badge">აქტიური</span>}
            {pending && (
              <span className="plan-badge is-wait">
                <Clock size={12} /> ელოდება
              </span>
            )}
          </div>
          <ul className="plan-feature-list">
            {PLAN_FEATURES.map((f) => (
              <li key={f.label}>
                <Check size={14} />
                <span>
                  {f.label}: <strong>{f.pro}</strong>
                </span>
              </li>
            ))}
          </ul>

          {isPro ? (
            <button type="button" className="btn-ghost" disabled>
              არჩეული
            </button>
          ) : pending ? (
            <p className="muted plan-option-hint">ადმინი დაადასტურებს — მერე Pro ჩაირთვება.</p>
          ) : pickingPro ? (
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
                <button type="button" className="btn-ghost" onClick={() => setPickingPro(false)}>
                  უკან
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={requestPro.isPending}
                  onClick={() => void choosePro()}
                >
                  {requestPro.isPending ? 'იგზავნება…' : 'Pro-ის არჩევა'}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-primary" onClick={() => setPickingPro(true)}>
              Pro-ის არჩევა
            </button>
          )}
        </article>
      </div>

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

        <PlanPicker user={user} />

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
