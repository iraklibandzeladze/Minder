import { Banknote, Lock, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  PasswordProtectFields,
  passwordPayload,
  validatePasswordProtect,
} from '@/components/PasswordProtectFields'
import { SidebarSection } from '@/components/SidebarSection'
import { FolderDialog } from '@/components/FolderDialog'
import { FolderTree, ItemOrganizationMenu } from '@/components/FolderTree'
import { CREATE_NOTE_EVENT, folderPath, useFolders, type CreateItemEventDetail } from '@/hooks/useFolders'
import { UnlockModal } from '@/components/UnlockModal'
import { useMe } from '@/hooks/useAuth'
import { useCreateNote, useDeleteNote, useNotes } from '@/hooks/useNotes'
import { useNotesSidebarLimit } from '@/hooks/useSidebarListLimits'
import { ApiError } from '@/lib/api'
import type { Note, NoteType } from '@/lib/types'

function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string }
    return body.message ?? 'შეცდომა'
  }
  return 'ქსელის შეცდომა'
}

export function NotesNav({
  userId,
  activeId,
  onSelect,
}: {
  userId: number
  activeId: number | null
  onSelect: (id: number) => void
}) {
  const me = useMe()
  const notesQuery = useNotes()
  const createNote = useCreateNote()
  const deleteNote = useDeleteNote()
  const limit = useNotesSidebarLimit(userId)
  const [creating, setCreating] = useState(false)
  const [creationFolderId, setCreationFolderId] = useState<number | null>(null)
  const foldersQuery = useFolders()
  const [creatingFolder, setCreatingFolder] = useState(false)
  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<CreateItemEventDetail>).detail
      setCreationFolderId(detail?.folderId ?? null)
      setCreating(true)
    }
    window.addEventListener(CREATE_NOTE_EVENT, open)
    return () => window.removeEventListener(CREATE_NOTE_EVENT, open)
  }, [])
  const [title, setTitle] = useState('')
  const [noteType, setNoteType] = useState<NoteType>('checklist')
  const [priced, setPriced] = useState(false)
  const [passwordProtected, setPasswordProtected] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null)

  const notes = notesQuery.data ?? []
  const limits = me.data?.limits
  const ownedCount = notes.filter((n) => n.is_owner !== false).length
  const atNoteLimit =
    limits?.max_notes != null && ownedCount >= limits.max_notes
  const canPassword = limits?.can_password_protect === true

  const needsCollapse = notes.length > limit
  const activeHidden =
    activeId != null && notes.slice(limit).some((n) => n.id === activeId)

  useEffect(() => {
    if (activeHidden) setExpanded(true)
  }, [activeHidden])

  useEffect(() => {
    if (!creating) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') resetCreate()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [creating])

  const visible = expanded || !needsCollapse ? notes : notes.slice(0, limit)
  const hiddenCount = notes.length - limit

  function resetCreate() {
    setTitle('')
    setPriced(false)
    setNoteType('checklist')
    setPasswordProtected(false)
    setPassword('')
    setPasswordConfirmation('')
    setCreateError(null)
    setCreating(false)
    setCreationFolderId(null)
  }

  async function create() {
    const trimmed = title.trim()
    if (!trimmed) return
    if (atNoteLimit) {
      setCreateError(
        `ნოუთების ლიმიტი ამოწურულია (${limits?.max_notes}). Pro გეგმა გჭირდება.`,
      )
      return
    }
    const passwordError = validatePasswordProtect(
      passwordProtected,
      password,
      passwordConfirmation,
    )
    if (passwordError) {
      setCreateError(passwordError)
      return
    }
    setCreateError(null)
    try {
      const note = await createNote.mutateAsync({
        title: trimmed,
        folder_id: creationFolderId,
        check_mode: 'checkbox',
        type: noteType,
        priced: noteType === 'checklist' && priced,
        ...passwordPayload(
          canPassword && passwordProtected,
          password,
          passwordConfirmation,
        ),
      })
      resetCreate()
      onSelect(note.id)
    } catch (err) {
      setCreateError(apiErrorMessage(err))
    }
  }

  function requestDelete(note: Note) {
    if (note.is_locked) {
      setPendingDelete(note)
      return
    }
    if (confirm(`წავშალოთ „${note.title}“?`)) {
      deleteNote.mutate({ id: note.id })
    }
  }

  return (
    <div className="notes-nav sidebar-module">
      <SidebarSection
        key={`notes:${userId}`}
        userId={userId}
        section="notes"
        title="ნოუთები"
        addLabel="ნოუთის დამატება"
        addDisabled={atNoteLimit}
        addTitle={atNoteLimit ? `ლიმიტი: ${limits?.max_notes} ნოუთი (უფასო გეგმა)` : 'ნოუთის დამატება'}
        onAdd={() => { setCreationFolderId(null); setCreating(true) }}
        onAddFolder={() => setCreatingFolder(true)}
      >
        <div className="sheet-nav-list">
          <FolderTree type="notes" items={visible} renderItem={(note) => (
            <div
              key={note.id}
              className={`sheet-nav-item ${note.id === activeId ? 'active' : ''}`}
            >
              <button
                type="button"
                className="sheet-nav-btn notes-nav-btn"
                aria-current={note.id === activeId ? 'page' : undefined}
                onClick={() => onSelect(note.id)}
              >
                <span className="notes-nav-ico" aria-hidden>
                  {note.is_locked ? <Lock size={13} /> : <span className="notes-nav-dot" />}
                </span>
                <span className="notes-nav-label">{note.title}</span>
              </button>
              <div className="sheet-nav-actions">
                <ItemOrganizationMenu type="notes" item={note} />
                {(note.is_owner !== false) && (
                <button
                  type="button"
                  className="btn-icon sheet-action"
                  title="წაშლა"
                  aria-label={`ნოუთის წაშლა: ${note.title}`}
                  onClick={() => requestDelete(note)}
                >
                  <Trash2 size={14} />
                </button>
                )}
              </div>
            </div>
          )} />
        </div>

        {needsCollapse && (
          <button
            type="button"
            className="btn-ghost sheet-nav-more"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'ნაკლები' : `მეტი (${hiddenCount})`}
          </button>
        )}
      </SidebarSection>

      {creatingFolder && <FolderDialog type="notes" onClose={() => setCreatingFolder(false)} />}

      {creating &&
        createPortal(
          <div className="dict-modal-backdrop" role="presentation" onClick={resetCreate}>
            <form
              className="dict-form note-create-form"
              role="dialog"
              aria-modal="true"
              aria-labelledby="note-create-title"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault()
                void create()
              }}
            >
              <div className="dict-form-head">
                <h2 id="note-create-title">ახალი ნოუთი</h2>
                <button type="button" className="btn-icon" aria-label="დახურვა" onClick={resetCreate}>
                  <X size={16} />
                </button>
              </div>
              {creationFolderId !== null && <p className="creation-folder-hint">საქაღალდე: {(() => {
                const folder = foldersQuery.data?.find(f => f.id === creationFolderId)
                return folder ? folderPath(foldersQuery.data ?? [], folder) : 'იტვირთება…'
              })()}</p>}
              <label>
                სახელი
                <input
                  value={title}
                  autoFocus
                  placeholder="ნოუთის სახელი"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <div className="notes-seg notes-seg-compact" role="group" aria-label="ნოუთის ტიპი">
                {(['checklist', 'rich_text'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`notes-seg-btn ${noteType === type ? 'active' : ''}`}
                    aria-pressed={noteType === type}
                    onClick={() => setNoteType(type)}
                  >
                    {type === 'checklist' ? 'ჩეკლისტი' : 'ტექსტური ნოუთი'}
                  </button>
                ))}
              </div>
              {(noteType === 'checklist' || canPassword) && <div className={`note-create-options ${noteType === 'checklist' && canPassword ? 'has-two-options' : ''}`}>
              {noteType === 'checklist' && <div className={`pwd-protect ${priced ? 'is-on' : ''}`}>
                <button
                  type="button"
                  className="pwd-protect-toggle"
                  aria-pressed={priced}
                  onClick={() => setPriced((value) => !value)}
                >
                  <span className="pwd-protect-icon" aria-hidden>
                    <Banknote size={15} />
                  </span>
                  <span className="pwd-protect-copy">
                    <strong>ფასიანი ნოუთი</strong>
                    <span>{priced ? 'ხაზებს ექნება თანხა' : 'თანხის გარეშე'}</span>
                  </span>
                  <span className={`pwd-switch ${priced ? 'on' : ''}`} aria-hidden>
                    <span className="pwd-switch-thumb" />
                  </span>
                </button>
              </div>}
              {canPassword && (
                <PasswordProtectFields
                  panelPlacement="after"
                  enabled={passwordProtected}
                  onEnabledChange={setPasswordProtected}
                  password={password}
                  onPasswordChange={setPassword}
                  confirmation={passwordConfirmation}
                  onConfirmationChange={setPasswordConfirmation}
                />
              )}
              </div>}
              {createError && <p className="error">{createError}</p>}
              <div className="dict-form-actions">
                <button type="button" className="btn-ghost" onClick={resetCreate}>
                  გაუქმება
                </button>
                <button type="submit" className="btn-primary" disabled={createNote.isPending}>
                  {createNote.isPending ? 'იქმნება…' : 'შექმნა'}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {pendingDelete && (
        <UnlockModal
          title={pendingDelete.title}
          kindLabel="ნოუთის წაშლა"
          hint="დაცული ნოუთის წასაშლელად პაროლი აუცილებელია"
          submitLabel="წაშლა"
          busyLabel="იშლება…"
          variant="danger"
          busy={deleteNote.isPending}
          onClose={() => setPendingDelete(null)}
          onSubmit={async (pwd) => {
            await deleteNote.mutateAsync({ id: pendingDelete.id, password: pwd })
            setPendingDelete(null)
          }}
        />
      )}
    </div>
  )
}
