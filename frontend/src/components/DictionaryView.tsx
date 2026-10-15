import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, Eye, EyeOff, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useMe } from '@/hooks/useAuth'
import {
  defaultWordSort,
  useCreateWord,
  useDeleteWord,
  useDeleteWordCategory,
  useUpdateWord,
  useWordCategories,
  useWords,
  useCreateWordCategory,
  type WordFilters,
  type WordInput,
  type WordSort,
} from '@/hooks/useWords'
import { ApiError } from '@/lib/api'
import type { DictionaryWord } from '@/lib/types'

const emptyForm: WordInput = {
  english_word: '',
  georgian_translation: '',
  example_sentence_en: '',
  example_sentence_ka: '',
  category_ids: [],
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string; errors?: Record<string, string[]> }
    return (
      body.message ??
      Object.values(body.errors ?? {})[0]?.[0] ??
      'შეცდომა'
    )
  }
  return 'ქსელის შეცდომა'
}

const emptyFilters: WordFilters = {
  english: '',
  georgian: '',
  example_en: '',
  example_ka: '',
  category_id: '',
}

type StudyColumn = 'english' | 'georgian' | 'example_en' | 'example_ka' | 'category'

const STUDY_COLUMNS: StudyColumn[] = [
  'english',
  'georgian',
  'example_en',
  'example_ka',
  'category',
]

const hiddenKey = 'minder-dict-hidden-columns'

function readHiddenColumns(): Record<StudyColumn, boolean> {
  const blank: Record<StudyColumn, boolean> = {
    english: false,
    georgian: false,
    example_en: false,
    example_ka: false,
    category: false,
  }
  try {
    const raw = sessionStorage.getItem(hiddenKey)
    if (!raw) return blank
    const parsed = JSON.parse(raw) as Partial<Record<StudyColumn, boolean>>
    for (const key of STUDY_COLUMNS) {
      blank[key] = parsed[key] === true
    }
  } catch {
    return blank
  }
  return blank
}

