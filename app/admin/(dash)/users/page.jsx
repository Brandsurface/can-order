import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const STATUS = {
  created: ['ok', 'User added. They set their password on first login.'],
  deleted: ['ok', 'User deleted.'],
  reset: ['ok', 'Password reset. The user sets a new one on next login.'],
  exists: ['err', 'That email already exists.'],
  invalid: ['err', 'Invalid email address.'],
  self: ['err', 'You cannot delete your own account.'],
  master: ['err', 'The master user cannot be deleted.'],
  forbidden: ['err', 'Only the master user can manage users.'],
  error: ['err', 'Something went wrong. Please try again.'],
}

export default async function AdminUsers({ searchParams }) {
  const me = await getCurrentUser()
  if (!me?.is_master) {
    return (
      <>
        <h1 className="a-h1">Users</h1>
        <div className="a-note err">Only the master user can manage users.</div>
      </>
    )
  }

  const { data: users } = await supabase
    .from('admin_users')
    .select('id, email, is_master, password_hash, created_at')
    .order('created_at', { ascending: true })

  const note = searchParams?.status ? STATUS[searchParams.status] : null

  return (
    <>
      <h1 className="a-h1">Users</h1>
      <p className="a-sub">Admins who can log in. New users set their password on first login.</p>

      {note && <div className={`a-note ${note[0]}`}>{note[1]}</div>}

      <div className="a-card" style={{ maxWidth: 520, marginBottom: 24 }}>
        <form method="POST" action="/api/admin/users" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <input type="hidden" name="action" value="create" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 220 }}>
            <label className="a-label" htmlFor="new-email">Add user</label>
            <input id="new-email" className="a-input" name="email" type="email" required placeholder="name@brandsurface.dk" />
          </div>
          <button type="submit" className="a-btn">Add</button>
        </form>
      </div>

      <div className="a-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="a-table">
          <thead>
            <tr><th>Email</th><th>Role</th><th>Password</th><th></th></tr>
          </thead>
          <tbody>
            {(users || []).map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.is_master ? <span className="a-badge confirmed">master</span> : <span style={{ color: '#7a7672' }}>admin</span>}</td>
                <td style={{ color: u.password_hash ? '#b8b4ae' : '#f1562e' }}>{u.password_hash ? 'Set' : 'Not set'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <form method="POST" action="/api/admin/users">
                      <input type="hidden" name="action" value="reset" />
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" className="a-btn-2">Reset password</button>
                    </form>
                    {!u.is_master && u.id !== me.id && (
                      <form method="POST" action="/api/admin/users">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="a-btn-danger">Delete</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
