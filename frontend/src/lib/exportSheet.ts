import { evaluateFormula } from '@/lib/formula'
import type { CustomColumn, Sheet, SheetRow } from '@/lib/types'

export type ExportTable = {
  title: string
  subtitle: string | null
  headers: string[]
  rows: string[][]
}

function formulaMap(columns: CustomColumn[]): Record<string, string | null | undefined> {
  const map: Record<string, string | null | undefined> = {}
  for (const col of columns) {
    if (col.type === 'formula') map[col.slug] = col.formula
  }
  return map
}

function cellDisplay(
  row: SheetRow,
  col: CustomColumn,
  formulas: Record<string, string | null | undefined>,
): string {
  if (col.type === 'formula') {
    const result = evaluateFormula(col.formula, row.values ?? {}, formulas)
    if (!result.ok) return ''
    return String(result.value)
  }
  const raw = row.values?.[col.slug]
  return raw == null ? '' : String(raw)
}

export function buildExportTable(
  sheet: Sheet,
  columns: CustomColumn[],
  rows: SheetRow[],
  yearMonth: string | null,
): ExportTable {
  const formulas = formulaMap(columns)
  const headers = ['სათაური', ...columns.map((c) => c.name), 'შენიშვნა']
  const dataRows = rows.map((row) => [
    row.title ?? '',
    ...columns.map((col) => cellDisplay(row, col, formulas)),
    row.notes ?? '',
  ])

  return {
    title: sheet.name,
    subtitle: yearMonth,
    headers,
    rows: dataRows,
  }
}

function safeFilename(name: string): string {
  return name.replace(/[^\w\u10A0-\u10FF\-]+/g, '_').slice(0, 60) || 'sheet'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function exportToExcel(table: ExportTable): Promise<void> {
  const XLSX = await import('xlsx')
  const aoa: (string | number)[][] = [table.headers, ...table.rows]
  if (table.subtitle) {
    aoa.unshift([table.title, table.subtitle])
    aoa.splice(1, 0, [])
  } else {
    aoa.unshift([table.title])
    aoa.splice(1, 0, [])
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${safeFilename(table.title)}.xlsx`)
}

/** Opens a print dialog — user can Save as PDF (keeps Georgian glyphs). */
export async function exportToPdf(table: ExportTable): Promise<void> {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720')
  if (!win) {
    throw new Error('popup-blocked')
  }

  const head = table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const body = table.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('')

  win.document.write(`<!doctype html>
<html lang="ka">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(table.title)}</title>
  <style>
    body { font-family: "IBM Plex Sans", "Segoe UI", sans-serif; color: #151a22; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .sub { color: #6b7380; margin: 0 0 16px; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #d5dae2; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #eef0f3; font-weight: 600; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(table.title)}</h1>
  ${table.subtitle ? `<p class="sub">${escapeHtml(table.subtitle)}</p>` : ''}
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 200);
    };
  <\/script>
</body>
</html>`)
  win.document.close()
}
