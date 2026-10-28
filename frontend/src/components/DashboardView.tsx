import { useState } from 'react'
import { FileText, Folder as FolderIcon, Plus, Star, Table2, LockKeyhole, Activity } from 'lucide-react'
import { FolderDialog } from '@/components/FolderDialog'
import { ItemOrganizationMenu } from '@/components/FolderTree'
import { CREATE_NOTE_EVENT, CREATE_TABLE_EVENT, useFolders } from '@/hooks/useFolders'
import type { FolderType, Note, Sheet } from '@/lib/types'

export function DashboardView({ notes, sheets, loading, error, onNote, onSheet }: {
  notes: Note[]; sheets: Sheet[]; loading: boolean; error: boolean; onNote: (id: number) => void; onSheet: (id: number) => void
}) {
  const folders = useFolders()
  const [now] = useState(() => Date.now())
  const [newFolder, setNewFolder] = useState(false)
  const [folderId, setFolderId] = useState<number | null>(null)
  const all = [
    ...notes.map(note => ({ ...note, label: note.title, category: 'notes' as FolderType, badge: note.type === 'rich_text' ? 'ტექსტური ნოუთი' : 'ჩეკლისტი' })),
    ...sheets.map(sheet => ({ ...sheet, label: sheet.name, category: 'tables' as FolderType, badge: 'ცხრილი' })),
  ]
  const recentCount = all.filter(item => item.updated_at && now - Date.parse(item.updated_at) < 7 * 86400000).length
  const selected = (folders.data ?? []).find(folder => folder.id === folderId)
  const visible = all.filter(item => folderId === null || (item.folder_id === folderId && item.category === selected?.type))
    .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || Date.parse(b.updated_at ?? '') - Date.parse(a.updated_at ?? ''))
  const cards = folderId === null ? visible.slice(0, 12) : visible
  return <div className="dashboard-page">
    <header className="dashboard-heading"><div><p className="muted">შენი სამუშაო სივრცე</p><h1>დეშბორდი</h1></div></header>
    {error && <p className="error" role="alert">მონაცემები ვერ ჩაიტვირთა. განაახლე გვერდი.</p>}
    <div className="dashboard-stats">
      {[{ label: 'ნოუთები', value: notes.length, Icon: FileText }, { label: 'ცხრილები', value: sheets.length, Icon: Table2 }, { label: 'განახლებული ბოლო 7 დღეში', value: recentCount, Icon: Activity }].map(({ label, value, Icon }) => <div className="dashboard-stat" key={label}><Icon size={19} /><strong>{loading ? '…' : value}</strong><span>{label}</span></div>)}
    </div>
    <div className="dashboard-actions"><button className="btn-primary" onClick={() => window.dispatchEvent(new Event(CREATE_NOTE_EVENT))}><Plus size={16} />ახალი ნოუთი</button><button className="btn-ghost" onClick={() => window.dispatchEvent(new Event(CREATE_TABLE_EVENT))}><Plus size={16} />ახალი ცხრილი</button><button className="btn-ghost" onClick={() => setNewFolder(true)}><FolderIcon size={16} />ახალი საქაღალდე</button></div>
    <section><h2>საქაღალდეები</h2>
      {folderId !== null && <button className="btn-ghost" onClick={() => setFolderId(selected?.parent_id ?? null)}>← {selected?.name ?? 'მთავარი დონე'}</button>}
      {folders.isError && <p className="error">საქაღალდეები ვერ ჩაიტვირთა.</p>}
      <div className="dashboard-folder-grid">{(folders.data ?? []).filter(folder => folder.parent_id === folderId).map(folder => <button key={folder.id} className="dashboard-folder" onClick={() => setFolderId(folder.id)}><FolderIcon size={20} /><span>{folder.name}<small>{folder.type === 'notes' ? 'ნოუთები' : 'ცხრილები'}</small></span></button>)}</div>
      {!folders.isLoading && !(folders.data ?? []).length && <p className="muted">შექმენი საქაღალდე ჩანაწერების დასალაგებლად.</p>}
    </section>
    <section><h2>{selected ? selected.name : 'მიმაგრებული და ბოლო ჩანაწერები'}</h2>
      {loading ? <p className="muted">იტვირთება…</p> : !cards.length ? <p className="muted">ჯერ ჩანაწერი არ არის. დაიწყე ახალი ნოუთით ან ცხრილით.</p> : <div className="dashboard-item-grid">{cards.map(item => <article className="dashboard-item" key={`${item.category}:${item.id}`}>
        <div className="dashboard-item-top">{item.category === 'notes' ? <FileText size={20} /> : <Table2 size={20} />}{item.is_pinned && <Star size={14} fill="currentColor" />}<ItemOrganizationMenu type={item.category} item={item} /></div>
        <button className="dashboard-item-open" onClick={() => item.category === 'notes' ? onNote(item.id) : onSheet(item.id)}>{item.label}</button>
        <div className="dashboard-badges"><span>{item.badge}</span>{item.is_locked && <span><LockKeyhole size={12} />დაცული</span>}</div>
        <small className="muted">{item.updated_at ? new Date(item.updated_at).toLocaleDateString('ka-GE') : ''}</small>
      </article>)}</div>}
    </section>
    {newFolder && <FolderDialog type="notes" onClose={() => setNewFolder(false)} />}
  </div>
}
