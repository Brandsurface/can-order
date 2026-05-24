import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const STATUS = {
  approved: ['ok', 'Order approved and sent to Brandsurface.'],
  deleted: ['ok', 'Order deleted.'],
  notpending: ['err', 'That order is no longer pending.'],
  notfound: ['err', 'Order not found.'],
  error: ['err', 'Something went wrong. Please try again.'],
}

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function productSummary(produkter) {
  if (!Array.isArray(produkter) || !produkter.length) return '—'
  return produkter.map(p => {
    const qty = p.antal != null ? ` ×${p.antal}` : ''
    const opts = p.options
      ? Object.values(p.options).map(v => Array.isArray(v) ? v.join('/') : v)
      : (p.format ? [p.format] : [])
    const extra = opts.length ? ` (${opts.join(', ')})` : ''
    return `${p.type}${extra}${qty}`
  }).join(', ')
}

// Derived display status for the badge
function statusBadge(o) {
  if (o.status === 'confirmed') return { cls: 'confirmed', text: 'sent' }
  if (o.status === 'cancelled') return { cls: 'cancelled', text: 'edited' }
  if (o.send_after) {
    const due = new Date(o.send_after).getTime()
    if (Date.now() < due) return { cls: 'pending', text: `awaiting · ${fmtTime(o.send_after)}` }
    return { cls: 'confirmed', text: 'sent' }
  }
  return { cls: 'pending', text: 'pending' }
}

export default async function AdminOrders({ searchParams }) {
  // Mark any scheduled orders as confirmed if their send_after time has passed
  await supabase
    .from('orders')
    .update({ status: 'confirmed' })
    .eq('status', 'pending')
    .not('send_after', 'is', null)
    .lte('send_after', new Date().toISOString())

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at, status, butiksnavn, navn, email, produkter, revision, send_after, uploads')
    .order('created_at', { ascending: false })
    .limit(200)

  const note = searchParams?.status ? STATUS[searchParams.status] : null

  return (
    <>
      <h1 className="a-h1">Orders</h1>
      <p className="a-sub">The {orders?.length || 0} most recent orders. Use the actions to help a customer whose order is stuck.</p>

      {note && <div className={`a-note ${note[0]}`}>{note[1]}</div>}
      {error && <div className="a-note err">Could not load orders: {error.message}</div>}

      <div className="a-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="a-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Campaign</th>
              <th>Orderer</th>
              <th>Products</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(orders || []).map(o => {
              const b = statusBadge(o)
              const isPending = o.status === 'pending' && (!o.send_after || new Date(o.send_after).getTime() > Date.now())
              return (
                <tr key={o.id}>
                  <td style={{ whiteSpace: 'nowrap', color: '#b8b4ae' }}>{fmtDate(o.created_at)}</td>
                  <td>
                    {o.butiksnavn || '—'}
                    {o.revision > 0 && <span style={{ color: '#7a7672', fontSize: 12 }}> · rev. {o.revision}</span>}
                  </td>
                  <td>
                    {o.navn || '—'}
                    <div style={{ color: '#7a7672', fontSize: 12 }}>{o.email}</div>
                  </td>
                  <td style={{ color: '#b8b4ae', fontSize: 13, maxWidth: 320 }}>
                    {productSummary(o.produkter)}
                    {Array.isArray(o.uploads) && o.uploads.length > 0 && (
                      <div style={{ color: '#7a7672', fontSize: 12, marginTop: 4 }}>📎 {o.uploads.length} file{o.uploads.length > 1 ? 's' : ''}</div>
                    )}
                  </td>
                  <td><span className={`a-badge ${b.cls}`}>{b.text}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {isPending && (
                        <>
                          <form method="POST" action="/api/admin/orders">
                            <input type="hidden" name="action" value="approve" />
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" className="a-btn-2" data-confirm="Approve now and send this order to Brandsurface?">Approve now</button>
                          </form>
                          <a className="a-btn-2" href={`/?edit=${o.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>Edit</a>
                        </>
                      )}
                      <form method="POST" action="/api/admin/orders">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="id" value={o.id} />
                        <button type="submit" className="a-btn-danger" data-confirm="Delete this order permanently?">Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
            {(!orders || orders.length === 0) && !error && (
              <tr><td colSpan={6} style={{ color: '#7a7672' }}>No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
