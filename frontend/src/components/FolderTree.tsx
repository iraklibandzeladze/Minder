import { ChevronDown, ChevronRight, Folder as FolderIcon, Plus } from 'lucide-react'
import { useIsMutating } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ContextPopup } from '@/components/ContextPopup'
import { FolderDropTarget } from '@/components/FolderDropTarget'
import { FolderDialog } from '@/components/FolderDialog'
import { folderPath, requestCreateItem, useFolders, useOrganizeItem } from '@/hooks/useFolders'
import type { Folder, FolderType } from '@/lib/types'

export function FolderTree<T extends { id: number; folder_id: number | null }>({ type, items, renderItem }: { type: FolderType; items: T[]; renderItem: (item: T) => ReactNode }) {
  const query = useFolders()
  const folders = (query.data ?? []).filter(f => f.type === type)
  const [closed, setClosed] = useState<Set<number>>(() => new Set())
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit' | 'delete'; folder: Folder } | null>(null)
  function branch(parent: number | null): ReactNode {
    return <>
      {folders.filter(f => f.parent_id === parent).map(folder => <div key={folder.id} className="folder-node">
        <FolderDropTarget folder={folder} className="folder-row" onAccepted={() => setClosed(prev => { const next = new Set(prev); next.delete(folder.id); return next })}>
          <button type="button" className="folder-toggle" aria-expanded={!closed.has(folder.id)} onClick={() => setClosed(prev => { const next = new Set(prev); if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id); return next })}>
            {closed.has(folder.id) ? <ChevronRight size={13} /> : <ChevronDown size={13} />}<FolderIcon size={15} /><span>{folder.name}</span>
          </button>
          <button type="button" className="folder-quick-add" aria-label={`${folder.name}: ${type === 'notes' ? 'ნოუთის დამატება' : 'ცხრილის დამატება'}`} title={type === 'notes' ? 'ახალი ნოუთი' : 'ახალი ცხრილი'} onClick={() => {
            setClosed(prev => { const next = new Set(prev); next.delete(folder.id); return next })
            requestCreateItem(type, folder.id)
          }}><Plus size={15} aria-hidden /></button>
          <ContextPopup label={`საქაღალდის მოქმედებები: ${folder.name}`} className="folder-menu">
            {close => <>
              <button type="button" onClick={() => { close(); setDialog({ mode: 'create', folder }) }}>ქვესაქაღალდე</button>
              <button type="button" onClick={() => { close(); setDialog({ mode: 'edit', folder }) }}>გადარქმევა / გადატანა</button>
              <button type="button" onClick={() => { close(); setDialog({ mode: 'delete', folder }) }}>წაშლა</button>
            </>}
          </ContextPopup>
        </FolderDropTarget>
        {!closed.has(folder.id) && <div className="folder-children">{branch(folder.id)}{items.filter(item => item.folder_id === folder.id).map(renderItem)}</div>}
      </div>)}
    </>
  }
  return <>
    {query.isError && <p className="error">საქაღალდეები ვერ ჩაიტვირთა.</p>}
    {branch(null)}
    {items.filter(item => item.folder_id == null || !folders.some(f => f.id === item.folder_id)).map(renderItem)}
    {dialog && <FolderDialog type={type} mode={dialog.mode} folder={dialog.mode === 'create' ? undefined : dialog.folder} parentId={dialog.mode === 'create' ? dialog.folder.id : null} onClose={() => setDialog(null)} />}
  </>
}

function FolderMovePicker({ folders, value, disabled, onSelect }: {
  folders: Folder[]
  value: number | null
  disabled: boolean
  onSelect: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const selected = folders.find(folder => folder.id === value)
  const options = [{ id: null, label: 'მთავარი დონე' }, ...folders.map(folder => ({ id: folder.id, label: folderPath(folders, folder) }))]
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()
  }, [open])
  return <div className="folder-move-picker">
    <button type="button" className="folder-move-trigger" aria-label="საქაღალდეში გადატანა"
      aria-expanded={open} aria-haspopup="listbox" disabled={disabled}
      onClick={() => setOpen(previous => !previous)}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) } }}>
      <FolderIcon size={14} aria-hidden /><span>{selected ? folderPath(folders, selected) : 'მთავარი დონე'}</span><ChevronDown size={14} aria-hidden />
    </button>
    {open && <div ref={list} role="listbox" aria-label="საქაღალდის არჩევა" className="folder-move-options"
      onKeyDown={event => {
        const elements = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
        const current = elements.indexOf(document.activeElement as HTMLElement)
        const next = event.key === 'ArrowDown' ? (current + 1) % elements.length : event.key === 'ArrowUp' ? (current - 1 + elements.length) % elements.length : event.key === 'Home' ? 0 : event.key === 'End' ? elements.length - 1 : null
        if (next !== null) { event.preventDefault(); elements[next]?.focus() }
      }}>
      {options.map(option => <button type="button" role="option" key={option.id ?? 'root'}
        aria-selected={option.id === value} disabled={disabled}
        onClick={() => { setOpen(false); if (option.id !== value) onSelect(option.id) }}>{option.label}</button>)}
    </div>}
  </div>
}

export function ItemOrganizationMenu({ type, item }: { type: FolderType; item: { id: number; folder_id: number | null; is_pinned: boolean; is_owner?: boolean } }) {
  const folders = useFolders()
  const mutate = useOrganizeItem()
  const organizing = useIsMutating({ mutationKey: ['organize-item'] }) > 0
  const [error, setError] = useState(false)
  if (item.is_owner === false) return null
  function update(patch: { folder_id?: number | null; is_pinned?: boolean }, close: () => void) {
    setError(false)
    mutate.mutate({ type, id: item.id, ...patch }, { onSuccess: close, onError: () => setError(true) })
  }
  return <ContextPopup label="ჩანაწერის ორგანიზება" onOpen={() => setError(false)}>
    {close => <>
      <button type="button" disabled={organizing} onClick={() => {
        setError(false)
        mutate.mutate({ type, id: item.id, is_pinned: !item.is_pinned }, { onSuccess: close, onError: () => setError(true) })
      }}>{item.is_pinned ? 'მოხსნა მიმაგრებიდან' : 'მიმაგრება'}</button>
      <div className="folder-move-field"><span>გადატანა</span>
        <FolderMovePicker folders={(folders.data ?? []).filter(folder => folder.type === type)}
          value={item.folder_id ?? null} disabled={organizing}
          onSelect={folder_id => update({ folder_id }, close)} />
      </div>
      {error && <span className="error" role="alert">ცვლილება ვერ შეინახა.</span>}
    </>}
  </ContextPopup>
}
