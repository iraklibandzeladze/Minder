import { useEffect, useState } from 'react'
import {
  CalendarDays,
  LayoutDashboard,
  ChevronLeft,
  Crown,
  ChevronRight,
  Languages,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Sun,
  X,
} from 'lucide-react'
import { DashboardView } from '@/components/DashboardView'
import { TablePasswordRecovery } from '@/components/TablePasswordRecovery'
import { DictionaryView } from '@/components/DictionaryView'
import { NotesNav } from '@/components/NotesNav'
import { NotesView } from '@/components/NotesView'
import { AdminView } from '@/components/AdminView'
import { ProfileView } from '@/components/ProfileView'
import { SettingsView } from '@/components/SettingsView'
import { SheetTabs } from '@/components/SheetTabs'
import { TableGrid } from '@/components/TableGrid'
import { TransactionGrid } from '@/components/TransactionGrid'
import { UnlockModal } from '@/components/UnlockModal'
import { UserMenu } from '@/components/UserMenu'
import { WeekScheduleView } from '@/components/WeekScheduleView'
import { useLogout } from '@/hooks/useAuth'
import { useLockSheet, useUnlockSheet, useSheets } from '@/hooks/useLedger'
import { useLockNote, useNotes, useUnlockNote } from '@/hooks/useNotes'
import { useTheme } from '@/hooks/useTheme'
import { currentYearMonth, formatYearMonthLabel, shiftYearMonth } from '@/lib/month'
import {
  readActiveNoteId,
  readActiveSheetId,
  readActiveView,
  readSidebarCollapsed,
  readYearMonth,
  writeActiveNoteId,
  writeActiveSheetId,
  writeActiveView,
  writeSidebarCollapsed,
  writeYearMonth,
} from '@/lib/sessionPrefs'
import type { AppView, User } from '@/lib/types'

function viewFromPath(): AppView | null {
  const path = window.location.pathname.slice(1)
  if (!path || path === 'dashboard') return 'dashboard'
  if (path === 'tables') return 'sheet'
  if (['schedule', 'notes', 'profile', 'settings', 'admin', 'dictionary'].includes(path)) return path as AppView
  return null
}

function isTableLike(kind: string | undefined): boolean {
  return kind === 'monthly_expenses' || kind === 'calculator' || kind === 'table'
}

function usesMonth(kind: string | undefined): boolean {
  return kind === 'monthly_expenses' || kind === 'table' || kind === 'ledger'
}

