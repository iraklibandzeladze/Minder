import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { ApiError } from '@/lib/api'
import {
  useCreateScheduleBlocks,
  useCreateScheduleTemplate,
  useDeleteScheduleBlock,
  useDeleteScheduleTemplate,
  useScheduleBlocks,
  useScheduleTemplates,
  useUpdateScheduleBlock,
  useUpdateScheduleTemplate,
} from '@/hooks/useSchedule'
import {
  GRID_END_MIN,
  GRID_START_MIN,
  PX_PER_HOUR,
  WEEKDAY_LABELS,
  blockToSegments,
  colorWithAlpha,
  computeScheduleStats,
  formatDuration,
  minutesToTime,
  snapMinutes,
} from '@/lib/schedule'
import type { ScheduleTemplate } from '@/lib/types'

type Draft = {
  id?: number
  weekday: number
  start_time: string
  end_time: string
  title: string
  schedule_template_id: number
  notes: string
  applyDays: number[]
}

type TemplateDraft = {
  id?: number
  name: string
  color: string
}

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const
const WORKDAYS = [1, 2, 3, 4, 5] as const

type ViewMode = 'week' | 'day'
const VIEW_MODE_KEY = 'minder-schedule-view'
const MOBILE_QUERY = '(max-width: 1100px)'

const HOURS = Array.from(
  { length: (GRID_END_MIN - GRID_START_MIN) / 60 },
  (_, i) => GRID_START_MIN / 60 + i,
)

