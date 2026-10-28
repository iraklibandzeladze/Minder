import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { unwrapData } from '@/lib/unwrap'
import type { Folder, FolderType, LaravelCollection } from '@/lib/types'

export const CREATE_NOTE_EVENT = 'minder-create-note'
export const CREATE_TABLE_EVENT = 'minder-create-table'
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
export function useOrganizeItem() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id, ...patch }: { type: FolderType; id: number; folder_id?: number | null; is_pinned?: boolean }) =>
      api(`/api/${type === 'notes' ? 'notes' : 'sheets'}/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notes'] })
      void client.invalidateQueries({ queryKey: ['sheets'] })
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
