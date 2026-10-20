import { Check, Circle, Copy, FileSpreadsheet, UserPlus } from 'lucide-react'
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
import { copyNoteForWord, exportPricedNote } from '@/lib/exportNote'
import {
  formatNoteAmount,
  parseNoteAmount,
  splitNoteLinks,
} from '@/lib/noteLinks'
import type { NoteCheckMode, NoteItem } from '@/lib/types'

function focusItemInput(id: number) {
  document
    .querySelector<HTMLInputElement>(`input[data-note-item="${id}"]`)
    ?.focus()
}

function ItemText({
  item,
  text,
  editable,
  editing,
  onStartEdit,
  onStopEdit,
  onChange,
  onKeyDown,
}: {
  item: NoteItem
  text: string
  editable: boolean
  editing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  const parts = splitNoteLinks(text)
  const hasLinks = parts.some((p) => p.type === 'link')
  const showInput = editable && (editing || !hasLinks)

  if (showInput) {
    return (
      <input
        className="notes-item-input"
        data-note-item={item.id}
        value={text}
        placeholder="პუნქტი ან ლინკი"
        onFocus={onStartEdit}
        onBlur={onStopEdit}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    )
  }

  return (
    <div
      className="notes-item-body"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return
        if (editable) onStartEdit()
      }}
    >
      {parts.map((part, i) =>
        part.type === 'link' ? (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {part.value}
          </a>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </div>
  )
}

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
  const [draftAmounts, setDraftAmounts] = useState<Record<number, string>>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bodyTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const amountTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const awaitingTrailingBlank = useRef(false)
  const focusItemId = useRef<number | null>(null)
  const createItemRef = useRef(createItem)
  createItemRef.current = createItem

  useEffect(() => {
    setTitle(note?.title ?? '')
    setDraftBodies({})
    setDraftAmounts({})
    setEditingId(null)
    awaitingTrailingBlank.current = false
  }, [note?.id, note?.title])

  useEffect(() => {
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current)
      for (const t of bodyTimers.current.values()) clearTimeout(t)
      for (const t of amountTimers.current.values()) clearTimeout(t)
    }
  }, [])

  function bodyOf(item: NoteItem): string {
    return draftBodies[item.id] ?? item.body
  }

  function amountOf(item: NoteItem): string {
    if (Object.prototype.hasOwnProperty.call(draftAmounts, item.id)) {
      return draftAmounts[item.id]
    }
    return item.amount ?? ''
  }

  function isItemBlank(item: NoteItem): boolean {
    return bodyOf(item).trim() === '' && parseNoteAmount(amountOf(item)) == null
  }

  const lastItem = items[items.length - 1]
  const hasTrailingBlank = lastItem != null && isItemBlank(lastItem)

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
    setEditingId(id)
    requestAnimationFrame(() => focusItemInput(id))
  }, [items])

  useEffect(() => {
    if (editingId == null) return
    const id = editingId
    const frame = requestAnimationFrame(() => focusItemInput(id))
    return () => cancelAnimationFrame(frame)
  }, [editingId])

  if (locked || !note) {
    return null
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

  function scheduleAmountSave(item: NoteItem, raw: string) {
    setDraftAmounts((prev) => ({ ...prev, [item.id]: raw }))
    const existing = amountTimers.current.get(item.id)
    if (existing) clearTimeout(existing)
    amountTimers.current.set(
      item.id,
      setTimeout(() => {
        const parsed = parseNoteAmount(raw)
        const current = item.amount == null ? null : Number(item.amount)
        if (parsed !== current) {
          updateItem.mutate({ id: item.id, amount: parsed })
        }
        amountTimers.current.delete(item.id)
      }, 300),
    )
  }

  function commitAmount(item: NoteItem) {
    const parsed = parseNoteAmount(amountOf(item))
    setDraftAmounts((prev) => ({
      ...prev,
      [item.id]: parsed == null ? '' : parsed.toFixed(2),
    }))
    const current = item.amount == null ? null : Number(item.amount)
    if (parsed !== current) {
      updateItem.mutate({ id: item.id, amount: parsed })
    }
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
      setDraftBodies((prev) => ({ ...prev, [item.id]: '' }))
      setDraftAmounts((prev) => ({ ...prev, [item.id]: '' }))
      if (item.body !== '' || item.amount != null || item.checked) {
        updateItem.mutate({ id: item.id, body: '', amount: null, checked: false })
      }
      return
    }
    const prev = items[index - 1]
    const next = items[index + 1]
    await deleteItem.mutateAsync(item.id)
    focusItemId.current = prev?.id ?? next?.id ?? null
  }

  function focusRow(id: number) {
    focusItemId.current = id
    setEditingId(id)
    requestAnimationFrame(() => focusItemInput(id))
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
      if (next && isItemBlank(next)) {
        focusRow(next.id)
        return
      }

      const trailing = items[items.length - 1]
      if (trailing && isItemBlank(trailing)) {
        focusRow(trailing.id)
      }
      return
    }

    if (
      e.key === 'Backspace' &&
      e.currentTarget.value === '' &&
      amountOf(item) === '' &&
      items.length > 1
    ) {
      const isLast = index === items.length - 1
      const prevHasContent = index > 0 ? !isItemBlank(items[index - 1]) : false
      if (isLast && prevHasContent) return

      e.preventDefault()
      const prev = items[index - 1]
      await deleteItem.mutateAsync(item.id)
      if (prev) focusRow(prev.id)
    }
  }

  const filledItems = items.filter((i) => !isItemBlank(i))
  const doneCount = filledItems.filter((i) => i.checked).length
  const totalFilled = filledItems.length
  const priced = note.priced !== false
  const amountValues = items.map((i) => ({
    value: parseNoteAmount(amountOf(i)),
    checked: i.checked,
  }))
  const hasAnyAmount = amountValues.some((a) => a.value != null)
  const amountTotal = amountValues.reduce((sum, a) => sum + (a.value ?? 0), 0)
  const checkedTotal = amountValues.reduce(
    (sum, a) => sum + (a.checked ? (a.value ?? 0) : 0),
    0,
  )
  const editable =
    note.is_owner === true || note.my_role === 'moderator' || note.my_role == null
  const canShare =
    (note.is_owner === true || note.my_role === 'moderator') &&
    me.data?.limits.can_share === true

  const exportLines = items
    .filter((item) => !isItemBlank(item))
    .map((item) => ({
      body: bodyOf(item),
      checked: item.checked,
      amount: parseNoteAmount(amountOf(item)),
    }))

  async function exportNote() {
    if (exporting || exportLines.length === 0) return
    setExporting(true)
    try {
      if (priced) {
        await exportPricedNote(note.title.trim() || 'ნოუთი', exportLines)
      } else {
        await copyNoteForWord(note.title.trim() || 'ნოუთი', note.check_mode, exportLines)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      }
    } catch {
      window.alert(priced ? 'Excel ვერ შეიქმნა.' : 'ტექსტი ვერ დაკოპირდა.')
    } finally {
      setExporting(false)
    }
  }

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
              <div className="notes-toolbar-main">
              <button
                type="button"
                className={`btn-ghost notes-priced-btn ${priced ? 'active-toggle' : ''}`}
                aria-pressed={priced}
                onClick={() => updateNote.mutate({ id: note.id, priced: !priced })}
              >
                ფასიანი
              </button>
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
            <button
              type="button"
              className="btn-ghost notes-export-btn"
              disabled={exporting || exportLines.length === 0}
              title={priced ? 'Excel-ში გადატანა' : 'ტექსტის კოპირება Word-ისთვის'}
              onClick={() => void exportNote()}
            >
              {priced ? <FileSpreadsheet size={15} /> : <Copy size={15} />}
              {priced ? 'Excel' : copied ? 'დაკოპირდა' : 'Word'}
            </button>
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
            const filled = !isItemBlank(item)
            return (
              <li
                key={item.id}
                className={`notes-item ${item.checked ? 'is-checked' : ''} ${!filled ? 'is-blank' : ''} ${priced ? '' : 'is-plain'}`}
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
                <ItemText
                  item={item}
                  text={bodyOf(item)}
                  editable={editable}
                  editing={editingId === item.id}
                  onStartEdit={() => setEditingId(item.id)}
                  onStopEdit={() => {
                    setEditingId((id) => (id === item.id ? null : id))
                  }}
                  onChange={(value) => scheduleBodySave(item, value)}
                  onKeyDown={(e) => {
                    if (editable) void onItemKeyDown(e, item, index)
                  }}
                />
                {priced && (
                  <input
                    className="notes-item-amount"
                    value={amountOf(item)}
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-label="თანხა"
                    readOnly={!editable}
                    onChange={(e) => {
                      if (editable) scheduleAmountSave(item, e.target.value)
                    }}
                    onBlur={() => {
                      if (editable) commitAmount(item)
                    }}
                    onKeyDown={(e) => {
                      if (!editable) return
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commitAmount(item)
                        void onItemKeyDown(e, item, index)
                      }
                    }}
                  />
                )}
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

        {priced && hasAnyAmount && (
          <div className="notes-total">
            {checkedTotal > 0 && checkedTotal !== amountTotal && (
              <span className="muted">მონიშნული {formatNoteAmount(checkedTotal)}</span>
            )}
            <strong>ჯამი {formatNoteAmount(amountTotal)}</strong>
          </div>
        )}
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
