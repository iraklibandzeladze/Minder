import type { ScheduleBlock, ScheduleTemplate } from '@/lib/types'

export const WEEKDAY_LABELS = [
  'ორშ',
  'სამ',
  'ოთხ',
  'ხუთ',
  'პარ',
  'შაბ',
  'კვი',
] as const

/** Visible grid: 05:00 inclusive … 24:00 exclusive → 19 hours */
export const GRID_START_MIN = 5 * 60
export const GRID_END_MIN = 24 * 60
export const PX_PER_HOUR = 48

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutesToTime(total: number): string {
  const clamped = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function isOvernight(start: string, end: string): boolean {
  return timeToMinutes(end) <= timeToMinutes(start)
}

/** Full duration of a block in minutes (handles overnight). */
export function blockDurationMinutes(start: string, end: string): number {
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  if (e <= s) {
    return 24 * 60 - s + e
  }
  return e - s
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}წთ`
  if (m === 0) return `${h}სთ`
  return `${h}სთ ${m}წთ`
}

export type ScheduleStatRow = {
  templateId: number
  name: string
  color: string
  minutes: number
  percent: number
}

export function computeScheduleStats(
  blocks: ScheduleBlock[],
  templates: ScheduleTemplate[],
): ScheduleStatRow[] {
  const byId = new Map(templates.map((t) => [t.id, t]))
  const minutes = new Map<number, number>()

  for (const block of blocks) {
    const tid = block.schedule_template_id
    if (tid == null) continue
    const add = blockDurationMinutes(block.start_time, block.end_time)
    minutes.set(tid, (minutes.get(tid) ?? 0) + add)
  }

  const total = [...minutes.values()].reduce((a, b) => a + b, 0)
  const rows: ScheduleStatRow[] = []

  for (const [templateId, mins] of minutes) {
    const tpl = byId.get(templateId)
    rows.push({
      templateId,
      name: tpl?.name ?? 'უცნობი',
      color: tpl?.color ?? '#888888',
      minutes: mins,
      percent: total > 0 ? (mins / total) * 100 : 0,
    })
  }

  rows.sort((a, b) => b.minutes - a.minutes)
  return rows
}

export type ScheduleSegment = {
  blockId: number
  weekday: number
  startMin: number
  endMin: number
  title: string
  templateId: number | null
  color: string
  overnightPart: 'full' | 'evening' | 'morning'
}

/** Split overnight blocks into evening (start→24:00) and morning (05:00→end) segments for the grid. */
export function blockToSegments(
  block: ScheduleBlock,
  color: string,
): ScheduleSegment[] {
  const start = timeToMinutes(block.start_time)
  const end = timeToMinutes(block.end_time)
  const templateId = block.schedule_template_id

  if (!isOvernight(block.start_time, block.end_time)) {
    const clippedStart = Math.max(start, GRID_START_MIN)
    const clippedEnd = Math.min(end, GRID_END_MIN)
    if (clippedEnd <= clippedStart) return []
    return [
      {
        blockId: block.id,
        weekday: block.weekday,
        startMin: clippedStart,
        endMin: clippedEnd,
        title: block.title,
        templateId,
        color,
        overnightPart: 'full',
      },
    ]
  }

  const segments: ScheduleSegment[] = []

  if (start < GRID_END_MIN) {
    const clippedStart = Math.max(start, GRID_START_MIN)
    if (GRID_END_MIN > clippedStart) {
      segments.push({
        blockId: block.id,
        weekday: block.weekday,
        startMin: clippedStart,
        endMin: GRID_END_MIN,
        title: block.title,
        templateId,
        color,
        overnightPart: 'evening',
      })
    }
  }

  const nextWeekday = block.weekday === 7 ? 1 : block.weekday + 1
  if (end > GRID_START_MIN) {
    const clippedEnd = Math.min(end, GRID_END_MIN)
    if (clippedEnd > GRID_START_MIN) {
      segments.push({
        blockId: block.id,
        weekday: nextWeekday,
        startMin: GRID_START_MIN,
        endMin: clippedEnd,
        title: block.title,
        templateId,
        color,
        overnightPart: 'morning',
      })
    }
  }

  return segments
}

export function snapMinutes(min: number, step = 15): number {
  return Math.round(min / step) * step
}

export function colorWithAlpha(hex: string, alpha: number): string {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return hex
  const r = Number.parseInt(raw.slice(0, 2), 16)
  const g = Number.parseInt(raw.slice(2, 4), 16)
  const b = Number.parseInt(raw.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
