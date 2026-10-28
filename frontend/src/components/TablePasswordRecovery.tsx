import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UnlockModal } from '@/components/UnlockModal'
import { useMe } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import type { Sheet } from '@/lib/types'
import { unwrapData } from '@/lib/unwrap'

export function TablePasswordRecovery({ sheet, onClose }: { sheet: Sheet; onClose: () => void }) {
  const me = useMe()
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  return <UnlockModal title={sheet.name} kindLabel="ცხრილის პაროლის აღდგენა"
    hint={me.data?.has_password ? 'შეიყვანე ანგარიშის მთავარი პაროლი. ცხრილის ცალკე პაროლი მოიხსნება.' : 'ჯერ ანგარიშის პაროლი დააყენე აღდგენის ბმულით, შემდეგ დაბრუნდი აქ.'}
    submitLabel="ცხრილის პაროლის მოხსნა" busy={busy} onClose={onClose}
    footer={<a href="/forgot-password">ანგარიშის პაროლის აღდგენა ელფოსტით</a>}
    onSubmit={async password => {
      setBusy(true)
      try {
        const updated = unwrapData(await api<{ data: Sheet }>(`/api/sheets/${sheet.id}/recover-password`, { method: 'POST', body: JSON.stringify({ account_password: password }) }))
        client.setQueryData<Sheet[]>(['sheets'], prev => prev?.map(current => current.id === sheet.id ? updated : current))
        onClose()
      } finally { setBusy(false) }
    }} />
}
