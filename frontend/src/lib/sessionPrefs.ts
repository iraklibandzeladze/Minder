const sheetKey = (userId: number) => `minder-active-sheet:${userId}`
const monthKey = (userId: number) => `minder-year-month:${userId}`
const viewKey = (userId: number) => `minder-active-view:${userId}`
const sidebarKey = (userId: number) => `minder-sidebar-collapsed:${userId}`
const noteKey = (userId: number) => `minder-active-note:${userId}`
const notesLimitKey = (userId: number) => `minder-notes-sidebar-limit:${userId}`
const sheetsLimitKey = (userId: number) => `minder-sheets-sidebar-limit:${userId}`

export const UI_PREFS_EVENT = 'minder-ui-prefs'
export const DEFAULT_SIDEBAR_LIST_LIMIT = 5
export const MIN_SIDEBAR_LIST_LIMIT = 1
export const MAX_SIDEBAR_LIST_LIMIT = 50

export type StoredAppView = 'dashboard' | 'schedule' | 'notes' | 'sheet' | 'profile' | 'settings' | 'admin' | 'dictionary'

function clampSidebarLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SIDEBAR_LIST_LIMIT
  return Math.min(MAX_SIDEBAR_LIST_LIMIT, Math.max(MIN_SIDEBAR_LIST_LIMIT, Math.round(value)))
}

function readSidebarLimit(key: string): number {
  const raw = localStorage.getItem(key)
  if (!raw) return DEFAULT_SIDEBAR_LIST_LIMIT
  const n = Number(raw)
  return clampSidebarLimit(n)
}

function writeSidebarLimit(key: string, limit: number): void {
  localStorage.setItem(key, String(clampSidebarLimit(limit)))
  window.dispatchEvent(new Event(UI_PREFS_EVENT))
}

export function readNotesSidebarLimit(userId: number): number {
  return readSidebarLimit(notesLimitKey(userId))
}

export function writeNotesSidebarLimit(userId: number, limit: number): void {
  writeSidebarLimit(notesLimitKey(userId), limit)
}

export function readSheetsSidebarLimit(userId: number): number {
  return readSidebarLimit(sheetsLimitKey(userId))
}

export function writeSheetsSidebarLimit(userId: number, limit: number): void {
  writeSidebarLimit(sheetsLimitKey(userId), limit)
}

export function readSidebarCollapsed(userId: number): boolean {
  return localStorage.getItem(sidebarKey(userId)) === '1'
}

export function writeSidebarCollapsed(userId: number, collapsed: boolean): void {
  localStorage.setItem(sidebarKey(userId), collapsed ? '1' : '0')
}

export function readActiveView(userId: number): StoredAppView {
  const raw = localStorage.getItem(viewKey(userId))
  if (
    raw === 'dashboard' ||
    raw === 'schedule' ||
    raw === 'notes' ||
    raw === 'sheet' ||
    raw === 'profile' ||
    raw === 'settings' ||
    raw === 'admin' ||
    raw === 'dictionary'
  ) {
    return raw
  }
  return 'dashboard'
}

export function writeActiveView(userId: number, view: StoredAppView): void {
  localStorage.setItem(viewKey(userId), view)
}

export function readActiveNoteId(userId: number): number | null {
  const raw = localStorage.getItem(noteKey(userId))
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function writeActiveNoteId(userId: number, id: number | null): void {
  if (id == null) {
    localStorage.removeItem(noteKey(userId))
    return
  }
  localStorage.setItem(noteKey(userId), String(id))
}

export function readActiveSheetId(userId: number): number | null {
  const raw = localStorage.getItem(sheetKey(userId))
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function writeActiveSheetId(userId: number, id: number | null): void {
  if (id == null) {
    localStorage.removeItem(sheetKey(userId))
    return
  }
  localStorage.setItem(sheetKey(userId), String(id))
}

export function readYearMonth(userId: number, fallback: string): string {
  const raw = localStorage.getItem(monthKey(userId))
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw
  return fallback
}

export function writeYearMonth(userId: number, yearMonth: string): void {
  localStorage.setItem(monthKey(userId), yearMonth)
}
