import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'

type NavDir = 'down' | 'right' | 'left' | 'up'

/**
 * Fully uncontrolled input — React never rewrites the DOM value while typing.
 * Server value is pushed in only when the field is not focused.
 */
export function CellInput({
  value,
  onSave,
  type = 'text',
  align = 'left',
  placeholder = '',
  'data-row': dataRow,
  'data-col': dataCol,
}: {
  value: string
  onSave: (next: string) => void
  type?: 'text' | 'number' | 'date'
  align?: 'left' | 'right'
  placeholder?: string
  'data-row': number
  'data-col': number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const focusedRef = useRef(false)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    const el = inputRef.current
    if (!el || focusedRef.current) return
    if (el.value !== value) {
      el.value = value
    }
  }, [value])

  function commit(raw: string) {
    if (raw !== valueRef.current) {
      onSave(raw)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (inputRef.current) inputRef.current.value = valueRef.current
      focusedRef.current = false
      inputRef.current?.blur()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(e.currentTarget.value)
      focusedRef.current = false
      moveFocus(dataRow, dataCol, 'down')
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      commit(e.currentTarget.value)
      focusedRef.current = false
      moveFocus(dataRow, dataCol, e.shiftKey ? 'left' : 'right')
    }
  }

  return (
    <input
      ref={inputRef}
      className={`cell-field ${align === 'right' ? 'num' : ''}`}
      data-row={dataRow}
      data-col={dataCol}
      type={type === 'number' ? 'text' : type}
      inputMode={type === 'number' ? 'decimal' : undefined}
      defaultValue={value}
      placeholder={placeholder}
      onFocus={() => {
        focusedRef.current = true
      }}
      onBlur={(e) => {
        focusedRef.current = false
        commit(e.currentTarget.value)
      }}
      onKeyDown={onKeyDown}
      style={{ textAlign: align } as CSSProperties}
    />
  )
}

export function CellSelect({
  value,
  options,
  onSave,
  'data-row': dataRow,
  'data-col': dataCol,
}: {
  value: string
  options: Array<{ id: string | number; name: string }>
  onSave: (next: string) => void
  'data-row': number
  'data-col': number
}) {
  return (
    <select
      className="cell-field"
      data-row={dataRow}
      data-col={dataCol}
      value={value}
      onChange={(e) => onSave(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          moveFocus(dataRow, dataCol, 'down')
        }
        if (e.key === 'Tab') {
          e.preventDefault()
          moveFocus(dataRow, dataCol, e.shiftKey ? 'left' : 'right')
        }
      }}
    >
      <option value="">—</option>
      {options.map((opt) => (
        <option key={String(opt.id)} value={String(opt.id)}>
          {opt.name}
        </option>
      ))}
    </select>
  )
}

function moveFocus(row: number, col: number, dir: NavDir) {
  const next =
    dir === 'down'
      ? { row: row + 1, col }
      : dir === 'up'
        ? { row: row - 1, col }
        : dir === 'right'
          ? { row, col: col + 1 }
          : { row, col: col - 1 }

  const el = document.querySelector<HTMLElement>(
    `[data-row="${next.row}"][data-col="${next.col}"]`,
  )
  el?.focus()
}
