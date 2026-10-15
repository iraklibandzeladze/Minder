import { useEffect, useState, type FormEvent } from 'react'
import { Moon, Sun } from 'lucide-react'
import { PwaInstallButton } from '@/components/PwaInstallButton'
import { ApiError } from '@/lib/api'
import { consumeSocialAuthError, startSocialLogin, useLogin, useRegister } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import type { SocialProvider } from '@/lib/types'

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.2v3.1C3.2 21.3 7.3 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3c-.3-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.2C.4 8.2 0 10.1 0 12s.4 3.8 1.2 5.4l4.1-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4.1 3.1c.9-2.9 3.6-4.9 6.7-4.9z"
      />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z"
      />
    </svg>
  )
}

export function AuthScreen({
  forcedEmail,
  initialMode = 'login',
  inviteHint,
}: {
  forcedEmail?: string
  initialMode?: 'login' | 'register'
  inviteHint?: string
} = {}) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState(forcedEmail ?? 'demo@minder.ge')
  const [password, setPassword] = useState(forcedEmail ? '' : 'password')
  const [error, setError] = useState<string | null>(() => consumeSocialAuthError())
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null)
  const login = useLogin()
  const register = useRegister()
  const { theme, toggleTheme } = useTheme()
  const busy = login.isPending || register.isPending || socialBusy !== null
  const emailLocked = Boolean(forcedEmail)

  useEffect(() => {
    if (forcedEmail) setEmail(forcedEmail)
  }, [forcedEmail])

  function onSocial(provider: SocialProvider) {
    setError(null)
    setSocialBusy(provider)
    startSocialLogin(provider)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      if (mode === 'login') {
        await login.mutateAsync({ email, password })
      } else {
        await register.mutateAsync({
          name: name || 'მომხმარებელი',
          email,
          password,
          password_confirmation: password,
        })
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string; errors?: Record<string, string[]> }
        setError(
          body.message ??
            Object.values(body.errors ?? {})[0]?.[0] ??
            'ავტორიზაცია ვერ მოხერხდა',
        )
        return
      }
      setError('ქსელის შეცდომა')
    }
  }

  return (
    <div className="auth-shell">
      <button
        type="button"
        className="btn-icon auth-theme-toggle"
        title={theme === 'night' ? 'დღის რეჟიმი' : 'ღამის რეჟიმი'}
        onClick={toggleTheme}
      >
        {theme === 'night' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="brand">Minder</p>
        <h1>{mode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}</h1>
        <p className="muted">
          {inviteHint ?? 'მოქნილი ცხრილები · ყოველთვიური ხარჯები · კალკულატორი'}
        </p>

        <div className="social-auth">
          <button
            type="button"
            className="btn-social"
            disabled={busy}
            onClick={() => onSocial('google')}
          >
            <GoogleMark />
            {socialBusy === 'google' ? 'გადამისამართება…' : 'Google-ით გაგრძელება'}
          </button>
          <button
            type="button"
            className="btn-social"
            disabled={busy}
            onClick={() => onSocial('facebook')}
          >
            <FacebookMark />
            {socialBusy === 'facebook' ? 'გადამისამართება…' : 'Facebook-ით გაგრძელება'}
          </button>
        </div>

        <div className="auth-divider">
          <span>ან ელფოსტით</span>
        </div>

        {mode === 'register' && (
          <label>
            სახელი
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        )}

        <label>
          ელფოსტა
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            readOnly={emailLocked}
          />
        </label>

        <label>
          პაროლი
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'იტვირთება…' : mode === 'login' ? 'შესვლა' : 'ანგარიშის შექმნა'}
        </button>

        <button
          type="button"
          className="btn-ghost"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'ახალი ანგარიში' : 'უკვე მაქვს ანგარიში'}
        </button>

        <PwaInstallButton variant="card" />

        {!forcedEmail && <p className="hint">დემო: demo@minder.ge / password</p>}
      </form>
    </div>
  )
}
