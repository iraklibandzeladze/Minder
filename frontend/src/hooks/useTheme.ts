import { useEffect, useState } from 'react'
import type { ThemeMode } from '@/lib/types'

const STORAGE_KEY = 'minder-theme'

function readTheme(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'day' || stored === 'night') return stored
  return 'night'
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
}

/** Apply theme before React paint when imported from main. */
export function initTheme() {
  applyTheme(readTheme())
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => readTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function setTheme(next: ThemeMode) {
    setThemeState(next)
  }

  function toggleTheme() {
    setThemeState((t) => (t === 'night' ? 'day' : 'night'))
  }

  return { theme, setTheme, toggleTheme }
}
