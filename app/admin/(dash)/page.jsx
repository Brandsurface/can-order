import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function productSummary(produkter) {
  if (!Array.isArray(produkter) || !produkter.length) return '—'
  return produkter.map(p => {
    const qty = p.antal != null ? ` ×${p.antal}` : ''
    const fmt = p.format ? ` (${p.format})` : ''
    return `${p.type}${fmt}${qty}`
  }).join(', ')
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Derived display status for the badge
function statusBadge(o) {
  if (o.status === 'confirmed') return { cls: 'confirmed', text: 'sent' }
  if (o.status === 'cancelled') return { cls: 'cancelled', text: 'edited' }
  // pending
  if (o.send_after) {
    const due = new Date(o.send_after).getTime()
    if (Date.now() < due) return { cls: 'pending', text: `awaiting · ${fmtTime(o.send_after)}` }
    return { cls: 'confirmed', text: 'sent' }
  }
  return { cls: 'pending', text: 'pending' }
}

export default async function AdminOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at, status, butiksnavn, navn, email, produkter, revision, send_after')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <>
      <h1 className="a-h1">Orders</h1>
      <p className="a-sub">The {orders?.length || 0} most recent orders that have gone through.</p>

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
            </tr>
          </thead>
          <tbody>
            {(orders || []).map(o => (
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
                <td style={{ color: '#b8b4ae', fontSize: 13, maxWidth: 320 }}>{productSummary(o.produkter)}</td>
                <td>{(() => { const b = statusBadge(o); return <span className={`a-badge ${b.cls}`}>{b.text}</span> })()}</td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && !error && (
              <tr><td colSpan={5} style={{ color: '#7a7672' }}>No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