export function DictionaryView() {
  const me = useMe()
  const [draft, setDraft] = useState<WordFilters>(emptyFilters)
  const [filters, setFilters] = useState<WordFilters>(emptyFilters)
  const [hiddenCols, setHiddenCols] = useState(readHiddenColumns)
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const [sort, setSort] = useState<WordSort>(defaultWordSort)
  const [formOpen, setFormOpen] = useState(false)
  const [catsOpen, setCatsOpen] = useState(false)
  const [editing, setEditing] = useState<DictionaryWord | null>(null)
  const [form, setForm] = useState<WordInput>(emptyForm)
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  const words = useWords(filters, sort)
  const categories = useWordCategories()
  const createCategory = useCreateWordCategory()
  const deleteCategory = useDeleteWordCategory()
  const createWord = useCreateWord()
  const updateWord = useUpdateWord()
  const deleteWord = useDeleteWord()

  useEffect(() => {
    const timer = window.setTimeout(() => setFilters(draft), 300)
    return () => window.clearTimeout(timer)
  }, [draft])

  const limits = me.data?.limits
  const atLimit = limits?.max_words != null && (limits.words_used ?? 0) >= limits.max_words
  const list = words.data ?? []
  const busy = createWord.isPending || updateWord.isPending
  const filtering =
    Object.entries(filters).some(([key, value]) => key !== 'category_id' && value.trim() !== '') ||
    filters.category_id.trim() !== ''

  function toggleColumn(column: StudyColumn) {
    setHiddenCols((prev) => {
      const next = { ...prev, [column]: !prev[column] }
      sessionStorage.setItem(hiddenKey, JSON.stringify(next))
      return next
    })
    setRevealed((prev) => {
      const next = new Set<string>()
      for (const key of prev) {
        if (!key.endsWith(`:${column}`)) next.add(key)
      }
      return next
    })
  }

  function revealCell(wordId: number, column: StudyColumn) {
    setRevealed((prev) => new Set(prev).add(`${wordId}:${column}`))
  }

  function sortAlphabet(column: 'english' | 'georgian') {
    setSort((current) =>
      current.field === column
        ? { field: column, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { field: column, dir: 'asc' },
    )
  }

  function sortByDate() {
    setSort((current) =>
      current.field === 'created_at'
        ? { field: 'created_at', dir: current.dir === 'desc' ? 'asc' : 'desc' }
        : { field: 'created_at', dir: 'desc' },
    )
  }

  function cellText(word: DictionaryWord, column: StudyColumn): string {
    if (column === 'english') return word.english_word
    if (column === 'georgian') return word.georgian_translation
    if (column === 'example_en') return word.example_sentence_en ?? ''
    if (column === 'example_ka') return word.example_sentence_ka ?? ''
    return (word.categories ?? []).map((category) => category.name).join(', ')
  }

  useEffect(() => {
    if (!formOpen && !catsOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (formOpen && !busy) closeForm()
      else if (catsOpen) setCatsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [formOpen, catsOpen, busy])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setFormOpen(true)
  }

  function openEdit(word: DictionaryWord) {
    setEditing(word)
    setForm({
      english_word: word.english_word,
      georgian_translation: word.georgian_translation,
      example_sentence_en: word.example_sentence_en ?? '',
      example_sentence_ka: word.example_sentence_ka ?? '',
      category_ids: (word.categories ?? []).map((category) => category.id),
    })
    setError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setNewCategory('')
    setError(null)
  }

  function toggleFormCategory(id: number) {
    setForm((current) => {
      const has = current.category_ids.includes(id)
      return {
        ...current,
        category_ids: has
          ? current.category_ids.filter((item) => item !== id)
          : [...current.category_ids, id],
      }
    })
  }

  async function addCategory() {
    const name = newCategory.trim()
    if (!name) return
    setError(null)
    try {
      const created = await createCategory.mutateAsync(name)
      setNewCategory('')
      setForm((current) =>
        current.category_ids.includes(created.id)
          ? current
          : { ...current, category_ids: [...current.category_ids, created.id] },
      )
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const payload: WordInput = {
      english_word: form.english_word.trim(),
      georgian_translation: form.georgian_translation.trim(),
      example_sentence_en: form.example_sentence_en?.trim() || null,
      example_sentence_ka: form.example_sentence_ka?.trim() || null,
      category_ids: form.category_ids,
    }
    try {
      if (editing) {
        await updateWord.mutateAsync({ id: editing.id, ...payload })
      } else {
        await createWord.mutateAsync(payload)
      }
      closeForm()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove(word: DictionaryWord) {
    if (!confirm(`წავშალოთ „${word.english_word}“?`)) return
    setError(null)
    try {
      await deleteWord.mutateAsync(word.id)
      if (editing?.id === word.id) closeForm()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="dict-page">
      <header className="dict-head">
        <div>
          <h1>ლექსიკონი</h1>
          <p className="muted">ინგლისური და ქართული — სიტყვა, თარგმანი ან მაგალითი</p>
        </div>
        <div className="dict-head-actions">
          <button type="button" className="dict-cats-btn" onClick={() => setCatsOpen(true)}>
            კატეგორიები
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={atLimit}
            title={atLimit ? `ლიმიტი: ${limits?.max_words} სიტყვა` : undefined}
            onClick={openCreate}
          >
            <Plus size={15} />
            სიტყვა
          </button>
        </div>
      </header>

      {error && !formOpen && !catsOpen && <p className="error">{error}</p>}
      {words.isError && <p className="error">სიტყვები ვერ ჩაიტვირთა</p>}

      {catsOpen &&
        createPortal(
          <div
            className="dict-modal-backdrop"
            role="presentation"
            onClick={() => setCatsOpen(false)}
          >
            <div
              className="dict-form"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dict-cats-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dict-form-head">
                <h2 id="dict-cats-title">კატეგორიები</h2>
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="დახურვა"
                  onClick={() => setCatsOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="dict-cat-add">
                <input
                  value={newCategory}
                  placeholder="ახალი კატეგორია, მაგ. მარკეტინგი"
                  maxLength={80}
                  autoFocus
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void addCategory()
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  disabled={createCategory.isPending || newCategory.trim() === ''}
                  onClick={() => void addCategory()}
                >
                  დამატება
                </button>
              </div>
              {error && <p className="error">{error}</p>}
              <ul className="dict-cat-catalog">
                {(categories.data ?? []).length === 0 && (
                  <li className="muted">კატეგორია ჯერ არ გაქვს</li>
                )}
                {(categories.data ?? []).map((category) => (
                  <li key={category.id}>
                    <span>{category.name}</span>
                    <button
                      type="button"
                      className="btn-icon"
                      title="წაშლა"
                      onClick={() => {
                        if (confirm(`წავშალოთ კატეგორია „${category.name}“?`)) {
                          void deleteCategory.mutateAsync(category.id)
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}

      {formOpen &&
        createPortal(
          <div
            className="dict-modal-backdrop"
            role="presentation"
            onClick={() => {
              if (!busy) closeForm()
            }}
          >
            <form
              className="dict-form"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dict-form-title"
              onClick={(e) => e.stopPropagation()}
              onSubmit={onSubmit}
            >
              <div className="dict-form-head">
                <h2 id="dict-form-title">{editing ? 'რედაქტირება' : 'ახალი სიტყვა'}</h2>
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="დახურვა"
                  onClick={closeForm}
                  disabled={busy}
                >
                  <X size={16} />
                </button>
              </div>
              <label>
                ინგლისური სიტყვა / ფრაზა
                <input
                  value={form.english_word}
                  required
                  maxLength={180}
                  autoFocus
                  onChange={(e) => setForm((f) => ({ ...f, english_word: e.target.value }))}
                />
              </label>
              <label>
                ქართული განმარტება
                <textarea
                  value={form.georgian_translation}
                  required
                  rows={3}
                  onChange={(e) => setForm((f) => ({ ...f, georgian_translation: e.target.value }))}
                />
              </label>
              <label>
                მაგალითი (ინგლისური)
                <textarea
                  value={form.example_sentence_en ?? ''}
                  rows={2}
                  onChange={(e) => setForm((f) => ({ ...f, example_sentence_en: e.target.value }))}
                />
              </label>
              <label>
                მაგალითის თარგმანი
                <textarea
                  value={form.example_sentence_ka ?? ''}
                  rows={2}
                  onChange={(e) => setForm((f) => ({ ...f, example_sentence_ka: e.target.value }))}
                />
              </label>
              <div className="dict-cats">
                <span>კატეგორიები</span>
                {(categories.data ?? []).length === 0 ? (
                  <p className="muted dict-cat-empty">
                    ჯერ კატეგორია არ არის. დაამატე ღილაკით „კატეგორიები“.
                  </p>
                ) : (
                  <div className="dict-cat-list">
                    {(categories.data ?? []).map((category) => {
                      const on = form.category_ids.includes(category.id)
                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={`dict-pick ${on ? 'is-on' : ''}`}
                          aria-pressed={on}
                          onClick={() => toggleFormCategory(category.id)}
                        >
                          {on && <Check size={14} />}
                          {category.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              {error && <p className="error">{error}</p>}
              <div className="dict-form-actions">
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? 'ინახება…' : 'შენახვა'}
                </button>
                <button type="button" className="btn-ghost" onClick={closeForm} disabled={busy}>
                  გაუქმება
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      <div className="dict-table-wrap">
        <table className="dict-table">
          <thead>
            <tr>
              {(
                [
                  ['english', 'ინგლისური', draft.english],
                  ['georgian', 'ქართული', draft.georgian],
                  ['example_en', 'მაგალითი ინგლისური', draft.example_en],
                  ['example_ka', 'მაგალითი ქართული', draft.example_ka],
                ] as const
              ).map(([column, label, value]) => (
                <th key={column}>
                  <div className="dict-col-head">
                    <span>{label}</span>
                    <div className="dict-col-tools">
                      {(column === 'english' || column === 'georgian') && (
                        <>
                          <button
                            type="button"
                            className={`dict-sort-btn ${sort.field === column ? 'is-on' : ''}`}
                            title={
                              sort.field === column && sort.dir === 'desc'
                                ? 'ანბანი, უკუღმა'
                                : 'ანბანით'
                            }
                            onClick={() => sortAlphabet(column)}
                          >
                            {sort.field === column && sort.dir === 'desc'
                              ? column === 'english'
                                ? 'Z→A'
                                : 'ჰ→ა'
                              : column === 'english'
                                ? 'A→Z'
                                : 'ა→ჰ'}
                          </button>
                          <button
                            type="button"
                            className={`dict-sort-btn ${sort.field === 'created_at' ? 'is-on' : ''}`}
                            title={
                              sort.field === 'created_at' && sort.dir === 'asc'
                                ? 'ჯერ ძველი'
                                : 'თარიღით, ჯერ ახალი'
                            }
                            onClick={sortByDate}
                          >
                            {sort.field === 'created_at' && sort.dir === 'asc' ? 'ძველი' : 'ახალი'}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className={`btn-icon dict-hide-btn ${hiddenCols[column] ? 'is-on' : ''}`}
                        title={hiddenCols[column] ? 'სვეტის ჩვენება' : 'სვეტის დამალვა'}
                        aria-pressed={hiddenCols[column]}
                        onClick={() => toggleColumn(column)}
                      >
                        {hiddenCols[column] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <input
                    value={value}
                    placeholder="ძებნა"
                    onChange={(e) =>
                      setDraft((current) => ({ ...current, [column]: e.target.value }))
                    }
                  />
                </th>
              ))}
              <th>
                <div className="dict-col-head">
                  <span>კატეგორია</span>
                  <button
                    type="button"
                    className={`btn-icon dict-hide-btn ${hiddenCols.category ? 'is-on' : ''}`}
                    title={hiddenCols.category ? 'სვეტის ჩვენება' : 'სვეტის დამალვა'}
                    aria-pressed={hiddenCols.category}
                    onClick={() => toggleColumn('category')}
                  >
                    {hiddenCols.category ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <select
                  className="dict-cat-filter"
                  value={draft.category_id}
                  onChange={(e) =>
                    setDraft((current) => ({ ...current, category_id: e.target.value }))
                  }
                >
                  <option value="">ყველა</option>
                  {(categories.data ?? []).map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {words.isLoading && (
              <tr>
                <td colSpan={6} className="muted">
                  იტვირთება…
                </td>
              </tr>
            )}
            {!words.isLoading && words.isError && (
              <tr>
                <td colSpan={6} className="muted">
                  სიტყვები ვერ ჩაიტვირთა
                </td>
              </tr>
            )}
            {!words.isLoading && !words.isError && list.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  {filtering ? 'ვერაფერი მოიძებნა.' : 'ჯერ სიტყვა არ გაქვს.'}
                </td>
              </tr>
            )}
            {list.map((word) => (
              <tr key={word.id}>
                {STUDY_COLUMNS.map((column) => {
                  const text = cellText(word, column)
                  const masked =
                    hiddenCols[column] &&
                    text.trim() !== '' &&
                    !revealed.has(`${word.id}:${column}`)
                  const className =
                    column === 'english'
                      ? 'dict-en'
                      : column === 'example_en' || column === 'example_ka'
                        ? 'dict-example'
                        : undefined
                  return (
                    <td key={column} className={className}>
                      {masked ? (
                        <button
                          type="button"
                          className="dict-mask"
                          onClick={() => revealCell(word.id, column)}
                        >
                          ჩვენება
                        </button>
                      ) : column === 'category' ? (
                        <div className="dict-badges">
                          {(word.categories ?? []).map((category) => (
                            <span key={category.id} className="dict-badge">
                              {category.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        text
                      )}
                    </td>
                  )
                })}
                <td className="dict-actions">
                  <button type="button" className="btn-icon" title="რედაქტირება" onClick={() => openEdit(word)}>
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    title="წაშლა"
                    disabled={deleteWord.isPending}
                    onClick={() => void remove(word)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {list.length >= 80 && (
        <p className="muted dict-cap">ნაჩვენებია პირველი 80. დააზუსტე ძებნა.</p>
      )}
    </div>
  )
}
