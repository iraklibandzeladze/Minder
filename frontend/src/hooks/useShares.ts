import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, csrf } from '@/lib/api'
import { unwrapData } from '@/lib/unwrap'
import type {
  InvitePreview,
  LaravelCollection,
  ResourceShare,
  ShareableType,
  ShareRole,
} from '@/lib/types'

export function useShares(shareableType: ShareableType, shareableId: number | undefined) {
  return useQuery({
    queryKey: ['shares', shareableType, shareableId],
    enabled: shareableId != null,
    queryFn: async () =>
      unwrapData(
        await api<LaravelCollection<ResourceShare>>(
          `/api/shares?shareable_type=${shareableType}&shareable_id=${shareableId}`,
        ),
      ),
  })
}

export function useCreateShare(shareableType: ShareableType, shareableId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; role: ShareRole }) => {
      await csrf()
      const payload = await api<{ data: ResourceShare; mail_sent?: boolean }>('/api/shares', {
        method: 'POST',
        body: JSON.stringify({
          shareable_type: shareableType,
          shareable_id: shareableId,
          email: input.email,
          role: input.role,
        }),
      })
      return {
        ...unwrapData(payload),
        mail_sent: payload.mail_sent !== false,
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shares', shareableType, shareableId] })
    },
  })
}

export function useRevokeShare(shareableType: ShareableType, shareableId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await csrf()
      return api<{ ok: boolean }>(`/api/shares/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shares', shareableType, shareableId] })
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
      void queryClient.invalidateQueries({ queryKey: ['sheets'] })
    },
  })
}

export function useInvitePreview(token: string | null) {
  return useQuery({
    queryKey: ['invite-preview', token],
    enabled: Boolean(token),
    retry: false,
    queryFn: () => api<InvitePreview>(`/api/invites/${token}`),
  })
}

export function useAcceptInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (token: string) => {
      await csrf()
      return api<{ share: ResourceShare; already_accepted: boolean }>(
        `/api/invites/${token}/accept`,
        { method: 'POST' },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
      void queryClient.invalidateQueries({ queryKey: ['sheets'] })
    },
  })
}

export function readInviteTokenFromPath(): string | null {
  const match = window.location.pathname.match(/^\/invite\/([A-Za-z0-9]+)$/)
  return match?.[1] ?? null
}

export function clearInvitePath(): void {
  if (window.location.pathname.startsWith('/invite/')) {
    window.history.replaceState({}, '', '/')
  }
}
