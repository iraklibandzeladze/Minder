import { useState, useSyncExternalStore, type DragEvent } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useOrganizeItem } from '@/hooks/useFolders'
import type { Folder, FolderType } from '@/lib/types'

export interface DraggedWorkspaceItem {
  id: number
  type: FolderType
  folder_id: number | null
}

const ITEM_MIME = 'application/x-minder-item'
let draggedItem: DraggedWorkspaceItem | null = null
const listeners = new Set<() => void>()
function publish(item: DraggedWorkspaceItem | null) {
  draggedItem = item
  listeners.forEach(listener => listener())
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }

export function startItemDrag(event: DragEvent<HTMLElement>, item: DraggedWorkspaceItem) {
  if ((event.target as HTMLElement).closest('select, input, .item-menu')) { event.preventDefault(); return }
  event.dataTransfer.setData(ITEM_MIME, JSON.stringify(item))
  event.dataTransfer.effectAllowed = 'move'
  publish(item)
}
export function endItemDrag() { publish(null) }

export function useWorkspaceDrag() {
  const item = useSyncExternalStore(subscribe, () => draggedItem, () => null)
  const pending = useIsMutating({ mutationKey: ['organize-item'] }) > 0
  return { item, pending }
}

export function useFolderDrop(folder: Folder, onDropAccepted?: () => void) {
  const { item, pending } = useWorkspaceDrag()
  const mutation = useOrganizeItem()
  const [over, setOver] = useState(false)
  const [error, setError] = useState(false)
  const accepts = item !== null && !pending && item.type === folder.type && item.folder_id !== folder.id
  return {
    accepts,
    isOver: accepts && over,
    error,
    handlers: {
      onDragEnter: (event: DragEvent<HTMLElement>) => {
        if (!accepts) return
        event.preventDefault(); event.stopPropagation(); setOver(true)
      },
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!accepts) return
        event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; setOver(true)
      },
      onDragLeave: (event: DragEvent<HTMLElement>) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
        setOver(false)
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        event.preventDefault(); event.stopPropagation(); setOver(false)
        if (!accepts || !item) return
        let payload: DraggedWorkspaceItem
        try { payload = JSON.parse(event.dataTransfer.getData(ITEM_MIME)) as DraggedWorkspaceItem } catch { endItemDrag(); return }
        if (payload.id !== item.id || payload.type !== folder.type) { endItemDrag(); return }
        setError(false)
        mutation.mutate({ type: item.type, id: item.id, folder_id: folder.id }, { onError: () => setError(true) })
        endItemDrag()
        onDropAccepted?.()
      },
    },
  }
}
