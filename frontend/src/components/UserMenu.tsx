import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Settings, Shield, UserRound } from 'lucide-react'

export function UserMenu({
  userName,
  active,
  isAdmin,
  onProfile,
  onSettings,
  onAdmin,
}: {
  userName: string
  active: boolean
  isAdmin?: boolean
  onProfile: () => void
  onSettings: () => void
  onAdmin?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={`user-menu ${open || active ? 'open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`btn-ghost user-chip ${active || open ? 'active' : ''}`}
        title="მენიუ"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <UserRound size={16} />
        <span className="desktop-only">{userName}</span>
        <ChevronDown size={14} className="user-menu-caret desktop-only" />
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onProfile()
            }}
          >
            <UserRound size={15} />
            პროფილი
          </button>
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onSettings()
            }}
          >
            <Settings size={15} />
            პარამეტრები
          </button>
          {isAdmin && onAdmin && (
            <button
              type="button"
              className="user-menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onAdmin()
              }}
            >
              <Shield size={15} />
              ადმინი
            </button>
          )}
        </div>
      )}
    </div>
  )
}
