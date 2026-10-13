import { useEffect, useMemo, useRef, useState } from 'react'
import { Command } from 'cmdk'
import { useQuickEntryCommit, useQuickEntryPreview } from '@/hooks/useLedger'
import type { ParsedQuickEntry } from '@/lib/types'

export function QuickEntry({
  open,
  onOpenChange,
  yearMonth,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  yearMonth: string
}) {
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<ParsedQuickEntry | null>(null)
  const preview = useQuickEntryPreview()
  const commit = useQuickEntryCommit(yearMonth)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open) {
      setInput('')
      setParsed(null)
      return
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (!input.trim()) {
      setParsed(null)
      return
    }
    debounceRef.current = window.setTimeout(() => {
      void preview.mutateAsync(input).then(setParsed).catch(() => undefined)
    }, 180)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
    // preview.mutateAsync identity is stable enough for debounce UX
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, open])

  const chips = useMemo(() => {
    if (!parsed) return []
    const items: { label: string; value: string }[] = []
    if (parsed.amount != null) items.push({ label: 'თანხა', value: String(parsed.amount) })
    if (parsed.currency) items.push({ label: 'ვალუტა', value: parsed.currency })
    if (parsed.category_name) items.push({ label: 'კატეგორია', value: parsed.category_name })
    if (parsed.status) items.push({ label: 'სტატუსი', value: parsed.status })
    if (parsed.account_name) items.push({ label: 'ანგარიში', value: parsed.account_name })
    if (parsed.title) items.push({ label: 'სათაური', value: parsed.title })
    return items
  }, [parsed])

  async function submit() {
    if (!input.trim() || commit.isPending) return
    await commit.mutateAsync(input.trim())
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="cmdk-overlay" onClick={() => onOpenChange(false)}>
      <Command
        className="cmdk-panel"
        shouldFilter={false}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onOpenChange(false)
          if (e.key === 'Enter') {
            e.preventDefault()
            void submit()
          }
        }}
      >
        <Command.Input
          ref={inputRef}
          value={input}
          onValueChange={setInput}
          placeholder="100 GEL ბენზინი pending TBC"
        />
        <div className="cmdk-chips">
          {chips.length === 0 ? (
            <span className="muted">შეიყვანე თავისუფალი ტექსტი — Enter ჩაწერს ამ თვეში</span>
          ) : (
            chips.map((chip) => (
              <span key={chip.label} className="chip">
                <em>{chip.label}</em> {chip.value}
              </span>
            ))
          )}
        </div>
        <Command.List>
          <Command.Item onSelect={() => void submit()} disabled={!input.trim()}>
            ჩაწერა · {yearMonth}
          </Command.Item>
        </Command.List>
      </Command>
    </div>
  )
}
