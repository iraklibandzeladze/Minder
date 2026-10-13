export function currentYearMonth(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return currentYearMonth(date)
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Intl.DateTimeFormat('ka-GE', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  )
}

export const STATUS_ORDER = ['paid', 'pending', 'partial'] as const

export function nextStatus(status: (typeof STATUS_ORDER)[number]): (typeof STATUS_ORDER)[number] {
  const index = STATUS_ORDER.indexOf(status)
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length]
}
