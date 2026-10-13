import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { unwrapData } from '@/lib/unwrap'
import type { AdminStats, AdminUser, PlatformRole, UserPlan } from '@/lib/types'

interface PaginatedUsers {
  data: AdminUser[]
  meta?: { current_page: number; last_page: number; total: number }
}

export function useAdminStats(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api<AdminStats>('/api/admin/stats'),
    enabled,
  })
}

export function useAdminUsers(enabled: boolean, q: string) {
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  const qs = params.toString()

  return useQuery({
    queryKey: ['admin', 'users', q],
    queryFn: async () => {
      const payload = await api<PaginatedUsers>(`/api/admin/users${qs ? `?${qs}` : ''}`)
      return unwrapData(payload)
    },
    enabled,
  })
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: number
      plan?: UserPlan
      platform_role?: PlatformRole
      blocked?: boolean
    }) => {
      const { id, ...body } = input
      return unwrapData(
        await api<{ data: AdminUser }>(`/api/admin/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
