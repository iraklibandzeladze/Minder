import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { unwrapData } from '@/lib/unwrap'
import type { LaravelCollection, Note, NoteCheckMode, NoteItem } from '@/lib/types'

function sanitizeNotes(notes: Note[]): Note[] {
  return notes.map((note) => {
    if (note.is_locked && note.is_unlocked !== true) {
      return { ...note, items: [], is_unlocked: false }
    }
    return note
  })
}

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () =>
      sanitizeNotes(unwrapData(await api<LaravelCollection<Note>>('/api/notes'))),
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      title: string
      check_mode: NoteCheckMode
      priced?: boolean
      password_protected?: boolean
      password?: string
      password_confirmation?: string
    }) =>
      sanitizeNotes([
        unwrapData(
          await api<{ data: Note }>('/api/notes', {
            method: 'POST',
            body: JSON.stringify(input),
          }),
        ),
      ])[0],
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useUnlockNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: number; password: string }) =>
      unwrapData(
        await api<{ data: Note }>(`/api/notes/${input.id}/unlock`, {
          method: 'POST',
          body: JSON.stringify({ password: input.password }),
        }),
      ),
    onSuccess: (note) => {
      queryClient.setQueryData<Note[]>(['notes'], (prev) => {
        if (!prev) return prev
        return prev.map((n) => (n.id === note.id ? note : n))
      })
    },
  })
}

export function useLockNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) =>
      unwrapData(await api<{ data: Note }>(`/api/notes/${id}/lock`, { method: 'POST' })),
    onSuccess: (note) => {
      queryClient.setQueryData<Note[]>(['notes'], (prev) => {
        if (!prev) return prev
        return prev.map((n) =>
          n.id === note.id ? { ...note, items: [], is_unlocked: false } : n,
        )
      })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: number
      title?: string
      check_mode?: NoteCheckMode
      priced?: boolean
      position?: number
    }) =>
      unwrapData(
        await api<{ data: Note }>(`/api/notes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: number; password?: string }) =>
      api<{ ok: boolean }>(`/api/notes/${input.id}`, {
        method: 'DELETE',
        ...(input.password != null
          ? { body: JSON.stringify({ password: input.password }) }
          : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useCreateNoteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      note_id: number
      body: string
      amount?: number | null
      checked?: boolean
      position?: number
    }) =>
      unwrapData(
        await api<{ data: NoteItem }>('/api/note-items', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: (created) => {
      queryClient.setQueryData<Note[]>(['notes'], (prev) => {
        if (!prev) return prev
        return prev.map((n) => {
          if (n.id !== created.note_id) return n
          const existing = n.items ?? []
          if (existing.some((i) => i.id === created.id)) return n
          return { ...n, items: [...existing, created] }
        })
      })
    },
  })
}

export function useUpdateNoteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: number
      body?: string
      amount?: number | null
      checked?: boolean
      position?: number
    }) =>
      unwrapData(
        await api<{ data: NoteItem }>(`/api/note-items/${id}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        }),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData<Note[]>(['notes'], (prev) => {
        if (!prev) return prev
        return prev.map((n) => {
          if (n.id !== updated.note_id) return n
          return {
            ...n,
            items: (n.items ?? []).map((i) => (i.id === updated.id ? updated : i)),
          }
        })
      })
    },
  })
}

export function useDeleteNoteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<{ ok: boolean }>(`/api/note-items/${id}`, { method: 'DELETE' }),
    onSuccess: (_res, id) => {
      queryClient.setQueryData<Note[]>(['notes'], (prev) => {
        if (!prev) return prev
        return prev.map((n) => ({
          ...n,
          items: (n.items ?? []).filter((i) => i.id !== id),
        }))
      })
    },
  })
}
