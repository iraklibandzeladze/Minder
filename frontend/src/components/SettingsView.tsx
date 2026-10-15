import { useEffect, useState } from 'react'
import { PwaInstallButton } from '@/components/PwaInstallButton'
import {
  MAX_SIDEBAR_LIST_LIMIT,
  MIN_SIDEBAR_LIST_LIMIT,
  readNotesSidebarLimit,
  readSheetsSidebarLimit,
  writeNotesSidebarLimit,
  writeSheetsSidebarLimit,
} from '@/lib/sessionPrefs'

function clampLimitInput(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.min(
    MAX_SIDEBAR_LIST_LIMIT,
    Math.max(MIN_SIDEBAR_LIST_LIMIT, Math.round(n)),
  )
}

export function SettingsView({ userId }: { userId: number }) {
  const [notesLimit, setNotesLimit] = useState(() => String(readNotesSidebarLimit(userId)))
  const [sheetsLimit, setSheetsLimit] = useState(() => String(readSheetsSidebarLimit(userId)))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setNotesLimit(String(readNotesSidebarLimit(userId)))
    setSheetsLimit(String(readSheetsSidebarLimit(userId)))
  }, [userId])

  function applySidebarPrefs() {
    const nextNotes = clampLimitInput(notesLimit)
    const nextSheets = clampLimitInput(sheetsLimit)
    if (nextNotes == null || nextSheets == null) return

    writeNotesSidebarLimit(userId, nextNotes)
    writeSheetsSidebarLimit(userId, nextSheets)
    setNotesLimit(String(nextNotes))
    setSheetsLimit(String(nextSheets))
    setSaved(true)
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <header className="profile-header">
          <div>
            <h1>პარამეტრები</h1>
            <p className="muted">საიდბარი და აპი</p>
          </div>
        </header>

        <div className="profile-section profile-sidebar-prefs-alone">
          <h2>აპლიკაცია</h2>
          <p className="muted profile-hint">
            დააინსტალირე Minder მთავარ ეკრანზე / დესკტოპზე.
          </p>
          <PwaInstallButton variant="primary" />
        </div>

        <div className="profile-section profile-sidebar-prefs">
          <h2>საიდბარი</h2>
          <p className="muted profile-hint">
            რამდენი ჩანაწერი გამოჩნდეს ჩაკეცვამდე (1–{MAX_SIDEBAR_LIST_LIMIT}).
          </p>

          <label>
            ნოუთები
            <input
              type="number"
              min={MIN_SIDEBAR_LIST_LIMIT}
              max={MAX_SIDEBAR_LIST_LIMIT}
              value={notesLimit}
              onChange={(e) => {
                setNotesLimit(e.target.value)
                setSaved(false)
              }}
            />
          </label>

          <label>
            ცხრილები
            <input
              type="number"
              min={MIN_SIDEBAR_LIST_LIMIT}
              max={MAX_SIDEBAR_LIST_LIMIT}
              value={sheetsLimit}
              onChange={(e) => {
                setSheetsLimit(e.target.value)
                setSaved(false)
              }}
            />
          </label>

          {saved && <p className="profile-success">შეინახა.</p>}

          <div className="profile-actions">
            <button type="button" className="btn-primary" onClick={applySidebarPrefs}>
              შენახვა
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
