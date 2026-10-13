import type { CustomColumn, SheetRow } from '@/lib/types'

export type ColumnRole = 'payable' | 'paid' | 'remaining'

export type PaymentStatusLabel = 'მოლოდინში' | 'ნაწილობრივი' | 'გადახდილი' | ''

export function parseMoney(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  return Number.isNaN(n) ? null : n
}

export function findRoleColumn(
  columns: CustomColumn[],
  role: ColumnRole,
): CustomColumn | undefined {
  return columns.find((c) => c.role === role)
}

export function rowPayablePaid(
  row: SheetRow,
  payableCol: CustomColumn | undefined,
  paidCol: CustomColumn | undefined,
): { payable: number | null; paid: number | null } {
  return {
    payable: payableCol ? parseMoney(row.values?.[payableCol.slug]) : null,
    paid: paidCol ? parseMoney(row.values?.[paidCol.slug]) : null,
  }
}

export function derivePaymentStatus(
  payable: number | null,
  paid: number | null,
): { label: PaymentStatusLabel; warn: string | null } {
  const hasPayable = payable != null
  const hasPaid = paid != null
  const p = payable ?? 0
  const d = paid ?? 0

  if (!hasPayable && !hasPaid) {
    return { label: '', warn: null }
  }

  if (!hasPayable && hasPaid) {
    return { label: 'გადახდილი', warn: 'გადასახდელი ცარიელია' }
  }

  if (hasPaid && d > p) {
    return { label: 'გადახდილი', warn: 'გადახდილი აღემატება გადასახდელს' }
  }

  if (!hasPaid || d <= 0) {
    return { label: 'მოლოდინში', warn: null }
  }

  if (d + 0.0001 >= p) {
    return { label: 'გადახდილი', warn: null }
  }

  return { label: 'ნაწილობრივი', warn: null }
}

export function rowRemaining(payable: number | null, paid: number | null): number | null {
  if (payable == null) return null
  return Math.max(payable - (paid ?? 0), 0)
}

export function paymentTotals(
  rows: SheetRow[],
  payableCol: CustomColumn | undefined,
  paidCol: CustomColumn | undefined,
  isBlank: (row: SheetRow) => boolean,
): { payableSum: number; paidSum: number; remainingSum: number } {
  let payableSum = 0
  let paidSum = 0
  let remainingSum = 0

  for (const row of rows) {
    if (isBlank(row)) continue
    const { payable, paid } = rowPayablePaid(row, payableCol, paidCol)
    if (payable != null) payableSum += payable
    if (paid != null) paidSum += paid
    const rem = rowRemaining(payable, paid)
    if (rem != null) remainingSum += rem
  }

  return { payableSum, paidSum, remainingSum }
}
