import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { unwrapData } from '@/lib/unwrap'
import type { LaravelCollection, ScheduleBlock, ScheduleTemplate } from '@/lib/types'

export type ScheduleBlockInput = {
  weekday: number
  start_time: string
  end_time: string
  title: string
  schedule_template_id: number
  notes?: string | null
  position?: number
}

export type ScheduleTemplateInput = {
  name: string
  color: string
  position?: number
}

export function useScheduleBlocks() {
  return useQuery({
    queryKey: ['schedule-blocks'],
    queryFn: async () =>
      unwrapData(await api<LaravelCollection<ScheduleBlock>>('/api/schedule-blocks')),
  })
}

export function useScheduleTemplates() {
  return useQuery({
    queryKey: ['schedule-templates'],
    queryFn: async () =>
      unwrapData(
        await api<LaravelCollection<ScheduleTemplate>>('/api/schedule-templates'),
      ),
  })
}

/** Create many blocks (e.g. spread across weekdays); invalidates once. */
export function useCreateScheduleBlocks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (inputs: ScheduleBlockInput[]) => {
      const created: ScheduleBlock[] = []
      for (const input of inputs) {
        created.push(
          unwrapData(
            await api<{ data: ScheduleBlock }>('/api/schedule-blocks', {
              method: 'POST',
              body: JSON.stringify(input),
            }),
          ),
        )
      }
      return created
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule-blocks'] })
    },
  })
}

export function useUpdateScheduleBlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<ScheduleBlockInput> & { id: number }) =>
      unwrapData(
        await api<{ data: ScheduleBlock }>(`/api/schedule-blocks/${id}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule-blocks'] })
    },
  })
}

export function useDeleteScheduleBlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<{ ok: boolean }>(`/api/schedule-blocks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule-blocks'] })
    },
  })
}

export function useCreateScheduleTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ScheduleTemplateInput) =>
      unwrapData(
        await api<{ data: ScheduleTemplate }>('/api/schedule-templates', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule-templates'] })
    },
  })
}

export function useUpdateScheduleTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<ScheduleTemplateInput> & { id: number }) =>
      unwrapData(
        await api<{ data: ScheduleTemplate }>(`/api/schedule-templates/${id}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule-templates'] })
      void queryClient.invalidateQueries({ queryKey: ['schedule-blocks'] })
    },
  })
}

export function useDeleteScheduleTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<{ ok: boolean }>(`/api/schedule-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule-templates'] })
    },
  })
}
