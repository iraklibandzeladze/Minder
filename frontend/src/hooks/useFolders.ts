import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { unwrapData } from '@/lib/unwrap'
import type { Folder, FolderType, LaravelCollection, Note, Sheet } from '@/lib/types'

export const CREATE_NOTE_EVENT = 'minder-create-note'
export const CREATE_TABLE_EVENT = 'minder-create-table'
export interface CreateItemEventDetail { folderId?: number | null }
export function requestCreateItem(type: FolderType, folderId: number | null = null): void {
  window.dispatchEvent(new CustomEvent<CreateItemEventDetail>(type === 'notes' ? CREATE_NOTE_EVENT : CREATE_TABLE_EVENT, { detail: { folderId } }))
}
export function useFolders() {
  return useQuery({ queryKey: ['folders'], queryFn: async () => unwrapData(await api<LaravelCollection<Folder>>('/api/folders')) })
}
export function useFolderMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { id?: number; name?: string; type?: FolderType; parent_id?: number | null; delete_contents?: boolean; account_password?: string }) => {
      const { id, ...body } = input
      return api(`/api/folders${id ? `/${id}` : ''}`, { method: input.delete_contents !== undefined ? 'DELETE' : id ? 'PUT' : 'POST', body: JSON.stringify(body) })
    },
    onSuccess: () => {
      for (const key of ['folders', 'notes', 'sheets', 'me', 'custom-columns', 'sheet-rows']) void client.invalidateQueries({ queryKey: [key] })
    },
  })
}
export interface OrganizeItemInput {
  type: FolderType
  id: number
  folder_id?: number | null
  is_pinned?: boolean
}
export function useOrganizeItem() {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['organize-item'],
    mutationFn: ({ type, id, ...patch }: OrganizeItemInput) =>
      api(`/api/${type === 'notes' ? 'notes' : 'sheets'}/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
    onMutate: async ({ type, id, ...patch }) => {
      const key = [type === 'notes' ? 'notes' : 'sheets']
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<(Note | Sheet)[]>(key)?.find(item => item.id === id)
      client.setQueryData<(Note | Sheet)[]>(key, items => items?.map(item => item.id === id ? { ...item, ...patch } : item))
      return { key, previous }
    },
    onError: (_error, input, context) => {
      if (!context?.previous) return
      const previous = context.previous
      client.setQueryData<(Note | Sheet)[]>(context.key, items => items?.map(item => item.id === input.id ? {
        ...item,
        ...('folder_id' in input ? { folder_id: previous.folder_id } : {}),
        ...('is_pinned' in input ? { is_pinned: previous.is_pinned } : {}),
      } : item))
    },
    onSettled: (_data, _error, input) => {
      void client.invalidateQueries({ queryKey: [input.type === 'notes' ? 'notes' : 'sheets'] })
    },
  })
}
export function folderDescendants(folders: Folder[], id: number): Set<number> {
  const ids = new Set([id])
  let size = 0
  while (size !== ids.size) { size = ids.size; for (const folder of folders) if (folder.parent_id && ids.has(folder.parent_id)) ids.add(folder.id) }
  return ids
}

export function folderPath(folders: Folder[], folder: Folder): string {
  const names = [folder.name]
  const seen = new Set([folder.id])
  let parentId = folder.parent_id
  while (parentId !== null && !seen.has(parentId)) {
    seen.add(parentId)
    const parent = folders.find(candidate => candidate.id === parentId)
    if (!parent) break
    names.unshift(parent.name)
    parentId = parent.parent_id
  }
  return names.join(' / ')
}
