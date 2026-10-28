import { useState } from 'react'
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
  const excluded = folder ? folderDescendants(folders.data ?? [], folder.id) : new Set<number>()
  return createPortal(<div className="dict-modal-backdrop" onKeyDown={e => { if (e.key === 'Escape' && !mutation.isPending) onClose() }}>
    <form className="dict-form" role="dialog" aria-modal="true" aria-labelledby="folder-dialog-title" onSubmit={async e => {
      e.preventDefault(); setError('')
      try {
        await mutation.mutateAsync(mode === 'delete' ? { id: folder?.id, delete_contents: destroy, account_password: password } : { ...(mode === 'edit' ? { id: folder?.id } : { type }), name: name.trim(), parent_id: parent })
        onClose()
      } catch (err) { setError(err instanceof ApiError ? Object.values((err.body as { errors?: Record<string, string[]> }).errors ?? {})[0]?.[0] ?? 'შენახვა ვერ მოხერხდა.' : 'ქსელის შეცდომა') }
    }}>
      <h2 id="folder-dialog-title">{mode === 'delete' ? 'საქაღალდის წაშლა' : mode === 'edit' ? 'საქაღალდის რედაქტირება' : 'ახალი საქაღალდე'}</h2>
      {mode === 'delete' ? <>
        <p>„{folder?.name}“ და მისი ქვესაქაღალდეები წაიშლება. ჩანაწერები მთავარ დონეზე გადავა.</p>
        <label className="folder-delete-choice"><input type="checkbox" checked={destroy} onChange={e => setDestroy(e.target.checked)} />შიგთავსიც წაიშალოს (აღდგენა შეუძლებელია)</label>
        {destroy && <label>ანგარიშის პაროლი<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />{!me.data?.has_password && <span className="muted">ჯერ პროფილში დააყენე ანგარიშის პაროლი.</span>}</label>}
      </> : <>
        <label>სახელი<input autoFocus required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
        {mode === 'create' && parentId === null && <label>სექცია<select aria-label="სექცია" value={type} onChange={e => { setType(e.target.value as FolderType); setParent(null) }}><option value="notes">ნოუთები</option><option value="tables">ცხრილები</option></select></label>}
        <label>მშობელი საქაღალდე<select aria-label="მშობელი საქაღალდე" value={parent ?? ''} onChange={e => setParent(e.target.value ? Number(e.target.value) : null)}><option value="">მთავარი დონე</option>{(folders.data ?? []).filter(f => f.type === type && !excluded.has(f.id)).map(f => <option key={f.id} value={f.id}>{folderPath(folders.data ?? [], f)}</option>)}</select></label>
      </>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dict-form-actions"><button type="submit" className={mode === 'delete' ? 'btn-danger' : 'btn-primary'} disabled={mutation.isPending || (destroy && !me.data?.has_password)}>{mutation.isPending ? 'ინახება…' : mode === 'delete' ? 'წაშლა' : 'შენახვა'}</button><button type="button" className="btn-ghost" disabled={mutation.isPending} onClick={onClose}>გაუქმება</button></div>
    </form>
  </div>, document.body)
}
