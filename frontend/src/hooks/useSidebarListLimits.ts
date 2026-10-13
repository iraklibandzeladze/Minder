import { useEffect, useState } from 'react'
import {
  readNotesSidebarLimit,
  readSheetsSidebarLimit,
  UI_PREFS_EVENT,
} from '@/lib/sessionPrefs'

export function useNotesSidebarLimit(userId: number): number {
  const [limit, setLimit] = useState(() => readNotesSidebarLimit(userId))

  useEffect(() => {
    function sync() {
      setLimit(readNotesSidebarLimit(userId))
    }
    sync()
    window.addEventListener(UI_PREFS_EVENT, sync)
    return () => window.removeEventListener(UI_PREFS_EVENT, sync)
  }, [userId])

  return limit
}

export function useSheetsSidebarLimit(userId: number): number {
  const [limit, setLimit] = useState(() => readSheetsSidebarLimit(userId))

  useEffect(() => {
    function sync() {
      setLimit(readSheetsSidebarLimit(userId))
    }
    sync()
    window.addEventListener(UI_PREFS_EVENT, sync)
    return () => window.removeEventListener(UI_PREFS_EVENT, sync)
  }, [userId])

  return limit
}
