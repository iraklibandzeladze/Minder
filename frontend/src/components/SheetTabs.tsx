import { FileSpreadsheet, Lock, Pencil, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  PasswordProtectFields,
  passwordPayload,
  validatePasswordProtect,
} from '@/components/PasswordProtectFields'
import { SidebarSection } from '@/components/SidebarSection'
import { UnlockModal } from '@/components/UnlockModal'
import { useMe } from '@/hooks/useAuth'
import { useCreateSheet, useDeleteSheet, useUpdateSheet } from '@/hooks/useLedger'
import { useSheetsSidebarLimit } from '@/hooks/useSidebarListLimits'
import { ApiError } from '@/lib/api'
import type { Sheet, SheetKind } from '@/lib/types'

function kindLabel(kind: SheetKind): string {
  if (kind === 'monthly_expenses') return 'თვე'
  if (kind === 'calculator') return 'calc'
  if (kind === 'ledger') return '₾'
  return ''
}

function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string }
    return body.message ?? 'შეცდომა'
  }
  return 'ქსელის შეცდომა'
}

export function SheetTabs({
  userId,
  sheets,
  activeId,
  onSelect,
}: {
  userId: number
  sheets: Sheet[]
  activeId: number | null
  onSelect: (id: number | null) => void
}) {
  const me = useMe()
  const createSheet = useCreateSheet()
  const updateSheet = useUpdateSheet()
  const deleteSheet = useDeleteSheet()
  const limit = useSheetsSidebarLimit(userId)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [passwordProtected, setPasswordProtected] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Sheet | null>(null)

  const limits = me.data?.limits
  const ownedCount = sheets.filter((s) => s.is_owner !== false).length
  const atSheetLimit =
    limits?.max_sheets != null && ownedCount >= limits.max_sheets
  const canPassword = limits?.can_password_protect === true

  const needsCollapse = sheets.length > limit
  const activeHidden =
    activeId != null && sheets.slice(limit).some((s) => s.id === activeId)

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

  const visible = expanded || !needsCollapse ? sheets : sheets.slice(0, limit)
  const hiddenCount = sheets.length - limit

  function resetCreate() {
    setName('')
    setPasswordProtected(false)
    setPassword('')
    setPasswordConfirmation('')
    setCreateError(null)
    setCreating(false)
  }

  async function create() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (atSheetLimit) {
      setCreateError(
        `ცხრილების ლიმიტი ამოწურულია (${limits?.max_sheets}). Pro გეგმა გჭირდება.`,
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
      const sheet = await createSheet.mutateAsync({
        name: trimmed,
        kind: 'table',
        ...passwordPayload(
          canPassword && passwordProtected,
          password,
          passwordConfirmation,
        ),
      })
      resetCreate()
      onSelect(sheet.id)
    } catch (err) {
      setCreateError(apiErrorMessage(err))
    }
  }

  function afterDelete(sheetId: number) {
    if (activeId === sheetId) {
      const fallback = sheets.find((s) => s.id !== sheetId)
      onSelect(fallback?.id ?? null)
    }
  }

  function requestDelete(sheet: Sheet) {
    if (sheet.is_locked) {
      setPendingDelete(sheet)
      return
    }
    if (confirm(`წავშალოთ „${sheet.name}“ სრულად?`)) {
      deleteSheet.mutate(
        { id: sheet.id },
        { onSuccess: () => afterDelete(sheet.id) },
      )
    }
  }

  return (
    <div className="sheet-nav sidebar-module">
      <SidebarSection
        key={`sheets:${userId}`}
        userId={userId}
        section="sheets"
        title="ცხრილები"
        addLabel="ცხრილის დამატება"
        addDisabled={atSheetLimit}
        addTitle={atSheetLimit ? `ლიმიტი: ${limits?.max_sheets} ცხრილი (უფასო გეგმა)` : 'ცხრილის დამატება'}
        onAdd={() => setCreating(true)}
      >
        <div className="sheet-nav-list">
          {visible.map((sheet) => (
            <div
              key={sheet.id}
              className={`sheet-nav-item ${sheet.id === activeId ? 'active' : ''}`}
            >
              {renamingId === sheet.id ? (
                <input
                  className="sheet-rename"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => {
                    const next = renameValue.trim()
                    if (next && next !== sheet.name) {
                      updateSheet.mutate({ id: sheet.id, name: next })
                    }
                    setRenamingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="sheet-nav-btn"
                  aria-current={sheet.id === activeId ? 'page' : undefined}
                  onClick={() => onSelect(sheet.id)}
                >
                  <span className="sidebar-item-icon" aria-hidden>
                    {sheet.is_locked ? <Lock size={13} /> : <FileSpreadsheet size={14} />}
                  </span>
                  <span className="sheet-nav-label-row">
                    <span>{sheet.name}</span>
                  </span>
                  {kindLabel(sheet.kind) && (
                    <span className="sheet-kind">{kindLabel(sheet.kind)}</span>
                  )}
                </button>
              )}
              <div className="sheet-nav-actions">
                <button
                  type="button"
                  className="btn-icon sheet-action"
                  title="გადარქმევა"
                  aria-label={`ცხრილის გადარქმევა: ${sheet.name}`}
                  onClick={() => {
                    setRenamingId(sheet.id)
                    setRenameValue(sheet.name)
                  }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="btn-icon sheet-action"
                  title="წაშლა"
                  aria-label={`ცხრილის წაშლა: ${sheet.name}`}
                  onClick={() => requestDelete(sheet)}
                  disabled={sheet.is_owner === false}
                  style={sheet.is_owner === false ? { visibility: 'hidden' } : undefined}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
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

      {creating &&
        createPortal(
          <div className="dict-modal-backdrop" role="presentation" onClick={resetCreate}>
            <form
              className="dict-form"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sheet-create-title"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault()
                void create()
              }}
            >
              <div className="dict-form-head">
                <h2 id="sheet-create-title">ახალი ცხრილი</h2>
                <button type="button" className="btn-icon" aria-label="დახურვა" onClick={resetCreate}>
                  <X size={16} />
                </button>
              </div>
              <label>
                სახელი
                <input
                  value={name}
                  autoFocus
                  placeholder="ცხრილის სახელი"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              {canPassword && (
                <PasswordProtectFields
                  enabled={passwordProtected}
                  onEnabledChange={setPasswordProtected}
                  password={password}
                  onPasswordChange={setPassword}
                  confirmation={passwordConfirmation}
                  onConfirmationChange={setPasswordConfirmation}
                />
              )}
              {createError && <p className="error">{createError}</p>}
              <div className="dict-form-actions">
                <button type="submit" className="btn-primary" disabled={createSheet.isPending}>
                  {createSheet.isPending ? 'იქმნება…' : 'შექმნა'}
                </button>
                <button type="button" className="btn-ghost" onClick={resetCreate}>
                  გაუქმება
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {pendingDelete && (
        <UnlockModal
          title={pendingDelete.name}
          kindLabel="ცხრილის წაშლა"
          hint="დაცული ცხრილის წასაშლელად პაროლი აუცილებელია"
          submitLabel="წაშლა"
          busyLabel="იშლება…"
          variant="danger"
          busy={deleteSheet.isPending}
          onClose={() => setPendingDelete(null)}
          onSubmit={async (pwd) => {
            const id = pendingDelete.id
            await deleteSheet.mutateAsync({ id, password: pwd })
            setPendingDelete(null)
            afterDelete(id)
          }}
        />
      )}
    </div>
  )
}
