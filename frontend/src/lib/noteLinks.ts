export type NoteTextPart =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string }

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi

function trimTrailingPunct(raw: string): { core: string; tail: string } {
  const m = raw.match(/^(.*?)([),.!?;:]+)$/)
  if (!m) return { core: raw, tail: '' }
  return { core: m[1], tail: m[2] }
}

function toHref(raw: string): string | null {
  const href = raw.startsWith('www.') ? `https://${raw}` : raw
  try {
    const url = new URL(href)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}

export function splitNoteLinks(text: string): NoteTextPart[] {
  const parts: NoteTextPart[] = []
  const re = new RegExp(URL_RE)
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const { core, tail } = trimTrailingPunct(match[0])
    const href = toHref(core)
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) })
    }
    if (href) {
      parts.push({ type: 'link', value: core, href })
      if (tail) parts.push({ type: 'text', value: tail })
    } else {
      parts.push({ type: 'text', value: match[0] })
    }
    last = match.index + match[0].length
  }
  if (last < text.length) {
    parts.push({ type: 'text', value: text.slice(last) })
  }
  return parts
}

export function parseNoteAmount(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

export function formatNoteAmount(value: number): string {
  return value.toLocaleString('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
