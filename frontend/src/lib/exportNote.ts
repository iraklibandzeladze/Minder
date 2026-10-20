import type { NoteCheckMode } from '@/lib/types'

export type NoteExportLine = {
  body: string
  checked: boolean
  amount: number | null
}

function mark(mode: NoteCheckMode, checked: boolean): string {
  if (mode === 'radio') return checked ? '●' : '○'
  return checked ? '☑' : '☐'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeFilename(name: string): string {
  return name.replace(/[^\w\u10A0-\u10FF\-]+/g, '_').slice(0, 60) || 'note'
}

export function noteAsPlainText(
  title: string,
  mode: NoteCheckMode,
  lines: NoteExportLine[],
): string {
  const body = lines
    .map((line) => `${mark(mode, line.checked)} ${line.body.trim()}`)
    .join('\n')
  return body ? `${title}\n\n${body}` : title
}

function noteAsHtml(title: string, mode: NoteCheckMode, lines: NoteExportLine[]): string {
  const items = lines
    .map(
      (line) =>
        `<li>${escapeHtml(mark(mode, line.checked))} ${escapeHtml(line.body.trim())}</li>`,
    )
    .join('')
  return `<h1>${escapeHtml(title)}</h1><ul>${items}</ul>`
}

export async function copyNoteForWord(
  title: string,
  mode: NoteCheckMode,
  lines: NoteExportLine[],
): Promise<void> {
  const plain = noteAsPlainText(title, mode, lines)
  const html = noteAsHtml(title, mode, lines)
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([plain], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ])
      return
    } catch {
      /* fall back to plain text */
    }
  }
  await navigator.clipboard.writeText(plain)
}

export async function exportPricedNote(
  title: string,
  lines: NoteExportLine[],
): Promise<void> {
  const XLSX = await import('xlsx')
  const total = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0)
  const checkedTotal = lines.reduce(
    (sum, line) => sum + (line.checked ? (line.amount ?? 0) : 0),
    0,
  )
  const aoa: (string | number)[][] = [
    [title],
    [],
    ['მონიშვნა', 'ტექსტი', 'თანხა'],
    ...lines.map((line) => [
      line.checked ? 'კი' : '',
      line.body.trim(),
      line.amount ?? '',
    ]),
    [],
    ['', 'ჯამი', total],
  ]
  if (checkedTotal !== total) {
    aoa.push(['', 'მონიშნული', checkedTotal])
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 12 }, { wch: 42 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ნოუთი')
  XLSX.writeFile(wb, `${safeFilename(title)}.xlsx`)
}
