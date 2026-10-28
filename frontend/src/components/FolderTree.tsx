import { ChevronDown, ChevronRight, Folder as FolderIcon, MoreHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { FolderDialog } from '@/components/FolderDialog'
import { folderPath, useFolders, useOrganizeItem } from '@/hooks/useFolders'
import type { Folder, FolderType } from '@/lib/types'

export function FolderTree<T extends { id: number; folder_id: number | null }>({ type, items, renderItem }: { type: FolderType; items: T[]; renderItem: (item: T) => ReactNode }) {
  const query = useFolders()
  const folders = (query.data ?? []).filter(f => f.type === type)
  const [closed, setClosed] = useState<Set<number>>(() => new Set())
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit' | 'delete'; folder: Folder } | null>(null)
  function branch(parent: number | null): ReactNode {
    return <>
      {folders.filter(f => f.parent_id === parent).map(folder => <div key={folder.id} className="folder-node">
        <div className="folder-row">
          <button type="button" className="folder-toggle" aria-expanded={!closed.has(folder.id)} onClick={() => setClosed(prev => { const next = new Set(prev); if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id); return next })}>
            {closed.has(folder.id) ? <ChevronRight size={13} /> : <ChevronDown size={13} />}<FolderIcon size={15} /><span>{folder.name}</span>
          </button>
          <details className="item-menu folder-menu"><summary aria-label={`საქაღალდის მოქმედებები: ${folder.name}`}><MoreHorizontal size={16} /></summary><div className="item-menu-panel">
            <button type="button" onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); setDialog({ mode: 'create', folder }) }}>ქვესაქაღალდე</button>
            <button type="button" onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); setDialog({ mode: 'edit', folder }) }}>გადარქმევა / გადატანა</button>
            <button type="button" onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); setDialog({ mode: 'delete', folder }) }}>წაშლა</button>
          </div></details>
        </div>
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

export function ItemOrganizationMenu({ type, item }: { type: FolderType; item: { id: number; folder_id: number | null; is_pinned: boolean; is_owner?: boolean } }) {
  const folders = useFolders()
  const mutate = useOrganizeItem()
  const [error, setError] = useState(false)
  if (item.is_owner === false) return null
  function update(patch: { folder_id?: number | null; is_pinned?: boolean }) {
    setError(false)
    mutate.mutate({ type, id: item.id, ...patch }, { onError: () => setError(true) })
  }
  return <details className="item-menu"><summary aria-label="ჩანაწერის ორგანიზება"><MoreHorizontal size={15} /></summary><div className="item-menu-panel">
    <button type="button" disabled={mutate.isPending} onClick={() => update({ is_pinned: !item.is_pinned })}>{item.is_pinned ? 'მოხსნა მიმაგრებიდან' : 'მიმაგრება'}</button>
    <label>გადატანა<select aria-label="საქაღალდეში გადატანა" value={item.folder_id ?? ''} disabled={mutate.isPending} onChange={e => update({ folder_id: e.target.value ? Number(e.target.value) : null })}><option value="">მთავარი დონე</option>{(folders.data ?? []).filter(f => f.type === type).map(f => <option key={f.id} value={f.id}>{folderPath(folders.data ?? [], f)}</option>)}</select></label>
    {error && <span className="error" role="alert">ცვლილება ვერ შეინახა.</span>}
  </div></details>
}
