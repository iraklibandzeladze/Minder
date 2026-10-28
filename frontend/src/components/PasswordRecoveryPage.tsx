import { useState } from 'react'
import { api, csrf, ApiError } from '@/lib/api'

export function PasswordRecoveryPage({ reset = false }: { reset?: boolean }) {
  const params = new URLSearchParams(window.location.search)
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  return <div className="auth-shell"><form className="auth-card" onSubmit={async e => {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      await csrf()
      await api(`/api/${reset ? 'reset-password' : 'forgot-password'}`, { method: 'POST', body: JSON.stringify(reset ? { email, token: params.get('token'), password, password_confirmation: confirmation } : { email }) })
      setDone(true)
    } catch (err) { setError(err instanceof ApiError ? Object.values((err.body as { errors?: Record<string, string[]> }).errors ?? {})[0]?.[0] ?? 'მოთხოვნა ვერ შესრულდა. სცადე მოგვიანებით.' : 'ქსელის შეცდომა') }
    finally { setBusy(false) }
  }}>
    <p className="brand">Minder</p><h1>{reset ? 'ახალი პაროლი' : 'პაროლის აღდგენა'}</h1>
    {done ? <p role="status">{reset ? 'პაროლი განახლდა. შედი ახალი პაროლით.' : 'თუ ანგარიში არსებობს, აღდგენის ბმულს ელფოსტაზე მიიღებ.'}</p> : <>
      <label>ელფოსტა<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      {reset && <><label>ახალი პაროლი<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label><label>გაიმეორე პაროლი<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label></>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? 'იტვირთება…' : reset ? 'პაროლის განახლება' : 'ბმულის გამოგზავნა'}</button>
    </>}
    <a href="/dashboard" className="btn-ghost">შესვლაზე დაბრუნება</a>
    {reset && <a href="/forgot-password">ახალი ბმულის მოთხოვნა</a>}
  </form></div>
}
