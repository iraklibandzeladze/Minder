import { PasswordRecoveryPage } from '@/components/PasswordRecoveryPage'
import { AuthScreen } from '@/components/AuthScreen'
import { InviteAcceptPage } from '@/components/InviteAcceptPage'
import { MinderApp } from '@/components/MinderApp'
import { useMe } from '@/hooks/useAuth'
import { readInviteTokenFromPath } from '@/hooks/useShares'

export default function App() {
  const me = useMe()
  const inviteToken = readInviteTokenFromPath()

  if (window.location.pathname === '/forgot-password') return <PasswordRecoveryPage />
  if (window.location.pathname === '/reset-password') return <PasswordRecoveryPage reset />

  if (me.isLoading) {
    return (
      <div className="auth-shell">
        <p className="muted">იტვირთება…</p>
      </div>
    )
  }

  if (inviteToken) {
    return <InviteAcceptPage token={inviteToken} user={me.data ?? null} />
  }

  if (!me.data) {
    return <AuthScreen />
  }

  return <MinderApp user={me.data} />
}
