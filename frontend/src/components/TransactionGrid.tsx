import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import {
  useAccounts,
  useCategories,
  useCreateCustomColumn,
  useCreateTransaction,
  useCustomColumns,
  useDeleteCustomColumn,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '@/hooks/useLedger'
import { nextStatus } from '@/lib/month'
import type {
  ColumnType,
  LedgerTransaction,
  TransactionStatus,
  TransactionType,
} from '@/lib/types'

function formatMoney(value: string | number): string {
  return Number(value).toLocaleString('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Spreadsheet-style grid.
 * Values live in the DOM (uncontrolled). Saves happen on focusout / Enter.
 * React Query updates must NOT remount focused inputs — keys are stable per row+field.
 */
export function TransactionGrid({
  yearMonth,
  sheetId,
}: {
  yearMonth: string
  sheetId: number
}) {
  const transactions = useTransactions(yearMonth, sheetId)
  const accounts = useAccounts()
  const categories = useCategories()
  const customColumns = useCustomColumns(sheetId)
  const update = useUpdateTransaction(yearMonth, sheetId)
  const remove = useDeleteTransaction(yearMonth, sheetId)
  const create = useCreateTransaction(yearMonth, sheetId)
  const createColumn = useCreateCustomColumn(sheetId)
  const deleteColumn = useDeleteCustomColumn(sheetId)

  const [columnOpen, setColumnOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColType, setNewColType] = useState<ColumnType>('text')
  const [saveError, setSaveError] = useState<string | null>(null)

  const rows = transactions.data ?? []
  const accountList = accounts.data ?? []
  const categoryList = categories.data ?? []
  const columns = customColumns.data ?? []

  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const updateRef = useRef(update)
  updateRef.current = update
  const tableRef = useRef<HTMLTableElement>(null)

  // Keep non-focused cells in sync with server data; never touch the focused cell.
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
        if (el.value !== next) {
          el.value = next
          el.dataset.original = next
        }
      }

      sync('occurred_on', row.occurred_on)
      sync('title', row.title)
      sync('type', row.type)
      sync('amount', String(Number(row.amount)))
      sync('amount_paid', String(Number(row.amount_paid)))
      sync('category_id', row.category_id != null ? String(row.category_id) : '')
      sync('account_id', row.account_id != null ? String(row.account_id) : '')
      sync('notes', row.notes ?? '')
      for (const col of columns) {
        const raw = row.custom_fields?.[col.slug]
        sync(`custom:${col.slug}`, raw == null ? '' : String(raw))
      }
    }
  }, [rows, columns])

  const saveField = useCallback((rowId: number, field: string, raw: string) => {
    const row = rowsRef.current.find((r) => r.id === rowId)
    if (!row) return

    let patch: Parameters<typeof update.mutate>[0]['patch'] | null = null

    if (field === 'title') {
      if (raw === row.title) return
      patch = { title: raw }
    } else if (field === 'notes') {
      if (raw === (row.notes ?? '')) return
      patch = { notes: raw }
    } else if (field === 'occurred_on') {
      if (raw === row.occurred_on) return
      patch = { occurred_on: raw }
    } else if (field === 'amount' || field === 'amount_paid') {
      const num = Number(raw.replace(',', '.'))
      if (Number.isNaN(num)) return
      if (num === Number(row[field])) return
      patch = { [field]: num }
    } else if (field === 'type') {
      if (raw === row.type) return
      patch = {
        type: raw as TransactionType,
        status: raw === 'income' ? 'paid' : row.status,
      }
    } else if (field === 'category_id' || field === 'account_id') {
      const id = raw === '' ? null : Number(raw)
      if (id === row[field]) return
      patch = { [field]: id }
    } else if (field.startsWith('custom:')) {
      const slug = field.slice(7)
      const col = columns.find((c) => c.slug === slug)
      const prev = row.custom_fields?.[slug]
      const parsed: string | number | null =
        col?.type === 'number' ? (raw === '' ? null : Number(raw.replace(',', '.'))) : raw
      if (String(prev ?? '') === String(parsed ?? '')) return
      patch = { custom_fields: { [slug]: parsed } }
    }

    if (!patch) return

    setSaveError(null)
    updateRef.current.mutate(
      { id: rowId, patch },
      {
        onError: () => setSaveError('შენახვა ვერ მოხერხდა — შეამოწმე კავშირი და სცადე თავიდან.'),
      },
    )
  }, [columns])

  // Event delegation — survives React re-renders without remounting handlers per cell
  useEffect(() => {
    const table = tableRef.current
    if (!table) return

    const onFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
        return
      }
      const rowId = Number(target.dataset.rowId)
      const field = target.dataset.field
      if (!rowId || !field) return

      // If focus moves to another cell in the same table, still save this one
      saveField(rowId, field, target.value)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
        return
      }
      const rowId = Number(target.dataset.rowId)
      const field = target.dataset.field
      if (!rowId || !field) return

      if (e.key === 'Enter') {
        e.preventDefault()
        saveField(rowId, field, target.value)
        const row = Number(target.dataset.row)
        const col = Number(target.dataset.col)
        const next = table.querySelector<HTMLElement>(
          `[data-row="${row + 1}"][data-col="${col}"]`,
        )
        next?.focus()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        // revert: blur without relying on save matching — restore from dataset
        const original = target.dataset.original ?? ''
        target.value = original
        target.blur()
      }
    }

    table.addEventListener('focusout', onFocusOut)
    table.addEventListener('keydown', onKeyDown)
    return () => {
      table.removeEventListener('focusout', onFocusOut)
      table.removeEventListener('keydown', onKeyDown)
    }
  }, [saveField])

  async function addColumn() {
    const name = newColName.trim()
    if (!name || createColumn.isPending) return
    await createColumn.mutateAsync({ name, type: newColType })
    setNewColName('')
    setNewColType('text')
    setColumnOpen(false)
  }

  const expenseRows = rows.filter((r) => r.type === 'expense')
  const incomeRows = rows.filter((r) => r.type === 'income')
  const totals = {
    expense: expenseRows.reduce((s, r) => s + Number(r.amount), 0),
    expensePaid: expenseRows.reduce((s, r) => s + Number(r.amount_paid), 0),
    income: incomeRows.reduce((s, r) => s + Number(r.amount), 0),
  }

  const customStart = 8

  return (
    <div className="grid-wrap">
      <div className="grid-toolbar">
        <button type="button" className="btn-ghost" onClick={() => create.mutate({ type: 'expense' })}>
          + ხარჯი
        </button>
        <button type="button" className="btn-ghost" onClick={() => create.mutate({ type: 'income' })}>
          + შემოსავალი
        </button>
        <button type="button" className="btn-ghost" onClick={() => setColumnOpen((v) => !v)}>
          + სვეტი
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          რედაქტორი v3 — დააკლიკე უჯრას და პირდაპირ წერე
        </span>
      </div>

      {saveError && <p className="error" style={{ padding: '8px 12px' }}>{saveError}</p>}

      {columnOpen && (
        <div className="column-form">
          <input
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="სვეტის სახელი"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addColumn()
            }}
          />
          <select value={newColType} onChange={(e) => setNewColType(e.target.value as ColumnType)}>
            <option value="text">ტექსტი</option>
            <option value="number">რიცხვი</option>
            <option value="date">თარიღი</option>
            <option value="select">არჩევანი</option>
            <option value="status">სტატუსი</option>
          </select>
          <button type="button" className="btn-primary" onClick={() => void addColumn()}>
            დამატება
          </button>
          <button type="button" className="btn-ghost" onClick={() => setColumnOpen(false)}>
            გაუქმება
          </button>
        </div>
      )}

      {columns.length > 0 && (
        <div className="column-chips">
          {columns.map((col) => (
            <span key={col.id} className="chip">
              <em>{col.name}</em> {col.type}
              <button
                type="button"
                className="btn-icon"
                title="სვეტის წაშლა"
                onClick={() => deleteColumn.mutate(col.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="table-scroll">
        <table className="ledger-table" ref={tableRef}>
          <thead>
            <tr>
              <th>თარიღი</th>
              <th>სათაური</th>
              <th>ტიპი</th>
              <th>თანხა</th>
              <th>კატეგორია</th>
              <th>ანგარიში</th>
              <th>სტატუსი</th>
              <th>გადახდილი</th>
              {columns.map((col) => (
                <th key={col.id}>{col.name}</th>
              ))}
              <th>შენიშვნა</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <MemoTransactionRow
                key={row.id}
                row={row}
                rowIndex={rowIndex}
                accountList={accountList}
                categoryList={categoryList}
                columns={columns}
                customStart={customStart}
                onStatus={() =>
                  update.mutate({ id: row.id, patch: { status: nextStatus(row.status) } })
                }
                onDelete={() => remove.mutate(row.id)}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10 + columns.length} className="empty">
                  ცარიელი თვე — Cmd+K ან + ხარჯი / + შემოსავალი
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>ჯამი</td>
              <td className="num">
                <div>ხარჯი {formatMoney(totals.expense)}</div>
                <div className="ok">შემოს. {formatMoney(totals.income)}</div>
              </td>
              <td colSpan={3} />
              <td className="num">{formatMoney(totals.expensePaid)}</td>
              <td colSpan={1 + columns.length} className="num muted">
                დარჩა {formatMoney(totals.expense - totals.expensePaid)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function TransactionRow({
  row,
  rowIndex,
  accountList,
  categoryList,
  columns,
  customStart,
  onStatus,
  onDelete,
}: {
  row: LedgerTransaction
  rowIndex: number
  accountList: Array<{ id: number; name: string }>
  categoryList: Array<{ id: number; name: string }>
  columns: Array<{ id: number; slug: string; type: ColumnType; name: string }>
  customStart: number
  onStatus: () => void
  onDelete: () => void
}) {
  return (
    <tr className={row.type === 'income' ? 'row-income' : undefined}>
      <td>
        <input
          className="cell-field"
          type="date"
          data-row-id={row.id}
          data-field="occurred_on"
          data-row={rowIndex}
          data-col={0}
          data-original={row.occurred_on}
          defaultValue={row.occurred_on}
        />
      </td>
      <td>
        <input
          className="cell-field"
          type="text"
          data-row-id={row.id}
          data-field="title"
          data-row={rowIndex}
          data-col={1}
          data-original={row.title}
          defaultValue={row.title}
        />
      </td>
      <td>
        <select
          className="cell-field"
          data-row-id={row.id}
          data-field="type"
          data-row={rowIndex}
          data-col={2}
          data-original={row.type}
          defaultValue={row.type}
        >
          <option value="expense">ხარჯი</option>
          <option value="income">შემოსავალი</option>
        </select>
      </td>
      <td>
        <input
          className="cell-field num"
          type="text"
          inputMode="decimal"
          data-row-id={row.id}
          data-field="amount"
          data-row={rowIndex}
          data-col={3}
          data-original={String(Number(row.amount))}
          defaultValue={String(Number(row.amount))}
        />
      </td>
      <td>
        <select
          className="cell-field"
          data-row-id={row.id}
          data-field="category_id"
          data-row={rowIndex}
          data-col={4}
          data-original={row.category_id != null ? String(row.category_id) : ''}
          defaultValue={row.category_id != null ? String(row.category_id) : ''}
        >
          <option value="">—</option>
          {categoryList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          className="cell-field"
          data-row-id={row.id}
          data-field="account_id"
          data-row={rowIndex}
          data-col={5}
          data-original={row.account_id != null ? String(row.account_id) : ''}
          defaultValue={row.account_id != null ? String(row.account_id) : ''}
        >
          <option value="">—</option>
          {accountList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <div className="cell status-cell">
          <StatusBadge status={row.status as TransactionStatus} onClick={onStatus} />
        </div>
      </td>
      <td>
        <input
          className="cell-field num"
          type="text"
          inputMode="decimal"
          data-row-id={row.id}
          data-field="amount_paid"
          data-row={rowIndex}
          data-col={7}
          data-original={String(Number(row.amount_paid))}
          defaultValue={String(Number(row.amount_paid))}
        />
      </td>
      {columns.map((col, i) => {
        const raw = row.custom_fields?.[col.slug]
        const text = raw == null ? '' : String(raw)
        return (
          <td key={col.id}>
            <input
              className="cell-field"
              type="text"
              inputMode={col.type === 'number' ? 'decimal' : undefined}
              data-row-id={row.id}
              data-field={`custom:${col.slug}`}
              data-row={rowIndex}
              data-col={customStart + i}
              data-original={text}
              defaultValue={text}
            />
          </td>
        )
      })}
      <td>
        <input
          className="cell-field"
          type="text"
          placeholder="—"
          data-row-id={row.id}
          data-field="notes"
          data-row={rowIndex}
          data-col={customStart + columns.length}
          data-original={row.notes ?? ''}
          defaultValue={row.notes ?? ''}
        />
      </td>
      <td>
        <button type="button" className="btn-icon" title="წაშლა" onClick={onDelete}>
          ×
        </button>
      </td>
    </tr>
  )
}

const MemoTransactionRow = memo(TransactionRow)
