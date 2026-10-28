import { ChevronDown, ChevronRight, FolderPlus, Plus } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

interface SidebarSectionProps {
  userId: number
  section: 'notes' | 'sheets'
  title: string
  addLabel: string
  addTitle: string
  addDisabled: boolean
  onAdd: () => void
  onAddFolder?: () => void
  children: ReactNode
}

export function SidebarSection({
  userId, section, title, addLabel, addTitle, addDisabled, onAdd, onAddFolder, children,
}: SidebarSectionProps) {
  const storageKey = `minder-sidebar-section:${userId}:${section}`
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== 'closed'
    } catch {
      return true
    }
  })
  const panelId = useId()

  function changeOpen(next: boolean) {
    setOpen(next)
    try {
      localStorage.setItem(storageKey, next ? 'open' : 'closed')
    } catch {
      // The accordion still works when browser storage is unavailable.
    }
  }

  return (
    <>
      <div className="sidebar-module-head">
        <h2>
          <button type="button" className="sidebar-section-toggle"
            aria-expanded={open} aria-controls={panelId}
            onClick={() => changeOpen(!open)}>
            {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
            <span>{title}</span>
          </button>
        </h2>
        {onAddFolder && <button type="button" className="sidebar-add" aria-label={`${title}: ახალი საქაღალდე`} title="ახალი საქაღალდე" onClick={() => { changeOpen(true); onAddFolder() }}><FolderPlus size={15} /></button>}
        <button type="button" className="sidebar-add" disabled={addDisabled}
          aria-label={addLabel} title={addTitle}
          onClick={() => {
            changeOpen(true)
            onAdd()
          }}>
          <Plus size={15} aria-hidden />
        </button>
      </div>
      <div id={panelId} className="sidebar-section-panel" hidden={!open}>
        {children}
      </div>
    </>
  )
}
