import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, BellOff, FileDown, FileSpreadsheet, Settings2, UserPlus } from 'lucide-react'
import { ShareModal } from '@/components/ShareModal'
import { useMe } from '@/hooks/useAuth'
import {
  useCreateCustomColumn,
  useCreateSheetRow,
  useCustomColumns,
  useDeleteCustomColumn,
  useDeleteSheetRow,
  useReorderCustomColumns,
  useRolloverSheetRows,
  useSheetRows,
  useUpdateCustomColumn,
  useUpdateSheet,
  useUpdateSheetRow,
} from '@/hooks/useLedger'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '@/lib/datetime'
import { buildExportTable, exportToExcel, exportToPdf } from '@/lib/exportSheet'
import { evaluateFormula, formatFormulaValue } from '@/lib/formula'
import {
  derivePaymentStatus,
  findRoleColumn,
  paymentTotals,
  rowPayablePaid,
  rowRemaining,
} from '@/lib/payment'
import type { ColumnRole, ColumnType, CustomColumn, Sheet, SheetRow } from '@/lib/types'

function parseChoices(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function formatMoney(value: number): string {
  return value.toLocaleString('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function isMonthlySheet(sheet: Sheet): boolean {
  return sheet.kind === 'monthly_expenses' || sheet.kind === 'table'
}

function isRowBlank(row: SheetRow): boolean {
  const title = (row.title ?? '').trim()
  if (title !== '' && title !== 'ახალი რიგი') return false
  if ((row.notes ?? '').trim() !== '') return false
  if (row.reminder_at) return false
  const values = row.values ?? {}
  return Object.values(values).every((v) => v == null || String(v).trim() === '')
}

type SortKey = 'title' | 'notes' | 'reminder_at' | `col:${string}`

function sortIndicator(active: boolean, dir: 'asc' | 'desc' | undefined): string {
  if (!active) return '↕'
  return dir === 'asc' ? '↑' : '↓'
}

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  numeric: boolean,
): number {
  const aEmpty = a == null || a === ''
  const bEmpty = b == null || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1

  if (numeric) {
    const an = typeof a === 'number' ? a : Number(String(a).replace(',', '.'))
    const bn = typeof b === 'number' ? b : Number(String(b).replace(',', '.'))
    const aOk = !Number.isNaN(an)
    const bOk = !Number.isNaN(bn)
    if (aOk && bOk) return an - bn
    if (aOk) return -1
    if (bOk) return 1
  }

  return String(a).localeCompare(String(b), 'ka', { numeric: true, sensitivity: 'base' })
}

export function TableGrid({
  yearMonth,
  sheet,
}: {
  yearMonth: string
  sheet: Sheet
}) {
  const sheetId = sheet.id
  const monthly = isMonthlySheet(sheet)
  const remindersEnabled = Boolean(sheet.reminders_enabled)
  const rowMonth = monthly ? yearMonth : null
  const me = useMe()
  const canShare =
    (sheet.is_owner === true || sheet.my_role === 'moderator') &&
    me.data?.limits.can_share === true

  const rowsQuery = useSheetRows(sheetId, rowMonth)
  const customColumns = useCustomColumns(sheetId)
  const createRow = useCreateSheetRow(sheetId, rowMonth)
  const updateRow = useUpdateSheetRow(sheetId, rowMonth)
  const deleteRow = useDeleteSheetRow(sheetId, rowMonth)
  const createColumn = useCreateCustomColumn(sheetId)
  const updateColumn = useUpdateCustomColumn(sheetId)
  const deleteColumn = useDeleteCustomColumn(sheetId)
  const reorderColumns = useReorderCustomColumns(sheetId)
  const updateSheet = useUpdateSheet()
  const rollover = useRolloverSheetRows(sheetId, yearMonth)

  const [editOpen, setEditOpen] = useState(false)
  const [columnOpen, setColumnOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColType, setNewColType] = useState<ColumnType>('text')
  const [newColChoices, setNewColChoices] = useState('')
  const [newColFormula, setNewColFormula] = useState('=')
  const [newColSummable, setNewColSummable] = useState(true)
  const [editingColId, setEditingColId] = useState<number | null>(null)
  const [editChoices, setEditChoices] = useState('')
  const [editFormula, setEditFormula] = useState('')
  const [budgetDraft, setBudgetDraft] = useState(sheet.budget ?? '')
  const [reminderRowId, setReminderRowId] = useState<number | null>(null)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)

  const autoRolloverRef = useRef<string | null>(null)
  const ensuringBlankRef = useRef(false)
  const tableRef = useRef<HTMLTableElement>(null)
  const rows = rowsQuery.data ?? []
  const columns = customColumns.data ?? []
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const columnsRef = useRef(columns)
  columnsRef.current = columns
  const updateRowRef = useRef(updateRow)
  updateRowRef.current = updateRow
  const rolloverMutate = rollover.mutateAsync
  const createRowMutate = createRow.mutateAsync

  useEffect(() => {
    setBudgetDraft(sheet.budget ?? '')
  }, [sheet.budget, sheet.id])

  useEffect(() => {
    setSort(null)
    setEditOpen(false)
  }, [sheetId])

  useEffect(() => {
    if (!monthly || rowsQuery.isLoading || rowsQuery.isFetching) return
    if (rows.length > 0) return
    const key = `${sheetId}:${yearMonth}`
    if (autoRolloverRef.current === key) return
    autoRolloverRef.current = key
    void rolloverMutate().catch(() => undefined)
  }, [
    monthly,
    rows.length,
    rowsQuery.isLoading,
    rowsQuery.isFetching,
    sheetId,
    yearMonth,
    rolloverMutate,
  ])

  // Always keep one blank trailing row (Excel-like).
  useEffect(() => {
    if (rowsQuery.isLoading || rowsQuery.isFetching) return
    if (createRow.isPending || rollover.isPending || ensuringBlankRef.current) return
    // Wait until monthly rollover has been attempted for an empty month.
    if (monthly && rows.length === 0) {
      const key = `${sheetId}:${yearMonth}`
      if (autoRolloverRef.current !== key) return
    }
    if (rows.some(isRowBlank)) return
    ensuringBlankRef.current = true
    void createRowMutate()
      .catch(() => undefined)
      .finally(() => {
        ensuringBlankRef.current = false
      })
  }, [
    rows,
    rowsQuery.isLoading,
    rowsQuery.isFetching,
    createRow.isPending,
    rollover.isPending,
    createRowMutate,
    monthly,
    sheetId,
    yearMonth,
  ])

  const formulaBySlug = useMemo(() => {
    const map: Record<string, string | null | undefined> = {}
    for (const col of columns) {
      if (col.type === 'formula') map[col.slug] = col.formula
    }
    return map
  }, [columns])

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const { key, dir } = sort
    const factor = dir === 'asc' ? 1 : -1
    const col =
      key.startsWith('col:') ? columns.find((c) => c.slug === key.slice(4)) : undefined

    return [...rows].sort((ra, rb) => {
      let cmp = 0
      if (key === 'title') {
        cmp = compareValues(ra.title, rb.title, false)
      } else if (key === 'notes') {
        cmp = compareValues(ra.notes, rb.notes, false)
      } else if (key === 'reminder_at') {
        const at = ra.reminder_at ? new Date(ra.reminder_at).getTime() : null
        const bt = rb.reminder_at ? new Date(rb.reminder_at).getTime() : null
        cmp = compareValues(at, bt, true)
      } else if (col) {
        if (col.type === 'formula') {
          const av = evaluateFormula(col.formula, ra.values ?? {}, formulaBySlug)
          const bv = evaluateFormula(col.formula, rb.values ?? {}, formulaBySlug)
          cmp = compareValues(
            av.ok ? av.value : null,
            bv.ok ? bv.value : null,
            true,
          )
        } else if (col.type === 'number' || col.type === 'date') {
          cmp = compareValues(ra.values?.[col.slug], rb.values?.[col.slug], true)
        } else {
          cmp = compareValues(ra.values?.[col.slug], rb.values?.[col.slug], false)
        }
      }
      return cmp * factor
    })
  }, [rows, sort, columns, formulaBySlug])

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const saveField = useCallback((rowId: number, field: string, raw: string) => {
    const row = rowsRef.current.find((r) => r.id === rowId)
    if (!row) return

    if (field === 'title') {
      if (raw === (row.title ?? '')) return
      updateRowRef.current.mutate({ id: rowId, patch: { title: raw } })
      return
    }
    if (field === 'notes') {
      if (raw === (row.notes ?? '')) return
      updateRowRef.current.mutate({ id: rowId, patch: { notes: raw } })
      return
    }
    if (field.startsWith('custom:')) {
      const slug = field.slice(7)
      const col = columnsRef.current.find((c) => c.slug === slug)
      if (col?.type === 'formula') return
      const prev = row.values?.[slug]
      const parsed: string | number | null =
        col?.type === 'number' ? (raw === '' ? null : Number(raw.replace(',', '.'))) : raw
      if (String(prev ?? '') === String(parsed ?? '')) return
      updateRowRef.current.mutate({ id: rowId, patch: { values: { [slug]: parsed } } })
    }
  }, [])

  useEffect(() => {
    const table = tableRef.current
    if (!table) return

    const onFocusOut = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return
      const rowId = Number(target.dataset.rowId)
      const field = target.dataset.field
      if (!rowId || !field) return
      saveField(rowId, field, target.value)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return
      const rowId = Number(target.dataset.rowId)
      const field = target.dataset.field
      if (!rowId || !field) return
      if (e.key === 'Enter') {
        e.preventDefault()
        saveField(rowId, field, target.value)
        const row = Number(target.dataset.row)
        const col = Number(target.dataset.col)
        table.querySelector<HTMLElement>(`[data-row="${row + 1}"][data-col="${col}"]`)?.focus()
      }
    }

    table.addEventListener('focusout', onFocusOut)
    table.addEventListener('keydown', onKeyDown)
    return () => {
      table.removeEventListener('focusout', onFocusOut)
      table.removeEventListener('keydown', onKeyDown)
    }
  }, [saveField])

  useEffect(() => {
    const table = tableRef.current
    if (!table) return
    const active = document.activeElement
    for (const row of rows) {
      const sync = (field: string, next: string) => {
        const el = table.querySelector<HTMLInputElement | HTMLSelectElement>(
          `[data-row-id="${row.id}"][data-field="${field}"]`,
        )
        if (!el || el === active) return
        if (el.value !== next) el.value = next
      }
      sync('title', row.title ?? '')
      sync('notes', row.notes ?? '')
      for (const col of columns) {
        if (col.type === 'formula') continue
        const raw = row.values?.[col.slug]
        sync(`custom:${col.slug}`, raw == null ? '' : String(raw))
      }
    }
  }, [rows, columns])

  async function addColumn() {
    const name = newColName.trim()
    if (!name || createColumn.isPending) return
    const needsChoices = newColType === 'select' || newColType === 'status'
    const options = needsChoices ? parseChoices(newColChoices) : []
    if (needsChoices && options.length === 0) {
      window.alert('სტატუსი/არჩევანი სვეტს სჭირდება ვარიანტები (მძიმით გამოყოფილი).')
      return
    }
    if (newColType === 'formula' && !newColFormula.trim()) {
      window.alert('ფორმულა სავალდებულოა, მაგ. =qty*price')
      return
    }
    await createColumn.mutateAsync({
      name,
      type: newColType,
      options,
      formula: newColType === 'formula' ? newColFormula.trim() : null,
      summable: newColType === 'number' || newColType === 'formula' ? newColSummable : false,
    })
    setNewColName('')
    setNewColChoices('')
    setNewColFormula('=')
    setNewColType('text')
    setNewColSummable(true)
    setColumnOpen(false)
  }

  function moveColumn(colId: number, dir: -1 | 1) {
    const ids = columns.map((c) => c.id)
    const index = ids.indexOf(colId)
    const swap = index + dir
    if (index < 0 || swap < 0 || swap >= ids.length) return
    ;[ids[index], ids[swap]] = [ids[swap], ids[index]]
    reorderColumns.mutate(ids)
  }

  function saveBudget() {
    const trimmed = budgetDraft.trim()
    const value = trimmed === '' ? null : Number(trimmed.replace(',', '.'))
    if (trimmed !== '' && Number.isNaN(value)) return
    updateSheet.mutate({ id: sheetId, budget: value })
  }

  const cellFormula = useCallback(
    (rowValues: Record<string, string | number | null>, col: CustomColumn) => {
      if (col.type !== 'formula') return null
      return evaluateFormula(col.formula, rowValues, formulaBySlug)
    },
    [formulaBySlug],
  )

  const payableCol = findRoleColumn(columns, 'payable')
  const paidCol = findRoleColumn(columns, 'paid')
  const paymentMode = payableCol != null && paidCol != null

  const sums = useMemo(() => {
    const result: Record<string, number> = {}
    for (const col of columns) {
      if (!col.summable) continue
      if (col.type !== 'number' && col.type !== 'formula') continue
      result[col.slug] = rows.reduce((acc, row) => {
        if (isRowBlank(row)) return acc
        if (col.role === 'remaining') {
          const { payable, paid } = rowPayablePaid(row, payableCol, paidCol)
          const rem = rowRemaining(payable, paid)
          return acc + (rem ?? 0)
        }
        if (col.type === 'formula') {
          const r = evaluateFormula(col.formula, row.values ?? {}, formulaBySlug)
          return acc + (r.ok ? r.value : 0)
        }
        const v = Number(row.values?.[col.slug] ?? 0)
        return acc + (Number.isNaN(v) ? 0 : v)
      }, 0)
    }
    return result
  }, [columns, rows, formulaBySlug, payableCol, paidCol])

  const totals = useMemo(
    () => paymentTotals(rows, payableCol, paidCol, isRowBlank),
    [rows, payableCol, paidCol],
  )

  const budget = sheet.budget != null && sheet.budget !== '' ? Number(sheet.budget) : null
  // User: remaining budget subtracts payable (გადასახდელი) totals.
  const budgetLeft = budget != null && paymentMode ? budget - totals.payableSum : null
  const needsChoices = newColType === 'select' || newColType === 'status'

  async function handleExport(kind: 'excel' | 'pdf') {
    if (exporting) return
    setExporting(kind)
    try {
      const table = buildExportTable(
        sheet,
        columns,
        sortedRows.filter((r) => !isRowBlank(r)),
        rowMonth,
      )
      if (kind === 'excel') await exportToExcel(table)
      else await exportToPdf(table)
    } catch {
      window.alert('ექსპორტი ვერ მოხერხდა')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="grid-wrap">
      <div className="grid-toolbar">
        <div className="toolbar-actions">
          {canShare && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShareOpen(true)}
              title="გაზიარება"
            >
              <UserPlus size={14} />
              <span className="desktop-only">გაზიარება</span>
            </button>
          )}
          <button
            type="button"
            className={`btn-ghost ${editOpen ? 'active-toggle' : ''}`}
            onClick={() => {
              setEditOpen((v) => !v)
              setColumnOpen(false)
            }}
            title="ცხრილის რედაქტირება"
          >
            <Settings2 size={14} />
            <span className="desktop-only">რედაქტირება</span>
          </button>
          {monthly && (
            <button
              type="button"
              className="btn-ghost"
              disabled={rollover.isPending}
              onClick={() => {
                if (
                  rows.length > 0 &&
                  !confirm('ამ თვეში უკვე არის რიგები. მაინც ვცადოთ გადმოტანა?')
                ) {
                  return
                }
                void rollover.mutateAsync().then((res) => {
                  if (res.created === 0 && rows.filter((r) => !isRowBlank(r)).length > 0) {
                    window.alert('გადმოტანა მხოლოდ ცარიელ თვეში მუშაობს.')
                  }
                })
              }}
            >
              <span className="desktop-only">წინა თვიდან</span>
              <span className="mobile-only">წინა თვე</span>
            </button>
          )}
          <button
            type="button"
            className="btn-ghost"
            disabled={exporting != null || rows.every(isRowBlank)}
            title="Excel ექსპორტი"
            onClick={() => void handleExport('excel')}
          >
            <FileSpreadsheet size={14} />
            <span className="desktop-only">{exporting === 'excel' ? '…' : 'Excel'}</span>
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={exporting != null || rows.every(isRowBlank)}
            title="PDF ექსპორტი"
            onClick={() => void handleExport('pdf')}
          >
            <FileDown size={14} />
            <span className="desktop-only">{exporting === 'pdf' ? '…' : 'PDF'}</span>
          </button>
        </div>

        {paymentMode && (
          <div className="toolbar-stats">
            <label className="toolbar-stat toolbar-stat-budget">
              <span>ბიუჯეტი</span>
              <input
                className="budget-input"
                value={budgetDraft}
                placeholder="0"
                aria-label="ბიუჯეტი"
                onChange={(e) => setBudgetDraft(e.target.value)}
                onBlur={saveBudget}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    saveBudget()
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
              />
            </label>
            <div className="toolbar-stat">
              <span>გადახდილი</span>
              <strong>{formatMoney(totals.paidSum)}</strong>
            </div>
            <div className="toolbar-stat">
              <span>დარჩა გადასახდელი</span>
              <strong>{formatMoney(totals.remainingSum)}</strong>
            </div>
            <div className="toolbar-stat">
              <span>დარჩა ბიუჯეტი</span>
              <strong
                className={
                  budget == null
                    ? 'muted'
                    : budgetLeft != null && budgetLeft < 0
                      ? 'warn'
                      : 'ok'
                }
              >
                {budget == null ? '—' : formatMoney(budgetLeft ?? 0)}
              </strong>
            </div>
          </div>
        )}
      </div>

      {editOpen && !paymentMode && (
        <p className="payment-setup-hint muted">
          <span className="desktop-only">
            გადახდის ლოგიკისთვის „რედაქტირება“-ში ერთ სვეტს მიანიჭე როლი{' '}
            <em>გადასახდელი</em>, მეორეს — <em>გადახდილი</em>. შემდეგ აქ გამოჩნდება ბიუჯეტიც.
          </span>
          <span className="mobile-only">
            ბიუჯეტისთვის სვეტს მიანიჭე როლი <em>გადასახდელი</em> და <em>გადახდილი</em>.
          </span>
        </p>
      )}

      {editOpen && (
        <div className="sheet-edit-panel">
          <div className="sheet-edit-head">
            <strong>სვეტები</strong>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setColumnOpen((v) => !v)}
            >
              {columnOpen ? 'გაუქმება' : '+ სვეტი'}
            </button>
          </div>

          {columnOpen && (
            <div className="column-form compact">
              <input
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="სვეტის სახელი"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addColumn()
                }}
              />
              <select
                value={newColType}
                onChange={(e) => setNewColType(e.target.value as ColumnType)}
              >
                <option value="text">ტექსტი</option>
                <option value="number">რიცხვი</option>
                <option value="formula">ფორმულა</option>
                <option value="date">თარიღი</option>
                <option value="select">არჩევანი</option>
                <option value="status">სტატუსი</option>
              </select>
              {needsChoices && (
                <input
                  value={newColChoices}
                  onChange={(e) => setNewColChoices(e.target.value)}
                  placeholder="ვარიანტები მძიმით"
                />
              )}
              {newColType === 'formula' && (
                <input
                  value={newColFormula}
                  onChange={(e) => setNewColFormula(e.target.value)}
                  placeholder="=qty*price"
                />
              )}
              {(newColType === 'number' || newColType === 'formula') && (
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={newColSummable}
                    onChange={(e) => setNewColSummable(e.target.checked)}
                  />
                  ჯამი
                </label>
              )}
              <button type="button" className="btn-primary" onClick={() => void addColumn()}>
                დამატება
              </button>
            </div>
          )}

          <div className="sheet-edit-cols">
            {columns.length === 0 && (
              <p className="muted sheet-edit-empty">სვეტები ჯერ არაა</p>
            )}
            {columns.map((col, index) => (
              <ColumnChip
                key={col.id}
                col={col}
                canLeft={index > 0}
                canRight={index < columns.length - 1}
                editing={editingColId === col.id}
                editChoices={editChoices}
                editFormula={editFormula}
                onEditChoices={setEditChoices}
                onEditFormula={setEditFormula}
                onRename={(name) => {
                  const trimmed = name.trim()
                  if (!trimmed || trimmed === col.name) return
                  updateColumn.mutate({ id: col.id, patch: { name: trimmed } })
                }}
                onRoleChange={(role) => {
                  updateColumn.mutate({ id: col.id, patch: { role } })
                }}
                onStartEdit={() => {
                  setEditingColId(col.id)
                  setEditChoices((col.options ?? []).join(', '))
                  setEditFormula(col.formula ?? '=')
                }}
                onSaveChoices={() => {
                  if (col.type === 'formula') {
                    updateColumn.mutate({
                      id: col.id,
                      patch: { formula: editFormula.trim() },
                    })
                  } else {
                    updateColumn.mutate({
                      id: col.id,
                      patch: { options: parseChoices(editChoices) },
                    })
                  }
                  setEditingColId(null)
                }}
                onCancelEdit={() => setEditingColId(null)}
                onMoveLeft={() => moveColumn(col.id, -1)}
                onMoveRight={() => moveColumn(col.id, 1)}
                onToggleSum={() =>
                  updateColumn.mutate({ id: col.id, patch: { summable: !col.summable } })
                }
                onDelete={() => deleteColumn.mutate(col.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="table-scroll">
        <table className="ledger-table" ref={tableRef}>
          <thead>
            <tr>
              <th className="sticky-col">
                <button
                  type="button"
                  className={`sort-btn ${sort?.key === 'title' ? 'active' : ''}`}
                  onClick={() => toggleSort('title')}
                >
                  სათაური
                  <span className="sort-ind">
                    {sortIndicator(sort?.key === 'title', sort?.dir)}
                  </span>
                </button>
              </th>
              {columns.map((col) => {
                const key = `col:${col.slug}` as const
                const active = sort?.key === key
                return (
                  <th key={col.id}>
                    <button
                      type="button"
                      className={`sort-btn ${active ? 'active' : ''}`}
                      onClick={() => toggleSort(key)}
                    >
                      {col.name}
                      {col.summable ? ' Σ' : ''}
                      <span className="sort-ind">{sortIndicator(active, sort?.dir)}</span>
                    </button>
                  </th>
                )
              })}
              <th className="col-notes">
                <button
                  type="button"
                  className={`sort-btn ${sort?.key === 'notes' ? 'active' : ''}`}
                  onClick={() => toggleSort('notes')}
                >
                  შენიშვნა
                  <span className="sort-ind">
                    {sortIndicator(sort?.key === 'notes', sort?.dir)}
                  </span>
                </button>
              </th>
              {remindersEnabled && (
                <th className="col-reminder" title="შეხსენება">
                  <button
                    type="button"
                    className={`sort-btn ${sort?.key === 'reminder_at' ? 'active' : ''}`}
                    onClick={() => toggleSort('reminder_at')}
                    aria-label="შეხსენებით სორტი"
                  >
                    ⏰
                    <span className="sort-ind">
                      {sortIndicator(sort?.key === 'reminder_at', sort?.dir)}
                    </span>
                  </button>
                </th>
              )}
              <th className="col-actions" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <tr key={row.id}>
                <td className="sticky-col">
                  <input
                    className="cell-field"
                    type="text"
                    data-row-id={row.id}
                    data-field="title"
                    data-row={rowIndex}
                    data-col={0}
                    defaultValue={row.title ?? ''}
                  />
                </td>
                {columns.map((col, i) => {
                  const { payable, paid } = rowPayablePaid(row, payableCol, paidCol)
                  const payment = paymentMode
                    ? derivePaymentStatus(payable, paid)
                    : { label: '' as const, warn: null }

                  if (col.role === 'remaining') {
                    const rem = paymentMode ? rowRemaining(payable, paid) : null
                    const result =
                      rem != null
                        ? { ok: true as const, value: rem }
                        : cellFormula(row.values ?? {}, col)
                    return (
                      <td key={col.id}>
                        <span className={`formula-cell ${result && !result.ok ? 'warn' : 'num'}`}>
                          {result ? formatFormulaValue(result) : '—'}
                        </span>
                      </td>
                    )
                  }

                  if (col.type === 'formula') {
                    const result = cellFormula(row.values ?? {}, col)
                    return (
                      <td key={col.id}>
                        <span className={`formula-cell ${result && !result.ok ? 'warn' : 'num'}`}>
                          {result ? formatFormulaValue(result) : '—'}
                        </span>
                      </td>
                    )
                  }

                  if (col.type === 'status' && paymentMode) {
                    const tone =
                      payment.label === 'გადახდილი'
                        ? 'paid'
                        : payment.label === 'ნაწილობრივი'
                          ? 'partial'
                          : payment.label === 'მოლოდინში'
                            ? 'pending'
                            : 'empty'
                    return (
                      <td key={col.id}>
                        <span
                          className={`status-auto status-${tone}`}
                          title={payment.warn ?? undefined}
                        >
                          {payment.label || '—'}
                          {payment.warn ? ' ⚠' : ''}
                        </span>
                      </td>
                    )
                  }

                  const raw = row.values?.[col.slug]
                  const text = raw == null ? '' : String(raw)
                  const choices = Array.isArray(col.options) ? col.options : []
                  if (col.type === 'select' || col.type === 'status') {
                    return (
                      <td key={col.id}>
                        <select
                          className="cell-field"
                          data-row-id={row.id}
                          data-field={`custom:${col.slug}`}
                          data-row={rowIndex}
                          data-col={1 + i}
                          defaultValue={text}
                        >
                          <option value="">—</option>
                          {choices.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                    )
                  }

                  const roleWarn =
                    paymentMode &&
                    (col.role === 'payable' || col.role === 'paid') &&
                    payment.warn
                      ? payment.warn
                      : null

                  return (
                    <td key={col.id} className={col.type === 'number' ? 'col-num' : undefined}>
                      <input
                        className={`cell-field ${col.type === 'number' ? 'num' : ''} ${roleWarn ? 'cell-warn' : ''}`}
                        type={col.type === 'date' ? 'date' : 'text'}
                        inputMode={col.type === 'number' ? 'decimal' : undefined}
                        title={roleWarn ?? undefined}
                        data-row-id={row.id}
                        data-field={`custom:${col.slug}`}
                        data-row={rowIndex}
                        data-col={1 + i}
                        defaultValue={text}
                      />
                    </td>
                  )
                })}
                <td className="col-notes">
                  <input
                    className="cell-field"
                    type="text"
                    placeholder="—"
                    data-row-id={row.id}
                    data-field="notes"
                    data-row={rowIndex}
                    data-col={1 + columns.length}
                    defaultValue={row.notes ?? ''}
                  />
                </td>
                {remindersEnabled && (
                  <td className="reminder-cell">
                    <ReminderCell
                      row={row}
                      open={reminderRowId === row.id}
                      onToggle={() =>
                        setReminderRowId((id) => (id === row.id ? null : row.id))
                      }
                      onSave={(value) => {
                        updateRow.mutate({ id: row.id, patch: { reminder_at: value } })
                        setReminderRowId(null)
                      }}
                      onClear={() => {
                        updateRow.mutate({ id: row.id, patch: { reminder_at: null } })
                        setReminderRowId(null)
                      }}
                    />
                  </td>
                )}
                <td className="col-actions">
                  <button
                    type="button"
                    className="btn-icon"
                    title="წაშლა"
                    onClick={() => deleteRow.mutate(row.id)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={4 + columns.length} className="empty">
                  იტვირთება…
                </td>
              </tr>
            )}
          </tbody>
          {columns.some((c) => c.summable) && (
            <tfoot>
              <tr>
                <td className="sticky-col">ჯამი</td>
                {columns.map((col) => (
                  <td key={col.id} className="num">
                    {col.summable ? formatMoney(sums[col.slug] ?? 0) : ''}
                  </td>
                ))}
                <td className="col-notes" />
                <td colSpan={2}>
                  {paymentMode && budget != null ? (
                    <span className={budgetLeft != null && budgetLeft < 0 ? 'warn' : 'muted'}>
                      ბიუჯეტი {formatMoney(budget)} · დარჩა {formatMoney(budgetLeft ?? 0)}
                    </span>
                  ) : null}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {shareOpen && (
        <ShareModal
          shareableType="sheet"
          shareableId={sheet.id}
          title={sheet.name}
          canInviteModerator={sheet.is_owner === true}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  )
}

function ReminderCell({
  row,
  open,
  onToggle,
  onSave,
  onClear,
}: {
  row: SheetRow
  open: boolean
  onToggle: () => void
  onSave: (iso: string | null) => void
  onClear: () => void
}) {
  const [draft, setDraft] = useState(toDatetimeLocalValue(row.reminder_at))
  const has = Boolean(row.reminder_at)
  const sent = Boolean(row.reminder_sent_at)

  useEffect(() => {
    if (open) setDraft(toDatetimeLocalValue(row.reminder_at))
  }, [open, row.reminder_at])

  return (
    <div className={`reminder-wrap ${open ? 'open' : ''}`}>
      <button
        type="button"
        className={`btn-icon reminder-btn ${has ? 'on' : ''} ${sent ? 'sent' : ''}`}
        title={
          sent
            ? 'შეხსენება გაგზავნილია'
            : has
              ? toDatetimeLocalValue(row.reminder_at)
              : 'შეხსენება'
        }
        onClick={onToggle}
      >
        {has ? <Bell size={15} /> : <BellOff size={15} />}
      </button>
      {open && (
        <div className="reminder-popover">
          <input
            type="datetime-local"
            className="reminder-popover-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="reminder-popover-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => onSave(fromDatetimeLocalValue(draft))}
            >
              შენახვა
            </button>
            {has && (
              <button type="button" className="btn-ghost" onClick={onClear}>
                წაშლა
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={onToggle}>
              გაუქმება
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ColumnChip({
  col,
  canLeft,
  canRight,
  editing,
  editChoices,
  editFormula,
  onEditChoices,
  onEditFormula,
  onRename,
  onRoleChange,
  onStartEdit,
  onSaveChoices,
  onCancelEdit,
  onMoveLeft,
  onMoveRight,
  onToggleSum,
  onDelete,
}: {
  col: CustomColumn
  canLeft: boolean
  canRight: boolean
  editing: boolean
  editChoices: string
  editFormula: string
  onEditChoices: (v: string) => void
  onEditFormula: (v: string) => void
  onRename: (name: string) => void
  onRoleChange: (role: ColumnRole) => void
  onStartEdit: () => void
  onSaveChoices: () => void
  onCancelEdit: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
  onToggleSum: () => void
  onDelete: () => void
}) {
  const [nameDraft, setNameDraft] = useState(col.name)
  const isChoice = col.type === 'select' || col.type === 'status'
  const isFormula = col.type === 'formula'
  const canEditMeta = isChoice || isFormula
  const canSetRole = col.type === 'number' || col.type === 'formula'

  useEffect(() => {
    setNameDraft(col.name)
  }, [col.name])

  return (
    <div className="sheet-edit-col">
      <div className="sheet-edit-col-main">
        <button type="button" className="btn-icon" disabled={!canLeft} onClick={onMoveLeft} title="მარცხნივ">
          ←
        </button>
        <input
          className="sheet-edit-name"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => onRename(nameDraft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') {
              setNameDraft(col.name)
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          title="სვეტის სახელი"
        />
        <span className="muted">{col.type}</span>
        {canSetRole && (
          <select
            className="sheet-edit-role"
            value={col.role ?? ''}
            onChange={(e) => {
              const v = e.target.value
              onRoleChange(v === '' ? null : (v as ColumnRole))
            }}
            title="გადახდის როლი"
          >
            <option value="">როლი —</option>
            <option value="payable">გადასახდელი</option>
            <option value="paid">გადახდილი</option>
            <option value="remaining">დარჩენილი</option>
          </select>
        )}
        {(col.type === 'number' || col.type === 'formula') && (
          <button
            type="button"
            className={`sum-toggle ${col.summable ? 'on' : ''}`}
            onClick={onToggleSum}
            title="ჯამში ჩართვა"
          >
            Σ
          </button>
        )}
        <button type="button" className="btn-icon" disabled={!canRight} onClick={onMoveRight} title="მარჯვნივ">
          →
        </button>
        <button type="button" className="btn-icon" title="სვეტის წაშლა" onClick={onDelete}>
          ×
        </button>
      </div>
      {canEditMeta && !editing && (
        <button type="button" className="btn-ghost sheet-edit-meta" onClick={onStartEdit}>
          {isFormula ? (col.formula || 'ფორმულა') : `ვარიანტები (${(col.options ?? []).length})`}
        </button>
      )}
      {editing && isChoice && (
        <div className="sheet-edit-inline">
          <input
            className="chip-edit"
            value={editChoices}
            onChange={(e) => onEditChoices(e.target.value)}
            placeholder="ა, ბ, გ"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveChoices()
              if (e.key === 'Escape') onCancelEdit()
            }}
          />
          <button type="button" className="btn-primary" onClick={onSaveChoices}>
            OK
          </button>
        </div>
      )}
      {editing && isFormula && (
        <div className="sheet-edit-inline">
          <input
            className="chip-edit"
            value={editFormula}
            onChange={(e) => onEditFormula(e.target.value)}
            placeholder="=qty*price"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveChoices()
              if (e.key === 'Escape') onCancelEdit()
            }}
          />
          <button type="button" className="btn-primary" onClick={onSaveChoices}>
            OK
          </button>
        </div>
      )}
    </div>
  )
}
