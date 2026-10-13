import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_URL, api, csrf } from '@/lib/api'
import type { SocialProvider, User } from '@/lib/types'

interface AuthPayload {
  user: User
}

const SOCIAL_ERROR_MESSAGES: Record<string, string> = {
  cancelled: 'ავტორიზაცია გაუქმდა.',
  no_email: 'პროვაიდერმა ელფოსტა არ გადმოგვცა — ნება დართე ელფოსტაზე წვდომას და სცადე თავიდან.',
  state: 'სესიის ვადა ამოიწურა — სცადე თავიდან.',
  blocked: 'ანგარიში დაბლოკილია.',
  provider: 'პროვაიდერთან კავშირი ვერ მოხერხდა — სცადე თავიდან.',
}

/**
 * Full-page redirect to the backend OAuth entry point. The callback logs the user
 * into the same Sanctum cookie session and bounces back to the current SPA path.
 */
export function startSocialLogin(provider: SocialProvider): void {
  const returnPath = window.location.pathname + window.location.search
  const url = new URL(`${API_URL}/auth/${provider}/redirect`)
  if (returnPath !== '/') url.searchParams.set('return', returnPath)
  window.location.assign(url.toString())
}

/**
 * Reads `?auth_error=` left by a failed OAuth callback, strips it from the URL,
 * and returns a Georgian message (or null when there is no error).
 */
export function consumeSocialAuthError(): string | null {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('auth_error')
  if (code === null) return null
  params.delete('auth_error')
  const query = params.toString()
  window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''))
  return SOCIAL_ERROR_MESSAGES[code] ?? 'სოციალური ავტორიზაცია ვერ მოხერხდა.'
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<User>('/api/me'),
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      await csrf()
      return api<AuthPayload>('/api/login', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(['me'], payload.user)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      email: string
      password: string
      password_confirmation: string
    }) => {
      await csrf()
      return api<AuthPayload>('/api/register', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(['me'], payload.user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await csrf()
      return api<{ ok: boolean }>('/api/logout', { method: 'POST' })
    },
    onSuccess: () => {
      queryClient.setQueryData(['me'], null)
      queryClient.clear()
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      email: string
      current_password?: string
      password?: string
      password_confirmation?: string
    }) => {
      await csrf()
      return api<User>('/api/me', {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user)
    },
  })
}