/** ISO weekday for today: 1 = Monday … 7 = Sunday. */
function todayWeekday(): number {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

function readStoredViewMode(): ViewMode | null {
  const v = localStorage.getItem(VIEW_MODE_KEY)
  return v === 'week' || v === 'day' ? v : null
}

function emptyDraft(weekday: number, startMin: number, templateId: number): Draft {
  return {
    weekday,
    start_time: minutesToTime(startMin),
    end_time: minutesToTime(Math.min(startMin + 60, GRID_END_MIN - 1)),
    title: '',
    schedule_template_id: templateId,
    notes: '',
    applyDays: [],
  }
}

export function WeekScheduleView() {
  const blocksQuery = useScheduleBlocks()
  const templatesQuery = useScheduleTemplates()
  const createBlocks = useCreateScheduleBlocks()
  const updateBlock = useUpdateScheduleBlock()
  const deleteBlock = useDeleteScheduleBlock()
  const createTemplate = useCreateScheduleTemplate()
  const updateTemplate = useUpdateScheduleTemplate()
  const deleteTemplate = useDeleteScheduleTemplate()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const statsWrapRef = useRef<HTMLDivElement>(null)

  // Mobile defaults to a single day (the whole week in one viewport is unreadable);
  // desktop defaults to the week grid. An explicit choice is remembered.
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [storedMode, setStoredMode] = useState<ViewMode | null>(() => readStoredViewMode())
  // Phone/tablet (incl. landscape): always a single day. The 7-column week grid is unreadable under ~1100px.
  const viewMode: ViewMode = isMobile ? 'day' : (storedMode ?? 'week')
  const [activeDay, setActiveDay] = useState<number>(() => todayWeekday())

  function setViewMode(mode: ViewMode) {
    setStoredMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
  }

  function shiftDay(delta: number) {
    setActiveDay((d) => ((d - 1 + delta + 7) % 7) + 1)
  }

  useEffect(() => {
    if (!statsOpen) return
    function onDocClick(e: MouseEvent) {
      if (!statsWrapRef.current?.contains(e.target as Node)) {
        setStatsOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setStatsOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [statsOpen])

  const blocks = blocksQuery.data ?? []
  const templates = templatesQuery.data ?? []
  const templateById = useMemo(() => {
    const map = new Map<number, ScheduleTemplate>()
    for (const t of templates) map.set(t.id, t)
    return map
  }, [templates])

  const byId = useMemo(() => {
    const map = new Map(blocks.map((b) => [b.id, b]))
    return map
  }, [blocks])

  const segments = useMemo(
    () =>
      blocks.flatMap((b) => {
        const color =
          b.template?.color ??
          (b.schedule_template_id != null
            ? templateById.get(b.schedule_template_id)?.color
            : undefined) ??
          '#6b7380'
        return blockToSegments(b, color)
      }),
    [blocks, templateById],
  )

  const stats = useMemo(
    () => computeScheduleStats(blocks, templates),
    [blocks, templates],
  )
  const statsTotal = stats.reduce((a, r) => a + r.minutes, 0)

  const gridHeight = ((GRID_END_MIN - GRID_START_MIN) / 60) * PX_PER_HOUR
  const saving = createBlocks.isPending || updateBlock.isPending
  const defaultTemplateId = templates[0]?.id ?? 0
  const visibleDays: readonly number[] = viewMode === 'day' ? [activeDay] : ALL_WEEKDAYS
  const newBlockDay = viewMode === 'day' ? activeDay : 1

  function openCreate(weekday: number, clientY: number, columnTop: number) {
    if (!defaultTemplateId) return
    const offsetY = clientY - columnTop
    const rawMin = GRID_START_MIN + (offsetY / PX_PER_HOUR) * 60
    const startMin = Math.max(
      GRID_START_MIN,
      Math.min(GRID_END_MIN - 30, snapMinutes(rawMin)),
    )
    setDraft(emptyDraft(weekday, startMin, defaultTemplateId))
  }

  function openEdit(blockId: number) {
    const block = byId.get(blockId)
    if (!block || block.schedule_template_id == null) return
    setDraft({
      id: block.id,
      weekday: block.weekday,
      start_time: block.start_time.slice(0, 5),
      end_time: block.end_time.slice(0, 5),
      title: block.title,
      schedule_template_id: block.schedule_template_id,
      notes: block.notes ?? '',
      applyDays: [],
    })
  }

  function toggleApplyDay(day: number) {
    if (!draft || day === draft.weekday) return
    setDraft({
      ...draft,
      applyDays: draft.applyDays.includes(day)
        ? draft.applyDays.filter((d) => d !== day)
        : [...draft.applyDays, day].sort((a, b) => a - b),
    })
  }

  function setApplyPreset(days: readonly number[]) {
    if (!draft) return
    setDraft({
      ...draft,
      applyDays: days.filter((d) => d !== draft.weekday),
    })
  }

  async function saveDraft() {
    if (!draft || !draft.title.trim()) return
    const base = {
      start_time: draft.start_time,
      end_time: draft.end_time,
      title: draft.title.trim(),
      schedule_template_id: draft.schedule_template_id,
      notes: draft.notes.trim() || null,
    }
    const extraDays = draft.applyDays.filter((d) => d !== draft.weekday)

    if (draft.id != null) {
      await updateBlock.mutateAsync({
        id: draft.id,
        weekday: draft.weekday,
        ...base,
      })
      if (extraDays.length > 0) {
        await createBlocks.mutateAsync(
          extraDays.map((weekday) => ({ weekday, ...base })),
        )
      }
    } else {
      await createBlocks.mutateAsync([
        { weekday: draft.weekday, ...base },
        ...extraDays.map((weekday) => ({ weekday, ...base })),
      ])
    }
    setDraft(null)
  }

  async function removeDraft() {
    if (draft?.id == null) {
      setDraft(null)
      return
    }
    if (!confirm('წავშალოთ ეს ბლოკი?')) return
    await deleteBlock.mutateAsync(draft.id)
    setDraft(null)
  }

  async function saveTemplate() {
    if (!templateDraft || !templateDraft.name.trim()) return
    setTemplateError(null)
    try {
      if (templateDraft.id != null) {
        await updateTemplate.mutateAsync({
          id: templateDraft.id,
          name: templateDraft.name.trim(),
          color: templateDraft.color,
        })
      } else {
        await createTemplate.mutateAsync({
          name: templateDraft.name.trim(),
          color: templateDraft.color,
        })
      }
      setTemplateDraft(null)
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : 'შეცდომა')
    }
  }

  async function removeTemplate(id: number) {
    if (!confirm('წავშალოთ ეს შაბლონი?')) return
    setTemplateError(null)
    try {
      await deleteTemplate.mutateAsync(id)
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string } | null
        setTemplateError(body?.message ?? 'შაბლონის წაშლა ვერ მოხერხდა')
        return
      }
      setTemplateError('შაბლონის წაშლა ვერ მოხერხდა')
    }
  }

  return (
    <div className="week-schedule">
      <div className="week-schedule-head">
        <div>
          <div className="week-schedule-title-row">
            <h2>კვირის განრიგი</h2>
            {stats.length > 0 && (
              <div className="week-stats-wrap" ref={statsWrapRef}>
                <button
                  type="button"
                  className={`btn-icon week-stats-trigger ${statsOpen ? 'active' : ''}`}
                  title="რაში იხარჯება დრო"
                  aria-label="რაში იხარჯება დრო"
                  aria-expanded={statsOpen}
                  onClick={() => setStatsOpen((v) => !v)}
                >
                  <Info size={16} />
                </button>
                {statsOpen && (
                  <div className="week-stats-popover" role="dialog" aria-label="დროის სტატისტიკა">
                    <div className="week-stats-head">
                      <strong>რაში იხარჯება დრო</strong>
                      <span className="muted">{formatDuration(statsTotal)} / კვირა</span>
                    </div>
                    <div className="week-stats-bar" aria-hidden>
                      {stats.map((row) => (
                        <div
                          key={row.templateId}
                          className="week-stats-bar-seg"
                          style={{
                            width: `${Math.max(row.percent, 0.5)}%`,
                            background: row.color,
                          }}
                          title={`${row.name}: ${formatDuration(row.minutes)}`}
                        />
                      ))}
                    </div>
                    <ul className="week-stats-list">
                      {stats.map((row) => (
                        <li key={row.templateId}>
                          <span
                            className="week-stats-dot"
                            style={{ background: row.color }}
                          />
                          <span className="week-stats-name">{row.name}</span>
                          <span className="week-stats-time">
                            {formatDuration(row.minutes)}
                          </span>
                          <span className="muted week-stats-pct">
                            {row.percent.toFixed(0)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="muted">მუდმივი შაბლონი — იგივე ყოველ კვირას</p>
        </div>
        <div className="week-schedule-actions">
          <div className="week-view-toggle desktop-only" role="group" aria-label="ხედი">
            <button
              type="button"
              className={`btn-icon ${viewMode === 'day' ? 'active' : ''}`}
              title="დღის ხედი"
              aria-pressed={viewMode === 'day'}
              onClick={() => setViewMode('day')}
            >
              <CalendarDays size={16} />
            </button>
            <button
              type="button"
              className={`btn-icon ${viewMode === 'week' ? 'active' : ''}`}
              title="კვირის ხედი"
              aria-pressed={viewMode === 'week'}
              onClick={() => setViewMode('week')}
            >
              <CalendarRange size={16} />
            </button>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setTemplatesOpen(true)
              setTemplateError(null)
              setTemplateDraft(null)
            }}
          >
            შაბლონები
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!defaultTemplateId}
            onClick={() => setDraft(emptyDraft(newBlockDay, 9 * 60, defaultTemplateId))}
          >
            + ბლოკი
          </button>
        </div>
      </div>

      {viewMode === 'day' && (
        <div className="week-day-nav">
          <button
            type="button"
            className="btn-icon"
            aria-label="წინა დღე"
            onClick={() => shiftDay(-1)}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="week-day-tabs" role="tablist">
            {WEEKDAY_LABELS.map((label, i) => {
              const day = i + 1
              const isToday = day === todayWeekday()
              return (
                <button
                  key={day}
                  type="button"
                  role="tab"
                  aria-selected={day === activeDay}
                  className={`week-day-tab ${day === activeDay ? 'active' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => setActiveDay(day)}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className="btn-icon"
            aria-label="შემდეგი დღე"
            onClick={() => shiftDay(1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div className="week-legend">
        {templates.map((t) => (
          <span
            key={t.id}
            className="week-legend-item"
            style={{
              background: colorWithAlpha(t.color, 0.35),
              borderColor: colorWithAlpha(t.color, 0.55),
            }}
          >
            {t.name}
          </span>
        ))}
      </div>

      {blocksQuery.isLoading || templatesQuery.isLoading ? (
        <p className="muted">იტვირთება…</p>
      ) : (
        <div className={`week-grid-wrap ${viewMode === 'day' ? 'is-day' : ''}`}>
          <div className="week-grid" style={{ ['--week-days' as string]: visibleDays.length }}>
            <div className="week-time-col">
              <div className="week-day-head" />
              <div className="week-time-rail" style={{ height: gridHeight }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="week-hour-label"
                    style={{ top: (h * 60 - GRID_START_MIN) * (PX_PER_HOUR / 60) }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>

            {visibleDays.map((weekday) => {
              const label = WEEKDAY_LABELS[weekday - 1]
              const daySegments = segments.filter((s) => s.weekday === weekday)
              return (
                <div key={weekday} className="week-day-col">
                  <div className="week-day-head">{label}</div>
                  <div
                    className="week-day-body"
                    style={{ height: gridHeight }}
                    // Week grid keeps double-click; day view (mostly touch) opens on a single tap
                    // of empty space — double-tap would trigger browser zoom on mobile.
                    onDoubleClick={(e) => {
                      if (viewMode === 'day') return
                      const rect = e.currentTarget.getBoundingClientRect()
                      openCreate(weekday, e.clientY, rect.top)
                    }}
                    onClick={(e) => {
                      if (viewMode !== 'day' || e.target !== e.currentTarget) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      openCreate(weekday, e.clientY, rect.top)
                    }}
                  >
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="week-hour-line"
                        style={{
                          top: (h * 60 - GRID_START_MIN) * (PX_PER_HOUR / 60),
                        }}
                      />
                    ))}
                    {daySegments.map((seg) => {
                      const top =
                        (seg.startMin - GRID_START_MIN) * (PX_PER_HOUR / 60)
                      const height = Math.max(
                        18,
                        (seg.endMin - seg.startMin) * (PX_PER_HOUR / 60) - 2,
                      )
                      return (
                        <button
                          key={`${seg.blockId}-${seg.overnightPart}-${seg.weekday}`}
                          type="button"
                          className="week-block"
                          style={{
                            top,
                            height,
                            background: colorWithAlpha(seg.color, 0.4),
                            boxShadow: `inset 0 0 0 1px ${colorWithAlpha(seg.color, 0.65)}`,
                          }}
                          title={`${seg.title}`}
                          onClick={() => openEdit(seg.blockId)}
                        >
                          <span className="week-block-title">{seg.title}</span>
                          <span className="week-block-time">
                            {minutesToTime(seg.startMin)}–
                            {seg.endMin >= GRID_END_MIN
                              ? '24:00'
                              : minutesToTime(seg.endMin)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="muted week-hint">
            {viewMode === 'day'
              ? 'ბლოკის დასამატებლად დააჭირე ცარიელ ადგილს'
              : 'ბლოკის დასამატებლად ორჯერ დააკლიკე დღის სვეტს'}
          </p>
        </div>
      )}

      {draft &&
        createPortal(
        <div className="week-modal-backdrop" onClick={() => setDraft(null)}>
          <div
            className="week-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{draft.id != null ? 'ბლოკის რედაქტირება' : 'ახალი ბლოკი'}</h3>
            <label className="week-field">
              <span>სათაური</span>
              <input
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="მაგ. დილის ლოცვა"
              />
            </label>
            <div className="week-field-row">
              <label className="week-field">
                <span>დღე</span>
                <select
                  value={draft.weekday}
                  onChange={(e) => {
                    const weekday = Number(e.target.value)
                    setDraft({
                      ...draft,
                      weekday,
                      applyDays: draft.applyDays.filter((d) => d !== weekday),
                    })
                  }}
                >
                  {WEEKDAY_LABELS.map((label, i) => (
                    <option key={label} value={i + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="week-field">
                <span>შაბლონი</span>
                <select
                  value={draft.schedule_template_id}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      schedule_template_id: Number(e.target.value),
                    })
                  }
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="week-field-row">
              <label className="week-field">
                <span>დასაწყისი</span>
                <input
                  type="time"
                  value={draft.start_time}
                  onChange={(e) =>
                    setDraft({ ...draft, start_time: e.target.value })
                  }
                />
              </label>
              <label className="week-field">
                <span>დასასრული</span>
                <input
                  type="time"
                  value={draft.end_time}
                  onChange={(e) =>
                    setDraft({ ...draft, end_time: e.target.value })
                  }
                />
              </label>
            </div>
            <p className="muted week-overnight-hint">
              თუ დასასრული დასაწყისზე ადრეა (მაგ. 22:30→06:30), ბლოკი ღამისად ითვლება.
            </p>

            <div className="week-field">
              <span>გავრცელება სხვა დღეებზე</span>
              <p className="muted week-spread-hint">
                მთავარი დღე რჩება; მონიშნულ დღეებზე იგივე ბლოკი დაემატება.
              </p>
              <div className="week-day-chips">
                {ALL_WEEKDAYS.map((day) => {
                  const isPrimary = day === draft.weekday
                  const selected = isPrimary || draft.applyDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`week-day-chip ${selected ? 'active' : ''} ${isPrimary ? 'primary' : ''}`}
                      disabled={isPrimary}
                      onClick={() => toggleApplyDay(day)}
                    >
                      {WEEKDAY_LABELS[day - 1]}
                    </button>
                  )
                })}
              </div>
              <div className="week-spread-presets">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setApplyPreset(WORKDAYS)}
                >
                  სამუშაო დღეები
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setApplyPreset(ALL_WEEKDAYS)}
                >
                  მთელი კვირა
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setApplyPreset([])}
                >
                  გასუფთავება
                </button>
              </div>
            </div>

            <label className="week-field">
              <span>შენიშვნა</span>
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>
            <div className="week-modal-actions">
              {draft.id != null && (
                <button type="button" className="btn-ghost danger" onClick={() => void removeDraft()}>
                  წაშლა
                </button>
              )}
              <div className="week-modal-actions-right">
                <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
                  გაუქმება
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!draft.title.trim() || saving}
                  onClick={() => void saveDraft()}
                >
                  შენახვა
                  {draft.applyDays.length > 0
                    ? ` (+${draft.applyDays.length})`
                    : ''}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
        )}

      {templatesOpen &&
        createPortal(
        <div
          className="week-modal-backdrop"
          onClick={() => setTemplatesOpen(false)}
        >
          <div
            className="week-modal week-templates-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="week-templates-head">
              <h3>შაბლონები</h3>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setTemplateDraft({ name: '', color: '#3d9a7a' })
                  setTemplateError(null)
                }}
              >
                + შაბლონი
              </button>
            </div>
            <p className="muted week-spread-hint">
              შაბლონი განსაზღვრავს ბლოკის ტიპს და ფერს (სტატისტიკაშიც).
            </p>

            {templateError && <p className="error">{templateError}</p>}

            <ul className="week-templates-list">
              {templates.map((t) => (
                <li key={t.id} className="week-templates-item">
                  <span
                    className="week-templates-swatch"
                    style={{ background: t.color }}
                  />
                  <span className="week-templates-name">{t.name}</span>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setTemplateDraft({
                        id: t.id,
                        name: t.name,
                        color: t.color.toLowerCase(),
                      })
                      setTemplateError(null)
                    }}
                  >
                    რედაქტირება
                  </button>
                  <button
                    type="button"
                    className="btn-ghost danger"
                    onClick={() => void removeTemplate(t.id)}
                  >
                    წაშლა
                  </button>
                </li>
              ))}
            </ul>

            {templateDraft && (
              <div className="week-template-form">
                <label className="week-field">
                  <span>სახელი</span>
                  <input
                    autoFocus
                    value={templateDraft.name}
                    onChange={(e) =>
                      setTemplateDraft({ ...templateDraft, name: e.target.value })
                    }
                    placeholder="მაგ. სპორტი"
                  />
                </label>
                <label className="week-field">
                  <span>ფერი</span>
                  <div className="week-color-row">
                    <input
                      type="color"
                      value={templateDraft.color}
                      onChange={(e) =>
                        setTemplateDraft({
                          ...templateDraft,
                          color: e.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      value={templateDraft.color}
                      onChange={(e) =>
                        setTemplateDraft({
                          ...templateDraft,
                          color: e.target.value,
                        })
                      }
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </label>
                <div className="week-modal-actions-right">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setTemplateDraft(null)}
                  >
                    გაუქმება
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={
                      !templateDraft.name.trim() ||
                      createTemplate.isPending ||
                      updateTemplate.isPending
                    }
                    onClick={() => void saveTemplate()}
                  >
                    შენახვა
                  </button>
                </div>
              </div>
            )}

            <div className="week-modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setTemplatesOpen(false)}
              >
                დახურვა
              </button>
            </div>
          </div>
        </div>,
        document.body,
        )}
    </div>
  )
}
