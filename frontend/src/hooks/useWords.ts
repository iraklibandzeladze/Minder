import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { unwrapData } from '@/lib/unwrap'
import type { DictionaryCategory, DictionaryWord, LaravelCollection } from '@/lib/types'

export interface WordInput {
  english_word: string
  georgian_translation: string
  example_sentence_en?: string | null
  example_sentence_ka?: string | null
  category_ids: number[]
}

export interface WordFilters {
  english: string
  georgian: string
  example_en: string
  example_ka: string
  category_id: string
}

export interface WordSort {
  field: 'created_at' | 'english' | 'georgian'
  dir: 'asc' | 'desc'
}

export const defaultWordSort: WordSort = { field: 'created_at', dir: 'desc' }

export function useWords(filters: WordFilters, sort: WordSort = defaultWordSort) {
  const params = new URLSearchParams()
  if (filters.english.trim()) params.set('english', filters.english.trim())
  if (filters.georgian.trim()) params.set('georgian', filters.georgian.trim())
  if (filters.example_en.trim()) params.set('example_en', filters.example_en.trim())
  if (filters.example_ka.trim()) params.set('example_ka', filters.example_ka.trim())
  if (filters.category_id.trim()) params.set('category_id', filters.category_id.trim())
  const sortField =
    sort.field === 'english'
      ? 'english_word'
      : sort.field === 'georgian'
        ? 'georgian_translation'
        : 'created_at'
  params.set('sort', sortField)
  params.set('dir', sort.dir)
  const qs = params.toString()

  return useQuery({
    queryKey: ['words', filters, sort],
    queryFn: async () =>
      unwrapData(await api<LaravelCollection<DictionaryWord>>(`/api/words?${qs}`)),
  })
}

export function useCreateWord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: WordInput) =>
      unwrapData(
        await api<{ data: DictionaryWord }>('/api/words', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['words'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useUpdateWord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: WordInput & { id: number }) => {
      const { id, ...body } = input
      return unwrapData(
        await api<{ data: DictionaryWord }>(`/api/words/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['words'] })
    },
  })
}

export function useDeleteWord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<{ ok: boolean }>(`/api/words/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['words'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useWordCategories() {
  return useQuery({
    queryKey: ['word-categories'],
    queryFn: async () =>
      unwrapData(
        await api<LaravelCollection<DictionaryCategory>>('/api/word-categories'),
      ),
  })
}

export function useCreateWordCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) =>
      unwrapData(
        await api<{ data: DictionaryCategory }>('/api/word-categories', {
          method: 'POST',
          body: JSON.stringify({ name }),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['word-categories'] })
    },
  })
}

export function useDeleteWordCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<{ ok: boolean }>(`/api/word-categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['word-categories'] })
      void queryClient.invalidateQueries({ queryKey: ['words'] })
    },
  })
}
