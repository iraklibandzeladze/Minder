import { useState } from 'react'
import { ApiError } from '@/lib/api'
import { useAdminStats, useAdminUsers, useUpdateAdminUser } from '@/hooks/useAdmin'
import type { AdminUser, PlatformRole, UserPlan } from '@/lib/types'

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string }
    return body.message ?? 'შეცდომა'
  }
  return 'ქსელის შეცდომა'
}

export function AdminView() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  const stats = useAdminStats(true)
  const users = useAdminUsers(true, search, pendingOnly)
  const update = useUpdateAdminUser()

  async function patch(id: number, body: {
    plan?: UserPlan
    platform_role?: PlatformRole
    blocked?: boolean
    reject_pro_request?: boolean
  }) {
    setRowError(null)
    try {
      await update.mutateAsync({ id, ...body })
    } catch (err) {
      setRowError(errorMessage(err))
    }
  }

  const list = users.data ?? []
  const s = stats.data

  return (
    <div className="profile-page admin-page">
      <div className="profile-card admin-card">
        <header className="profile-header">
          <div>
            <h1>ადმინი</h1>
            <p className="muted">მომხმარებლები, გეგმები და ბლოკი</p>
          </div>
        </header>

        {s && (
          <div className="admin-stats">
            <div className="admin-stat">
              <strong>{s.users}</strong>
              <span className="muted">მომხმარებელი</span>
            </div>
            <div className="admin-stat">
              <strong>{s.pro}</strong>
              <span className="muted">Pro</span>
            </div>
            <button
              type="button"
              className={`admin-stat admin-stat-btn ${pendingOnly ? 'is-on' : ''}`}
              onClick={() => setPendingOnly((v) => !v)}
              title="მხოლოდ Pro მოთხოვნები"
            >
              <strong>{s.pending_pro}</strong>
              <span className="muted">Pro მოთხოვნა</span>
            </button>
            <div className="admin-stat">
              <strong>{s.blocked}</strong>
              <span className="muted">დაბლოკილი</span>
            </div>
            <div className="admin-stat">
              <strong>{s.sheets}</strong>
              <span className="muted">ცხრილი</span>
            </div>
            <div className="admin-stat">
              <strong>{s.notes}</strong>
              <span className="muted">ნოუთი</span>
            </div>
          </div>
        )}

        <form
          className="admin-search"
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(q)
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ძებნა სახელი / ელფოსტა"
          />
          <button type="submit" className="btn-primary">
            ძებნა
          </button>
        </form>

        {rowError && <p className="error">{rowError}</p>}
        {users.isLoading && <p className="muted">იტვირთება…</p>}
        {users.isError && <p className="error">სია ვერ ჩაიტვირთა</p>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>მომხმარებელი</th>
                <th>გეგმა</th>
                <th>როლი</th>
                <th>რესურსები</th>
                <th>სტატუსი</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((u: AdminUser) => (
                <tr
                  key={u.id}
                  className={`${u.is_blocked ? 'is-blocked' : ''} ${u.pro_requested_at ? 'has-pro-request' : ''}`}
                >
                  <td>
                    <div className="admin-user-cell">
                      <strong>{u.name}</strong>
                      <span className="muted">{u.email}</span>
                      {u.pro_request_note && (
                        <span className="admin-request-note">„{u.pro_request_note}“</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      value={u.plan}
                      disabled={update.isPending}
                      onChange={(e) => void patch(u.id, { plan: e.target.value as UserPlan })}
                    >
                      <option value="free">უფასო</option>
                      <option value="pro">Pro</option>
                    </select>
                    {u.pro_requested_at && <p className="admin-pending-label">ელოდება Pro-ს</p>}
                  </td>
                  <td>
                    <select
                      value={u.platform_role}
                      disabled={update.isPending}
                      onChange={(e) =>
                        void patch(u.id, { platform_role: e.target.value as PlatformRole })
                      }
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="muted">
                    {u.sheets_count} ცხრ. / {u.notes_count} ნოუთი
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`btn-ghost admin-block-btn ${u.is_blocked ? 'is-on' : ''}`}
                      disabled={update.isPending}
                      onClick={() => void patch(u.id, { blocked: !u.is_blocked })}
                    >
                      {u.is_blocked ? 'განბლოკვა' : 'ბლოკი'}
                    </button>
                  </td>
                  <td className="admin-pro-actions">
                    {u.pro_requested_at && (
                      <>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={update.isPending}
                          onClick={() => void patch(u.id, { plan: 'pro' })}
                        >
                          დამტკიცება
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={update.isPending}
                          onClick={() => void patch(u.id, { reject_pro_request: true })}
                        >
                          უარყოფა
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!users.isLoading && list.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    მომხმარებელი ვერ მოიძებნა
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
