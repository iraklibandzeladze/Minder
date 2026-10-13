import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { unwrapData } from '@/lib/unwrap'
import type {
  Account,
  Category,
  ColumnType,
  CustomColumn,
  LaravelCollection,
  LedgerTransaction,
  MonthPayload,
  ParsedQuickEntry,
  RecurringTemplate,
  Sheet,
  SheetRow,
  TransactionStatus,
  ColumnRole,
} from '@/lib/types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => unwrapData(await api<LaravelCollection<Account>>('/api/accounts')),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => unwrapData(await api<LaravelCollection<Category>>('/api/categories')),
  })
}

export function useSheets() {
  return useQuery({
    queryKey: ['sheets'],
    queryFn: async () => unwrapData(await api<LaravelCollection<Sheet>>('/api/sheets')),
  })
}

export function useCustomColumns(sheetId: number | undefined) {
  return useQuery({
    queryKey: ['custom-columns', sheetId],
    enabled: sheetId != null,
    queryFn: async () =>
      unwrapData(
        await api<LaravelCollection<CustomColumn>>(
          `/api/custom-columns?sheet_id=${sheetId}`,
        ),
      ),
  })
}

export function useSheetRows(sheetId: number | undefined, yearMonth: string | null) {
  return useQuery({
    queryKey: ['sheet-rows', sheetId, yearMonth],
    enabled: sheetId != null,
    queryFn: async () => {
      const params = new URLSearchParams({ sheet_id: String(sheetId) })
      if (yearMonth) params.set('year_month', yearMonth)
      return unwrapData(await api<LaravelCollection<SheetRow>>(`/api/sheet-rows?${params}`))
    },
  })
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () =>
      unwrapData(await api<LaravelCollection<RecurringTemplate>>('/api/templates')),
  })
}

export function useMonth(yearMonth: string) {
  return useQuery({
    queryKey: ['month', yearMonth],
    queryFn: () => api<MonthPayload>(`/api/month?year_month=${yearMonth}`),
  })
}

export function useTransactions(yearMonth: string, sheetId: number | undefined) {
  return useQuery({
    queryKey: ['transactions', yearMonth, sheetId],
    enabled: sheetId != null,
    queryFn: async () =>
      unwrapData(
        await api<LaravelCollection<LedgerTransaction>>(
          `/api/transactions?year_month=${yearMonth}&sheet_id=${sheetId}`,
        ),
      ),
  })
}

type TransactionPatch = Partial<{
  title: string
  amount: string | number
  amount_paid: string | number
  currency: string
  status: TransactionStatus
  type: 'expense' | 'income' | 'transfer'
  occurred_on: string
  account_id: number | null
  category_id: number | null
  notes: string | null
  custom_fields: Record<string, string | number | null>
}>

function patchTransactionCache(
  rows: LedgerTransaction[] | undefined,
  id: number,
  patch: TransactionPatch,
): LedgerTransaction[] {
  return (rows ?? []).map((row) => {
    if (row.id !== id) return row
    const next = {
      ...row,
      ...patch,
      custom_fields: patch.custom_fields
        ? { ...row.custom_fields, ...patch.custom_fields }
        : row.custom_fields,
    } as LedgerTransaction
    if (patch.status && patch.amount_paid === undefined) {
      const amount = Number(next.amount)
      if (patch.status === 'paid') next.amount_paid = String(amount)
      if (patch.status === 'pending') next.amount_paid = '0.00'
      if (patch.status === 'partial') {
        next.amount_paid = String(Math.max(amount / 2, 0.01).toFixed(2))
      }
      next.status = patch.status
    }
    next.remaining = (Number(next.amount) - Number(next.amount_paid)).toFixed(2)
    return next
  })
}

