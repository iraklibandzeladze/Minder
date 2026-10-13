import { cn } from '@/lib/cn'
import type { TransactionStatus } from '@/lib/types'

const LABELS: Record<TransactionStatus, string> = {
  paid: 'გადახდილი',
  pending: 'მოლოდინში',
  partial: 'ნაწილობრივი',
}

export function StatusBadge({
  status,
  onClick,
}: {
  status: TransactionStatus
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'status-badge',
        status === 'paid' && 'status-paid',
        status === 'pending' && 'status-pending',
        status === 'partial' && 'status-partial',
      )}
    >
      {LABELS[status]}
    </button>
  )
}
