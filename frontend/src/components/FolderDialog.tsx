import { useEffect, useState } from 'react'
import { FolderPlus, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useMe } from '@/hooks/useAuth'
import { folderDescendants, folderPath, useFolders, useFolderMutation } from '@/hooks/useFolders'
import { ApiError } from '@/lib/api'
import type { Folder, FolderType } from '@/lib/types'

export function FolderDialog({ type: initialType, folder, parentId = null, mode = 'create', onClose }: {
  type: FolderType; folder?: Folder; parentId?: number | null; mode?: 'create' | 'edit' | 'delete'; onClose: () => void
}) {
  const folders = useFolders()
  const mutation = useFolderMutation()
  const me = useMe()
  const [type, setType] = useState(initialType)
  const [name, setName] = useState(folder?.name ?? '')
  const [parent, setParent] = useState(folder?.parent_id ?? parentId)
  const [destroy, setDestroy] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !mutation.isPending) { event.preventDefault(); onClose() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey) }
  }, [onClose, mutation.isPending])
  const excluded = folder ? folderDescendants(folders.data ?? [], folder.id) : new Set<number>()
  return createPortal(<div className="dict-modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !mutation.isPending) onClose() }}>
    <form className="dict-form folder-form" role="dialog" aria-modal="true" aria-labelledby="folder-dialog-title" onSubmit={async e => {
      e.preventDefault(); setError('')
      try {
        await mutation.mutateAsync(mode === 'delete' ? { id: folder?.id, delete_contents: destroy, account_password: password } : { ...(mode === 'edit' ? { id: folder?.id } : { type }), name: name.trim(), parent_id: parent })
        onClose()
      } catch (err) { setError(err instanceof ApiError ? Object.values((err.body as { errors?: Record<string, string[]> }).errors ?? {})[0]?.[0] ?? 'შენახვა ვერ მოხერხდა.' : 'ქსელის შეცდომა') }
    }}>
      <div className="dict-form-head"><div className="folder-form-heading"><FolderPlus size={18} aria-hidden /><h2 id="folder-dialog-title">{mode === 'delete' ? 'საქაღალდის წაშლა' : mode === 'edit' ? 'საქაღალდის რედაქტირება' : 'ახალი საქაღალდე'}</h2></div><button type="button" className="btn-icon" aria-label="დახურვა" disabled={mutation.isPending} onClick={onClose}><X size={16} /></button></div>
      {mode === 'delete' ? <>
        <p>„{folder?.name}“ და მისი ქვესაქაღალდეები წაიშლება. ჩანაწერები მთავარ დონეზე გადავა.</p>
        <label className="folder-delete-choice"><input type="checkbox" checked={destroy} onChange={e => setDestroy(e.target.checked)} />შიგთავსიც წაიშალოს (აღდგენა შეუძლებელია)</label>
        {destroy && <label>ანგარიშის პაროლი<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />{!me.data?.has_password && <span className="muted">ჯერ პროფილში დააყენე ანგარიშის პაროლი.</span>}</label>}
      </> : <>
        <label>სახელი<input autoFocus required placeholder="მაგ. სამუშაო, პირადი…" autoComplete="off" maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
        {mode === 'create' && <div className="folder-section-field">
          <span>სექცია</span>
          <div className="notes-seg notes-seg-compact" role="group" aria-label="სექცია">
            {(['notes', 'tables'] as const).map(section => <button key={section} type="button" className={`notes-seg-btn ${type === section ? 'active' : ''}`} aria-pressed={type === section} disabled={parentId !== null} onClick={() => { setType(section); setParent(null) }}>{section === 'notes' ? 'ნოუთები' : 'ცხრილები'}</button>)}
          </div>
        </div>}
        <label>მშობელი საქაღალდე<select aria-label="მშობელი საქაღალდე" value={parent ?? ''} onChange={e => setParent(e.target.value ? Number(e.target.value) : null)}><option value="">მთავარი დონე</option>{(folders.data ?? []).filter(f => f.type === type && !excluded.has(f.id)).map(f => <option key={f.id} value={f.id}>{folderPath(folders.data ?? [], f)}</option>)}</select></label>
      </>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dict-form-actions"><button type="submit" className={mode === 'delete' ? 'btn-danger' : 'btn-primary'} disabled={mutation.isPending || (destroy && !me.data?.has_password)}>{mutation.isPending ? 'ინახება…' : mode === 'delete' ? 'წაშლა' : 'შენახვა'}</button><button type="button" className="btn-ghost" disabled={mutation.isPending} onClick={onClose}>გაუქმება</button></div>
    </form>
  </div>, document.body)
}
