/** Keep dialogs inside the area that is actually visible, including the iOS keyboard. */
export function initVisualViewport() {
  const root = document.documentElement
  let frame = 0

  const write = () => {
    const vv = window.visualViewport
    if (!vv) {
      root.style.setProperty('--vv-top', '0px')
      root.style.setProperty('--vv-left', '0px')
      root.style.setProperty('--vv-width', '100%')
      root.style.setProperty('--vv-height', '100dvh')
      return
    }
    root.style.setProperty('--vv-top', `${vv.offsetTop}px`)
    root.style.setProperty('--vv-left', `${vv.offsetLeft}px`)
    root.style.setProperty('--vv-width', `${vv.width}px`)
    root.style.setProperty('--vv-height', `${vv.height}px`)
  }

  const sync = (scrollField: boolean) => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      write()
      if (!scrollField) return
      const field = document.activeElement
      if (
        field instanceof HTMLElement &&
        field.matches('input, textarea, select') &&
        field.closest('[role="dialog"]')
      ) {
        field.scrollIntoView({ block: 'center', inline: 'nearest' })
      }
    })
  }

  sync(false)
  window.visualViewport?.addEventListener('resize', () => sync(true))
  window.visualViewport?.addEventListener('scroll', () => sync(false))
  window.addEventListener('orientationchange', () => sync(true))
}
