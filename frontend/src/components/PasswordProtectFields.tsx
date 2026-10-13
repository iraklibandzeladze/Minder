import { useState } from 'react'
import { Eye, EyeOff, Shield } from 'lucide-react'

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="pwd-field">
      <span>{label}</span>
      <div className="pwd-input-wrap">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          minLength={4}
          placeholder={placeholder}
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
  )
}

export function PasswordProtectFields({
  enabled,
  onEnabledChange,
  password,
  onPasswordChange,
  confirmation,
  onConfirmationChange,
}: {
  enabled: boolean
  onEnabledChange: (value: boolean) => void
  password: string
  onPasswordChange: (value: string) => void
  confirmation: string
  onConfirmationChange: (value: string) => void
}) {
  const mismatch =
    enabled && confirmation.length > 0 && password.length > 0 && password !== confirmation
  const matched =
    enabled && password.length >= 4 && confirmation.length >= 4 && password === confirmation

  return (
    <div className={`pwd-protect ${enabled ? 'is-on' : ''}`}>
      <button
        type="button"
        className="pwd-protect-toggle"
        aria-pressed={enabled}
        onClick={() => {
          const next = !enabled
          onEnabledChange(next)
          if (!next) {
            onPasswordChange('')
            onConfirmationChange('')
          }
        }}
      >
        <span className="pwd-protect-icon" aria-hidden>
          <Shield size={15} />
        </span>
        <span className="pwd-protect-copy">
          <strong>პაროლით დაცვა</strong>
          <span>{enabled ? 'აქტიური' : 'გამორთული'}</span>
        </span>
        <span className={`pwd-switch ${enabled ? 'on' : ''}`} aria-hidden>
          <span className="pwd-switch-thumb" />
        </span>
      </button>

      {enabled && (
        <div className="pwd-protect-panel">
          <p className="pwd-protect-hint">შიგთავსი გაიხსნება მხოლოდ პაროლით.</p>
          <PasswordInput
            label="პაროლი"
            value={password}
            onChange={onPasswordChange}
            autoComplete="new-password"
            placeholder="მინიმუმ 4 სიმბოლო"
          />
          <PasswordInput
            label="გამეორება"
            value={confirmation}
            onChange={onConfirmationChange}
            autoComplete="new-password"
            placeholder="იგივე პაროლი"
          />
          {mismatch && <p className="pwd-protect-status is-bad">პაროლები არ ემთხვევა</p>}
          {matched && <p className="pwd-protect-status is-ok">პაროლები ემთხვევა</p>}
        </div>
      )}
    </div>
  )
}

export function validatePasswordProtect(
  enabled: boolean,
  password: string,
  confirmation: string,
): string | null {
  if (!enabled) return null
  if (password.length < 4) return 'პაროლი მინიმუმ 4 სიმბოლო უნდა იყოს.'
  if (password !== confirmation) return 'პაროლები არ ემთხვევა.'
  return null
}

export function passwordPayload(
  enabled: boolean,
  password: string,
  confirmation: string,
):
  | { password_protected: false }
  | {
      password_protected: true
      password: string
      password_confirmation: string
    } {
  if (!enabled) return { password_protected: false }
  return {
    password_protected: true,
    password,
    password_confirmation: confirmation,
  }
}
