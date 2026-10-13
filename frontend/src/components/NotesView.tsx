import { Check, Circle, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ShareModal } from '@/components/ShareModal'
import { useMe } from '@/hooks/useAuth'
import {
  useCreateNoteItem,
  useDeleteNoteItem,
  useNotes,
  useUpdateNote,
  useUpdateNoteItem,
} from '@/hooks/useNotes'
import type { NoteCheckMode, NoteItem } from '@/lib/types'

export function NotesView({ noteId }: { noteId: number }) {
  const me = useMe()
  const notesQuery = useNotes()
  const updateNote = useUpdateNote()
  const createItem = useCreateNoteItem()
  const updateItem = useUpdateNoteItem()
  const deleteItem = useDeleteNoteItem()

  const note = (notesQuery.data ?? []).find((n) => n.id === noteId) ?? null
  const locked = Boolean(note?.is_locked && note.is_unlocked !== true)
  const items = locked ? [] : (note?.items ?? [])

  const [title, setTitle] = useState(note?.title ?? '')
  const [draftBodies, setDraftBodies] = useState<Record<number, string>>({})
  const [shareOpen, setShareOpen] = useState(false)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bodyTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const awaitingTrailingBlank = useRef(false)
  const focusItemId = useRef<number | null>(null)
  const createItemRef = useRef(createItem)
  createItemRef.current = createItem

  useEffect(() => {
    setTitle(note?.title ?? '')
    setDraftBodies({})
    awaitingTrailingBlank.current = false
  }, [note?.id, note?.title])

  useEffect(() => {
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current)
      for (const t of bodyTimers.current.values()) clearTimeout(t)
    }
  }, [])

  const lastItem = items[items.length - 1]
  const lastText =
    lastItem != null
      ? (draftBodies[lastItem.id] ?? lastItem.body).trim()
      : null
  const hasTrailingBlank = lastItem != null && lastText === ''

  useEffect(() => {
    if (hasTrailingBlank) {
      awaitingTrailingBlank.current = false
    }
  }, [hasTrailingBlank])

  useEffect(() => {
    if (!note || locked) return
    if (note.my_role === 'viewer') return
    if (hasTrailingBlank) return
    if (awaitingTrailingBlank.current) return

    awaitingTrailingBlank.current = true
    const position = (lastItem?.position ?? -1) + 1
    void createItemRef.current
      .mutateAsync({
        note_id: note.id,
        body: '',
        checked: false,
        position,
      })
      .catch(() => {
        awaitingTrailingBlank.current = false
      })
  }, [note, locked, hasTrailingBlank, lastItem?.position, items.length, note?.my_role])

  useEffect(() => {
    if (focusItemId.current == null) return
    const id = focusItemId.current
    focusItemId.current = null
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLInputElement>(`input[data-note-item="${id}"]`)
        ?.focus()
    })
  }, [items])

  if (locked || !note) {
    return null
  }

  function bodyOf(item: NoteItem): string {
    return draftBodies[item.id] ?? item.body
  }

  function scheduleTitleSave(next: string) {
    setTitle(next)
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      const trimmed = next.trim()
      if (trimmed && trimmed !== note!.title) {
        updateNote.mutate({ id: note!.id, title: trimmed })
      }
    }, 400)
  }

  function scheduleBodySave(item: NoteItem, body: string) {
    setDraftBodies((prev) => ({ ...prev, [item.id]: body }))
    const existing = bodyTimers.current.get(item.id)
    if (existing) clearTimeout(existing)
    bodyTimers.current.set(
      item.id,
      setTimeout(() => {
        if (body !== item.body) {
          updateItem.mutate({ id: item.id, body })
        }
        bodyTimers.current.delete(item.id)
      }, 300),
    )
  }

  if (!note) {
    return (
      <div className="empty-sheets">
        <p>ნოუთი ვერ მოიძებნა.</p>
      </div>
    )
  }

  const activeNote = note

  function setMode(mode: NoteCheckMode) {
    if (mode === activeNote.check_mode) return
    updateNote.mutate({ id: activeNote.id, check_mode: mode })
  }

  function toggleChecked(item: NoteItem) {
    if (activeNote.check_mode === 'radio') {
      updateItem.mutate({ id: item.id, checked: true })
      return
    }
    updateItem.mutate({ id: item.id, checked: !item.checked })
  }

  async function removeItem(item: NoteItem, index: number) {
    if (items.length <= 1) {
      // Keep one trailing blank — clear instead of deleting the last row.
      setDraftBodies((prev) => ({ ...prev, [item.id]: '' }))
      if (item.body !== '') {
        updateItem.mutate({ id: item.id, body: '', checked: false })
      } else if (item.checked) {
        updateItem.mutate({ id: item.id, checked: false })
      }
      return
    }
    const prev = items[index - 1]
    const next = items[index + 1]
    await deleteItem.mutateAsync(item.id)
    focusItemId.current = prev?.id ?? next?.id ?? null
  }

  async function onItemKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    item: NoteItem,
    index: number,
  ) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const body = bodyOf(item)
      if (body !== item.body) {
        await updateItem.mutateAsync({ id: item.id, body })
      }

      const next = items[index + 1]
      if (next && bodyOf(next).trim() === '') {
        focusItemId.current = next.id
        requestAnimationFrame(() => {
          document
            .querySelector<HTMLInputElement>(`input[data-note-item="${next.id}"]`)
            ?.focus()
        })
        return
      }

      const trailing = items[items.length - 1]
      if (trailing && bodyOf(trailing).trim() === '') {
        focusItemId.current = trailing.id
        requestAnimationFrame(() => {
          document
            .querySelector<HTMLInputElement>(
              `input[data-note-item="${trailing.id}"]`,
            )
            ?.focus()
        })
        return
      }
      return
    }

    if (
      e.key === 'Backspace' &&
      e.currentTarget.value === '' &&
      items.length > 1
    ) {
      const isLast = index === items.length - 1
      const prevHasContent =
        index > 0 ? bodyOf(items[index - 1]).trim() !== '' : false
      if (isLast && prevHasContent) return

      e.preventDefault()
      const prev = items[index - 1]
      await deleteItem.mutateAsync(item.id)
      if (prev) focusItemId.current = prev.id
    }
  }

  const doneCount = items.filter((i) => i.checked && bodyOf(i).trim() !== '').length
  const totalFilled = items.filter((i) => bodyOf(i).trim() !== '').length
  const editable =
    note.is_owner === true || note.my_role === 'moderator' || note.my_role == null
  const canShare =
    (note.is_owner === true || note.my_role === 'moderator') &&
    me.data?.limits.can_share === true

  return (
    <div className="notes-shell">
      <article className="notes-page">
        <header className="notes-page-head">
          <input
            className="notes-title"
            value={title}
            readOnly={!editable}
            onChange={(e) => {
              if (editable) scheduleTitleSave(e.target.value)
            }}
            onBlur={() => {
              if (!editable) return
              const trimmed = title.trim()
              if (!trimmed) setTitle(note.title)
              else if (trimmed !== note.title) {
                updateNote.mutate({ id: note.id, title: trimmed })
              }
            }}
            placeholder="უსათაურო"
          />

          <div className="notes-toolbar">
            {editable && (
              <div className="notes-seg" role="group" aria-label="მონიშვნის ტიპი">
                <button
                  type="button"
                  className={`notes-seg-btn ${note.check_mode === 'checkbox' ? 'active' : ''}`}
                  onClick={() => setMode('checkbox')}
                >
                  ჩექლისტი
                </button>
                <button
                  type="button"
                  className={`notes-seg-btn ${note.check_mode === 'radio' ? 'active' : ''}`}
                  onClick={() => setMode('radio')}
                >
                  ერთი არჩევანი
                </button>
              </div>
            )}
            {!editable && (
              <span className="notes-role-badge muted">მხოლოდ ნახვა</span>
            )}
            {totalFilled > 0 && (
              <span className="notes-meta muted">
                {doneCount}/{totalFilled}
              </span>
            )}
            {canShare && (
              <button
                type="button"
                className="btn-ghost notes-share-btn"
                onClick={() => setShareOpen(true)}
              >
                <UserPlus size={15} />
                გაზიარება
              </button>
            )}
          </div>
        </header>

        <ul className="notes-items">
          {items.map((item, index) => {
            const filled = bodyOf(item).trim() !== ''
            return (
              <li
                key={item.id}
                className={`notes-item ${item.checked ? 'is-checked' : ''} ${!filled ? 'is-blank' : ''}`}
              >
                <button
                  type="button"
                  className={`notes-check ${note.check_mode} ${item.checked ? 'on' : ''}`}
                  aria-label={item.checked ? 'მონიშნული' : 'მონიშვნა'}
                  aria-pressed={item.checked}
                  disabled={!editable}
                  onClick={() => {
                    if (editable) toggleChecked(item)
                  }}
                >
                  {note.check_mode === 'checkbox' ? (
                    item.checked ? <Check size={14} strokeWidth={3} /> : null
                  ) : (
                    item.checked ? <Circle size={9} fill="currentColor" strokeWidth={0} /> : null
                  )}
                </button>
                <input
                  className="notes-item-input"
                  data-note-item={item.id}
                  value={bodyOf(item)}
                  placeholder="ახალი პუნქტი"
                  readOnly={!editable}
                  onChange={(e) => {
                    if (editable) scheduleBodySave(item, e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (editable) void onItemKeyDown(e, item, index)
                  }}
                />
                {editable && (
                  <button
                    type="button"
                    className="notes-item-delete"
                    title="ხაზის წაშლა"
                    aria-label="ხაზის წაშლა"
                    onClick={() => void removeItem(item, index)}
                  >
                    ×
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </article>

      {shareOpen && (
        <ShareModal
          shareableType="note"
          shareableId={note.id}
          title={note.title}
          canInviteModerator={note.is_owner === true}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  )
}
