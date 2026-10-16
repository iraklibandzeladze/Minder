/** Keep dialogs inside the area that is actually visible, including the iOS keyboard. */
export function initVisualViewport() {
  const root = document.documentElement
  let frame = 0

  const sync = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
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
    })
  }

  sync()
  window.visualViewport?.addEventListener('resize', sync)
  window.visualViewport?.addEventListener('scroll', sync)
  window.addEventListener('orientationchange', sync)
}
