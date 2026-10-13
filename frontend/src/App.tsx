import { AuthScreen } from '@/components/AuthScreen'
import { InviteAcceptPage } from '@/components/InviteAcceptPage'
import { LedgerApp } from '@/components/LedgerApp'
import { useMe } from '@/hooks/useAuth'
import { readInviteTokenFromPath } from '@/hooks/useShares'

export default function App() {
  const me = useMe()
  const inviteToken = readInviteTokenFromPath()

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

  return <LedgerApp user={me.data} />
}