export function useUpdateTransaction(yearMonth: string, sheetId: number | undefined) {
  const queryClient = useQueryClient()
  const key = ['transactions', yearMonth, sheetId] as const
  return useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: TransactionPatch }) =>
      unwrapData(
        await api<{ data: LedgerTransaction }>(`/api/transactions/${id}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        }),
      ),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<LedgerTransaction[]>(key)
      queryClient.setQueryData<LedgerTransaction[]>(key, (rows) =>
        patchTransactionCache(rows, id, patch),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous)
    },
    onSuccess: (serverRow) => {
      queryClient.setQueryData<LedgerTransaction[]>(key, (rows) =>
        (rows ?? []).map((row) => (row.id === serverRow.id ? serverRow : row)),
      )
      void queryClient.invalidateQueries({ queryKey: ['month', yearMonth] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useDeleteTransaction(yearMonth: string, sheetId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<{ ok: boolean }>(`/api/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions', yearMonth, sheetId] })
      void queryClient.invalidateQueries({ queryKey: ['month', yearMonth] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useApplyTemplate(yearMonth: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (templateId: number) =>
      unwrapData(
        await api<{ data: LedgerTransaction }>(`/api/templates/${templateId}/apply`, {
          method: 'POST',
          body: JSON.stringify({ year_month: yearMonth }),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions', yearMonth] })
      void queryClient.invalidateQueries({ queryKey: ['month', yearMonth] })
    },
  })
}

export function useQuickEntryPreview() {
  return useMutation({
    mutationFn: async (input: string) => {
      const res = await api<{ parsed: ParsedQuickEntry }>('/api/quick-entry/preview', {
        method: 'POST',
        body: JSON.stringify({ input }),
      })
      return res.parsed
    },
  })
}

export function useQuickEntryCommit(yearMonth: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: string) =>
      api<{ data: LedgerTransaction; parsed: ParsedQuickEntry }>('/api/quick-entry', {
        method: 'POST',
        body: JSON.stringify({ input, year_month: yearMonth }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions', yearMonth] })
      void queryClient.invalidateQueries({ queryKey: ['month', yearMonth] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useUpdateMonthNote(yearMonth: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      api<{ id: number; year_month: string; body: string | null }>('/api/month/note', {
        method: 'PUT',
        body: JSON.stringify({ year_month: yearMonth, body }),
      }),
    onSuccess: (note) => {
      queryClient.setQueryData<MonthPayload>(['month', yearMonth], (prev) =>
        prev ? { ...prev, note: { ...prev.note, body: note.body } } : prev,
      )
    },
  })
}

export function useCreateTransaction(yearMonth: string, sheetId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input?: { type?: 'expense' | 'income'; title?: string }) =>
      unwrapData(
        await api<{ data: LedgerTransaction }>('/api/transactions', {
          method: 'POST',
          body: JSON.stringify({
            title: input?.title ?? (input?.type === 'income' ? 'შემოსავალი' : 'ახალი ჩანაწერი'),
            amount: 0,
            currency: 'GEL',
            status: input?.type === 'income' ? 'paid' : 'pending',
            type: input?.type ?? 'expense',
            sheet_id: sheetId,
            occurred_on: `${yearMonth}-${String(new Date().getDate()).padStart(2, '0')}`,
          }),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions', yearMonth, sheetId] })
      void queryClient.invalidateQueries({ queryKey: ['month', yearMonth] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useCreateSheet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      kind: 'table' | 'monthly_expenses' | 'calculator'
      reminders_enabled?: boolean
      password_protected?: boolean
      password?: string
      password_confirmation?: string
    }) =>
      unwrapData(
        await api<{ data: Sheet }>('/api/sheets', {
          method: 'POST',
          body: JSON.stringify({
            name: input.name,
            kind: input.kind,
            reminders_enabled: input.reminders_enabled ?? false,
            password_protected: input.password_protected ?? false,
            password: input.password,
            password_confirmation: input.password_confirmation,
          }),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sheets'] })
      void queryClient.invalidateQueries({ queryKey: ['custom-columns'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useUnlockSheet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: number; password: string }) =>
      unwrapData(
        await api<{ data: Sheet }>(`/api/sheets/${input.id}/unlock`, {
          method: 'POST',
          body: JSON.stringify({ password: input.password }),
        }),
      ),
    onSuccess: (sheet) => {
      queryClient.setQueryData<Sheet[]>(['sheets'], (prev) => {
        if (!prev) return prev
        return prev.map((s) => (s.id === sheet.id ? sheet : s))
      })
      void queryClient.invalidateQueries({ queryKey: ['sheet-rows', sheet.id] })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['month'] })
    },
  })
}

export function useLockSheet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) =>
      unwrapData(await api<{ data: Sheet }>(`/api/sheets/${id}/lock`, { method: 'POST' })),
    onSuccess: (sheet) => {
      queryClient.setQueryData<Sheet[]>(['sheets'], (prev) => {
        if (!prev) return prev
        return prev.map((s) =>
          s.id === sheet.id ? { ...sheet, is_unlocked: false } : s,
        )
      })
      void queryClient.removeQueries({ queryKey: ['sheet-rows', sheet.id] })
    },
  })
}

export function useRolloverSheetRows(sheetId: number | undefined, yearMonth: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      api<{ created: number; data: SheetRow[] }>(`/api/sheets/${sheetId}/rollover`, {
        method: 'POST',
        body: JSON.stringify({ year_month: yearMonth }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sheet-rows', sheetId, yearMonth] })
    },
  })
}

export function useUpdateSheet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      name,
      budget,
      reminders_enabled,
    }: {
      id: number
      name?: string
      budget?: number | null
      reminders_enabled?: boolean
    }) =>
      unwrapData(
        await api<{ data: Sheet }>(`/api/sheets/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...(name !== undefined ? { name } : {}),
            ...(budget !== undefined ? { budget } : {}),
            ...(reminders_enabled !== undefined ? { reminders_enabled } : {}),
          }),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sheets'] })
    },
  })
}

export function useDeleteSheet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: number; password?: string }) =>
      api<{ ok: boolean }>(`/api/sheets/${input.id}`, {
        method: 'DELETE',
        ...(input.password != null
          ? { body: JSON.stringify({ password: input.password }) }
          : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sheets'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useCreateCustomColumn(sheetId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      type: ColumnType
      options?: string[]
      formula?: string | null
      role?: ColumnRole
      summable?: boolean
    }) =>
      unwrapData(
        await api<{ data: CustomColumn }>('/api/custom-columns', {
          method: 'POST',
          body: JSON.stringify({ ...input, sheet_id: sheetId }),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['custom-columns', sheetId] })
    },
  })
}

export function useUpdateCustomColumn(sheetId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: number
      patch: Partial<{
        name: string
        type: ColumnType
        options: string[]
        formula: string | null
        role: ColumnRole
        summable: boolean
        position: number
      }>
    }) =>
      unwrapData(
        await api<{ data: CustomColumn }>(`/api/custom-columns/${id}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['custom-columns', sheetId] })
    },
  })
}

