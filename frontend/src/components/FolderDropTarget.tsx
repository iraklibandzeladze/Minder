import type { ReactNode } from 'react'
import { useFolderDrop } from '@/hooks/useFolderDrop'
import type { Folder } from '@/lib/types'

export function FolderDropTarget({ folder, className, onAccepted, children }: {
  folder: Folder
  className: string
  onAccepted?: () => void
  children: ReactNode
}) {
  const drop = useFolderDrop(folder, onAccepted)
  return <div className={`${className} folder-drop-target ${drop.accepts ? 'drop-ready' : ''} ${drop.isOver ? 'drop-over' : ''}`} {...drop.handlers}>
    {children}
    {drop.isOver && <span className="folder-drop-hint" aria-hidden>გადმოიტანე აქ</span>}
    {drop.error && <span className="folder-drop-error error" role="alert">გადატანა ვერ შეინახა. სცადე ხელახლა.</span>}
  </div>
}
