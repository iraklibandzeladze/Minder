import { MoreHorizontal } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface PopupSurfaceProps {
  anchor: DOMRect
  label: string
  id: string
  trigger: HTMLButtonElement | null
  onClose: () => void
  children: ReactNode
}

function PopupSurface({ anchor, label, id, trigger, onClose, children }: PopupSurfaceProps) {
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => { closeRef.current = onClose }, [onClose])

  useLayoutEffect(() => {
    const element = panel.current
    if (!element) return
    const place = () => {
      const viewport = window.visualViewport
      const left = viewport?.offsetLeft ?? 0
      const top = viewport?.offsetTop ?? 0
      const width = viewport?.width ?? window.innerWidth
      const height = viewport?.height ?? window.innerHeight
      element.style.maxHeight = `${Math.max(80, height - 24)}px`
      const box = { width: element.offsetWidth, height: element.offsetHeight }
      const x = Math.max(left + 12, Math.min(anchor.right - box.width, left + width - box.width - 12))
      const below = anchor.bottom + 8
      const y = below + box.height <= top + height - 12
        ? below
        : Math.max(top + 12, Math.min(anchor.top - box.height - 8, top + height - box.height - 12))
      element.style.left = `${x}px`
      element.style.top = `${y}px`
      element.style.visibility = 'visible'
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(element)
    const close = () => closeRef.current()
    window.addEventListener('resize', close)
    window.visualViewport?.addEventListener('resize', close)
    window.visualViewport?.addEventListener('scroll', close)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', close)
      window.visualViewport?.removeEventListener('resize', close)
      window.visualViewport?.removeEventListener('scroll', close)
    }
  }, [anchor])

  useEffect(() => {
    const element = panel.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusables = () => Array.from(element?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]') ?? [])
    ;(focusables()[0] ?? element)?.focus({ preventScroll: true })
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
      }
      if (event.key === 'Tab') {
        const controls = focusables()
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (!first) { event.preventDefault(); element?.focus(); return }
        if (!element?.contains(document.activeElement)) {
          event.preventDefault(); (event.shiftKey ? last : first).focus(); return
        }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) {
          event.preventDefault(); last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey, true)
      const active = document.activeElement
      if (trigger?.isConnected && (!active || active === document.body || element?.contains(active))) {
        trigger.focus({ preventScroll: true })
      }
    }
  }, [trigger])

  return createPortal(
    <div className="context-popup-backdrop" onClick={event => {
      if (event.target === event.currentTarget) { event.stopPropagation(); closeRef.current() }
    }}>
      <div ref={panel} id={id} role="dialog" aria-modal="true" aria-label={label}
        tabIndex={-1} className="item-menu-panel context-popup-panel" style={{ visibility: 'hidden' }}>
        {children}
      </div>
    </div>, document.body,
  )
}

export function ContextPopup({ label, className = '', onOpen, children }: {
  label: string
  className?: string
  onOpen?: () => void
  children: (close: () => void) => ReactNode
}) {
  const [anchor, setAnchor] = useState<{ rect: DOMRect; trigger: HTMLButtonElement } | null>(null)
  const id = useId()
  const close = () => setAnchor(null)
  return <div className={`item-menu ${className}`} data-open={anchor !== null || undefined}>
    <button type="button" className="context-popup-trigger" aria-label={label}
      aria-haspopup="dialog" aria-expanded={anchor !== null} aria-controls={anchor ? id : undefined}
      onClick={event => { onOpen?.(); setAnchor({ rect: event.currentTarget.getBoundingClientRect(), trigger: event.currentTarget }) }}>
      <MoreHorizontal size={16} aria-hidden />
    </button>
    {anchor && <PopupSurface anchor={anchor.rect} label={label} id={id} trigger={anchor.trigger} onClose={close}>
      {children(close)}
    </PopupSurface>}
  </div>
}