export function useReorderCustomColumns(sheetId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (orderedIds: number[]) =>
      api<{ data: CustomColumn[] }>('/api/custom-columns/reorder', {
        method: 'POST',
        body: JSON.stringify({ sheet_id: sheetId, ordered_ids: orderedIds }),
      }),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ['custom-columns', sheetId] })
      const previous = queryClient.getQueryData<CustomColumn[]>(['custom-columns', sheetId])
      if (previous) {
        const byId = new Map(previous.map((c) => [c.id, c]))
        const next = orderedIds
          .map((id, position) => {
            const col = byId.get(id)
            return col ? { ...col, position } : null
          })
          .filter((c): c is CustomColumn => c != null)
        queryClient.setQueryData(['custom-columns', sheetId], next)
      }
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['custom-columns', sheetId], ctx.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['custom-columns', sheetId] })
    },
  })
}

export function useDeleteCustomColumn(sheetId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<{ ok: boolean }>(`/api/custom-columns/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['custom-columns', sheetId] })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['sheet-rows'] })
    },
  })
}

export function useCreateSheetRow(sheetId: number | undefined, yearMonth: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      unwrapData(
        await api<{ data: SheetRow }>('/api/sheet-rows', {
          method: 'POST',
          body: JSON.stringify({
            sheet_id: sheetId,
            title: '',
            year_month: yearMonth,
            values: {},
          }),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sheet-rows', sheetId, yearMonth] })
    },
  })
}

export function useUpdateSheetRow(sheetId: number | undefined, yearMonth: string | null) {
  const queryClient = useQueryClient()
  const key = ['sheet-rows', sheetId, yearMonth] as const
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: number
      patch: Partial<{
        title: string | null
        notes: string | null
        reminder_at: string | null
        values: Record<string, string | number | null>
      }>
    }) =>
      unwrapData(
        await api<{ data: SheetRow }>(`/api/sheet-rows/${id}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        }),
      ),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<SheetRow[]>(key)
      queryClient.setQueryData<SheetRow[]>(key, (rows) =>
        (rows ?? []).map((row) => {
          if (row.id !== id) return row
          return {
            ...row,
            ...patch,
            values: patch.values ? { ...row.values, ...patch.values } : row.values,
          }
        }),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous)
    },
    onSuccess: (serverRow) => {
      queryClient.setQueryData<SheetRow[]>(key, (rows) =>
        (rows ?? []).map((row) => (row.id === serverRow.id ? serverRow : row)),
      )
    },
  })
}

export function useDeleteSheetRow(sheetId: number | undefined, yearMonth: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<{ ok: boolean }>(`/api/sheet-rows/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sheet-rows', sheetId, yearMonth] })
    },
  })
}