export function MinderApp({ user }: { user: User }) {
  const [yearMonth, setYearMonthState] = useState(() =>
    readYearMonth(user.id, currentYearMonth()),
  )
  const [activeSheetId, setActiveSheetIdState] = useState<number | null>(() =>
    readActiveSheetId(user.id),
  )
  const [activeNoteId, setActiveNoteIdState] = useState<number | null>(() =>
    readActiveNoteId(user.id),
  )
  const [activeView, setActiveViewState] = useState<AppView>(() =>
    viewFromPath() ?? readActiveView(user.id),
  )
  const [sheetsOpen, setSheetsOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    readSidebarCollapsed(user.id),
  )
  const [recoveringSheet, setRecoveringSheet] = useState(false)
  const logout = useLogout()
  const sheets = useSheets()
  const notes = useNotes()
  const unlockNote = useUnlockNote()
  const lockNote = useLockNote()
  const lockNoteOnBack = lockNote.mutate
  const unlockSheet = useUnlockSheet()
  const lockSheet = useLockSheet()
  const lockSheetOnBack = lockSheet.mutate
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    if (view === 'admin' && user.is_admin) {
      setActiveViewState('admin')
      writeActiveView(user.id, 'admin')
      params.delete('view')
      const qs = params.toString()
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
    }
  }, [user.id, user.is_admin])

  const sheetList = sheets.data ?? []
  const noteList = notes.data ?? []
  const showingDashboard = activeView === 'dashboard'
  const showingSchedule = activeView === 'schedule'
  const showingNotes = activeView === 'notes'
  const showingSheet = activeView === 'sheet'
  const showingProfile = activeView === 'profile'
  const showingSettings = activeView === 'settings'
  const showingAdmin = activeView === 'admin'
  const showingDictionary = activeView === 'dictionary'

  const activeSheet =
    showingSheet && activeSheetId != null
      ? (sheetList.find((s) => s.id === activeSheetId) ?? null)
      : null
  const activeNote =
    showingNotes && activeNoteId != null
      ? (noteList.find((n) => n.id === activeNoteId) ?? null)
      : null

  const noteNeedsUnlock = Boolean(
    activeNote?.is_locked && activeNote.is_unlocked !== true,
  )
  const sheetNeedsUnlock = Boolean(
    activeSheet?.is_locked && activeSheet.is_unlocked !== true,
  )

  function setSidebarCollapsedPersist(collapsed: boolean) {
    setSidebarCollapsed(collapsed)
    writeSidebarCollapsed(user.id, collapsed)
  }

  function setActiveSheetId(id: number | null) {
    setActiveSheetIdState(id)
    writeActiveSheetId(user.id, id)
  }

  function setActiveNoteId(id: number | null) {
    setActiveNoteIdState(id)
    writeActiveNoteId(user.id, id)
  }

  function setActiveView(view: AppView) {
    setActiveViewState(view)
    writeActiveView(user.id, view)
    const path = view === 'sheet' ? '/tables' : `/${view}`
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
  }

  function setYearMonth(next: string | ((prev: string) => string)) {
    setYearMonthState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      writeYearMonth(user.id, value)
      return value
    })
  }

  useEffect(() => {
    if (window.location.pathname === '/') window.history.replaceState({}, '', '/dashboard')
    const initialView = viewFromPath()
    if (initialView) writeActiveView(user.id, initialView)
    const onBack = () => {
      const view = viewFromPath() ?? 'dashboard'
      const previous = readActiveView(user.id)
      if (previous === 'notes' && view !== 'notes') {
        const note = notes.data?.find(item => item.id === readActiveNoteId(user.id))
        if (note?.is_locked && note.is_unlocked) lockNoteOnBack(note.id)
      }
      if (previous === 'sheet' && view !== 'sheet') {
        const sheet = sheets.data?.find(item => item.id === readActiveSheetId(user.id))
        if (sheet?.is_locked && sheet.is_unlocked) lockSheetOnBack(sheet.id)
      }
      setActiveViewState(view)
      writeActiveView(user.id, view)
    }
    window.addEventListener('popstate', onBack)
    return () => window.removeEventListener('popstate', onBack)
  }, [user.id, notes.data, sheets.data, lockNoteOnBack, lockSheetOnBack])

  useEffect(() => {
    if (sheets.isLoading || sheets.isPending) return
    if (!sheets.isSuccess) return
    const view = readActiveView(user.id)
    if (view === 'schedule' || view === 'notes') return

    const list = sheets.data ?? []
    if (list.length === 0) {
      setActiveSheetIdState(null)
      return
    }

    setActiveSheetIdState((current) => {
      const stored = readActiveSheetId(user.id)
      const preferred = stored ?? current
      if (preferred != null && list.some((s) => s.id === preferred)) {
        writeActiveSheetId(user.id, preferred)
        return preferred
      }
      const fallback = list[0].id
      writeActiveSheetId(user.id, fallback)
      return fallback
    })
  }, [sheets.isLoading, sheets.isPending, sheets.isSuccess, sheets.data, user.id])

  useEffect(() => {
    if (notes.isLoading || notes.isPending) return
    if (!notes.isSuccess) return
    if (readActiveView(user.id) !== 'notes') return

    const list = notes.data ?? []
    if (list.length === 0) {
      setActiveNoteIdState(null)
      return
    }

    setActiveNoteIdState((current) => {
      const stored = readActiveNoteId(user.id)
      const preferred = stored ?? current
      if (preferred != null && list.some((n) => n.id === preferred)) {
        writeActiveNoteId(user.id, preferred)
        return preferred
      }
      const fallback = list[0].id
      writeActiveNoteId(user.id, fallback)
      return fallback
    })
  }, [notes.isLoading, notes.isPending, notes.isSuccess, notes.data, user.id])

  function lockCurrentNote() {
    const note =
      activeNoteId != null ? noteList.find((n) => n.id === activeNoteId) : null
    if (note?.is_locked && note.is_unlocked) {
      lockNote.mutate(note.id)
    }
  }

  function lockCurrentSheet() {
    const sheet =
      activeSheetId != null ? sheetList.find((s) => s.id === activeSheetId) : null
    if (sheet?.is_locked && sheet.is_unlocked) {
      lockSheet.mutate(sheet.id)
    }
  }

  function selectDashboard() {
    lockCurrentNote()
    lockCurrentSheet()
    setActiveView('dashboard')
    setSheetsOpen(false)
  }

  function selectSchedule() {
    lockCurrentNote()
    lockCurrentSheet()
    setActiveView('schedule')
    setSheetsOpen(false)
  }

  function selectNote(id: number) {
    if (activeNoteId !== id) lockCurrentNote()
    lockCurrentSheet()
    setActiveView('notes')
    setActiveNoteId(id)
    setSheetsOpen(false)
  }

  function selectSheet(id: number | null) {
    if (activeSheetId !== id) lockCurrentSheet()
    lockCurrentNote()
    setActiveView('sheet')
    setActiveSheetId(id)
    setSheetsOpen(false)
  }

  function openProfile() {
    lockCurrentNote()
    lockCurrentSheet()
    setActiveView('profile')
    setSheetsOpen(false)
  }

  function openSettings() {
    lockCurrentNote()
    lockCurrentSheet()
    setActiveView('settings')
    setSheetsOpen(false)
  }

  function openAdmin() {
    lockCurrentNote()
    lockCurrentSheet()
    setActiveView('admin')
    setSheetsOpen(false)
  }

  function selectDictionary() {
    lockCurrentNote()
    lockCurrentSheet()
    setActiveView('dictionary')
    setSheetsOpen(false)
  }

  function cancelUnlock() {
    if (noteNeedsUnlock && activeNoteId != null) {
      lockNote.mutate(activeNoteId)
    }
    if (sheetNeedsUnlock && activeSheetId != null) {
      lockSheet.mutate(activeSheetId)
    }
    setActiveView('schedule')
    setSheetsOpen(false)
  }

  const canDictionary = user.limits.can_dictionary === true

  const isLedger = activeSheet?.kind === 'ledger'
  const showMonthNav =
    showingSheet && !sheetNeedsUnlock && (usesMonth(activeSheet?.kind) || !activeSheet)

  const mobileLabel = showingDashboard ? 'დეშბორდი' : showingProfile
    ? 'პროფილი'
    : showingSettings
      ? 'პარამეტრები'
      : showingDictionary
        ? 'ლექსიკონი'
      : showingSchedule
        ? 'განრიგი'
        : showingNotes
          ? (activeNote?.title ?? 'ნოუთი')
          : activeSheet?.name

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {sheetsOpen && (
        <button
          type="button"
          className="sheets-backdrop mobile-only"
          aria-label="დახურვა"
          onClick={() => setSheetsOpen(false)}
        />
      )}

      <aside
        className={`sidebar app-sidebar ${sheetsOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
      >
        <div className="sidebar-header mobile-only">
          <h2>მენიუ</h2>
          <button
            type="button"
            className="btn-icon"
            aria-label="დახურვა"
            onClick={() => setSheetsOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-group"><button type="button" className={`sidebar-link ${showingDashboard ? 'active' : ''}`} onClick={selectDashboard}><LayoutDashboard size={18} /><span>დეშბორდი</span></button></div>
          <div className="sidebar-group">
            <button
              type="button"
              className={`sidebar-link ${showingSchedule ? 'active' : ''}`}
              onClick={selectSchedule}
            >
              <CalendarDays size={18} />
              <span>განრიგი</span>
            </button>
          </div>

          <div className="sidebar-group">
            <button
              type="button"
              className={`sidebar-link ${showingDictionary ? 'active' : ''}`}
              onClick={selectDictionary}
            >
              <Languages size={18} />
              <span>ლექსიკონი</span>
              {!canDictionary && (
                <span className="sidebar-pro-badge" title="Pro">
                  <Crown size={12} />
                </span>
              )}
            </button>
          </div>

          <NotesNav
            userId={user.id}
            activeId={showingNotes ? activeNoteId : null}
            onSelect={selectNote}
          />

          <SheetTabs
            userId={user.id}
            sheets={sheetList}
            activeId={showingSheet ? activeSheetId : null}
            onSelect={selectSheet}
          />
        </nav>
      </aside>

      <div className="app-main">
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="btn-ghost mobile-only sheets-menu-btn"
            aria-label="მენიუ"
            onClick={() => setSheetsOpen(true)}
          >
            <Menu size={18} />
            <span>მენიუ</span>
          </button>
          <button
            type="button"
            className="btn-icon desktop-only sidebar-toggle"
            title={sidebarCollapsed ? 'საიდბარის გახსნა' : 'საიდბარის შეკეცვა'}
            aria-label={sidebarCollapsed ? 'საიდბარის გახსნა' : 'საიდბარის შეკეცვა'}
            onClick={() => setSidebarCollapsedPersist(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <span className="brand">Minder</span>
          {mobileLabel && (
            <span className="active-sheet-label mobile-only" title={mobileLabel}>
              {mobileLabel}
            </span>
          )}
          {showMonthNav && (
            <div className="month-nav">
              <button
                type="button"
                className="btn-icon"
                onClick={() => setYearMonth((m) => shiftYearMonth(m, -1))}
                aria-label="წინა თვე"
              >
                <ChevronLeft size={18} />
              </button>
              <strong className="month-label">{formatYearMonthLabel(yearMonth)}</strong>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setYearMonth((m) => shiftYearMonth(m, 1))}
                aria-label="შემდეგი თვე"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="topbar-right">
          <button
            type="button"
            className="btn-icon"
            title={theme === 'night' ? 'დღის რეჟიმი' : 'ღამის რეჟიმი'}
            onClick={toggleTheme}
          >
            {theme === 'night' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <UserMenu
            userName={user.name}
            active={showingProfile || showingSettings || showingAdmin}
            isAdmin={user.is_admin}
            onProfile={openProfile}
            onSettings={openSettings}
            onAdmin={openAdmin}
          />
          <button
            type="button"
            className="btn-icon"
            title="გასვლა"
            onClick={() => logout.mutate()}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

        <div className="main-col">
          {showingDashboard && <DashboardView notes={noteList} sheets={sheetList} loading={notes.isLoading || sheets.isLoading} error={notes.isError || sheets.isError} onNote={selectNote} onSheet={selectSheet} />}
          {showingProfile && <ProfileView user={user} />}
          {showingSettings && <SettingsView userId={user.id} />}
          {showingAdmin && user.is_admin && <AdminView />}
          {showingAdmin && !user.is_admin && (
            <div className="empty-sheets">
              <p>წვდომა აკრძალულია.</p>
            </div>
          )}
          {showingSchedule && <WeekScheduleView />}
          {showingDictionary && canDictionary && <DictionaryView />}
          {showingDictionary && !canDictionary && (
            <div className="empty-sheets pro-gate">
              <p>ლექსიკონი Pro გეგმაზეა.</p>
              <p className="muted">პროფილიდან აირჩიე Pro — ადმინი დაადასტურებს და ლექსიკონი გაიხსნება.</p>
              <button type="button" className="btn-primary" onClick={openProfile}>
                გეგმის ნახვა
              </button>
            </div>
          )}
          {showingNotes && noteNeedsUnlock && <div className="locked-gate-blank" aria-hidden />}
          {showingNotes && !noteNeedsUnlock && activeNoteId != null && (
            <NotesView noteId={activeNoteId} />
          )}
          {showingNotes && activeNoteId == null && !notes.isLoading && (
            <div className="empty-sheets">
              <p>ჯერ ნოუთი არ გაქვს.</p>
              <p className="muted">მენიუდან დააჭირე „+ ნოუთი“.</p>
            </div>
          )}
          {showingSheet && sheetNeedsUnlock && <div className="locked-gate-blank" aria-hidden />}
          {showingSheet && !sheetNeedsUnlock && isLedger && activeSheet && (
            <TransactionGrid yearMonth={yearMonth} sheetId={activeSheet.id} />
          )}
          {showingSheet && !sheetNeedsUnlock && activeSheet && isTableLike(activeSheet.kind) && (
            <TableGrid yearMonth={yearMonth} sheet={activeSheet} />
          )}
          {showingSheet && !activeSheet && !sheets.isLoading && sheetList.length === 0 && (
            <div className="empty-sheets">
              <p>ჯერ ცხრილი არ გაქვს.</p>
              <p className="muted">მენიუდან დააჭირე „+ ცხრილი“ და დაიწყე.</p>
            </div>
          )}
        </div>
      </div>

      {noteNeedsUnlock && activeNote && (
        <UnlockModal
          title={activeNote.title}
          kindLabel="ნოუთი დაცულია"
          busy={unlockNote.isPending}
          onClose={cancelUnlock}
          onSubmit={async (password) => {
            await unlockNote.mutateAsync({ id: activeNote.id, password })
          }}
        />
      )}
      {recoveringSheet && activeSheet && <TablePasswordRecovery sheet={activeSheet} onClose={() => setRecoveringSheet(false)} />}
      {sheetNeedsUnlock && activeSheet && !recoveringSheet && (
        <UnlockModal
          title={activeSheet.name}
          kindLabel="ცხრილი დაცულია"
          onForgot={activeSheet.is_owner ? () => setRecoveringSheet(true) : undefined}
          busy={unlockSheet.isPending}
          onClose={cancelUnlock}
          onSubmit={async (password) => {
            await unlockSheet.mutateAsync({ id: activeSheet.id, password })
          }}
        />
      )}
    </div>
  )
}
