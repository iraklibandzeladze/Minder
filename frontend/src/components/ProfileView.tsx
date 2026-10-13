import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '@/lib/api'
import { useLogout, useUpdateProfile } from '@/hooks/useAuth'
import type { User } from '@/lib/types'

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
            <p className="profile-plan-badge">
              გეგმა: <strong>{user.limits?.label ?? (user.plan === 'pro' ? 'Pro' : 'უფასო')}</strong>
              {user.is_admin && <span className="muted"> · ადმინი</span>}
            </p>
          </div>
        </header>

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
