import { supabase } from '@/lib/supabase'
import { getAdminT } from '@/lib/admin-i18n'

export const dynamic = 'force-dynamic'

function fmtDate(iso, locale) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function fmtTime(iso, locale) {
  try {
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' })
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
function statusBadge(o, t, locale) {
  if (o.status === 'confirmed') return { cls: 'confirmed', text: t.badge_sent }
  if (o.status === 'cancelled') return { cls: 'cancelled', text: t.badge_edited }
  if (o.send_after) {
    const due = new Date(o.send_after).getTime()
    if (Date.now() < due) return { cls: 'pending', text: `${t.badge_awaiting} · ${fmtTime(o.send_after, locale)}` }
    return { cls: 'confirmed', text: t.badge_sent }
  }
  return { cls: 'pending', text: t.badge_pending }
}

export default async function AdminOrders({ searchParams }) {
  const { t } = await getAdminT()
  const locale = t.date_locale
  const STATUS = {
    approved: ['ok', t.st_approved],
    deleted: ['ok', t.st_order_deleted],
    notpending: ['err', t.st_notpending],
    notfound: ['err', t.st_notfound],
    error: ['err', t.st_error],
  }
  // Mark any scheduled orders as confirmed if their send_after time has passed
  await supabase
    .from('orders')
    .update({ status: 'confirmed' })
    .eq('status', 'pending')
    .not('send_after', 'is', null)
    .lte('send_after', new Date().toISOString())

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at, status, butiksnavn, navn, email, produkter, revision, send_after, uploads, pm_status')
    .order('created_at', { ascending: false })
    .limit(200)

  const note = searchParams?.status ? STATUS[searchParams.status] : null

  return (
    <>
      <h1 className="a-h1">{t.orders_title}</h1>
      <p className="a-sub">{t.orders_sub.replace('{n}', orders?.length || 0)}</p>

      {note && <div className={`a-note ${note[0]}`}>{note[1]}</div>}
      {error && <div className="a-note err">{t.orders_load_error.replace('{msg}', error.message)}</div>}

      <form id="bulk-form" method="POST" action="/api/admin/orders">
        <input type="hidden" name="action" value="bulk-delete" />
      </form>

      <div id="bulk-bar" style={{ display: 'none', alignItems: 'center', gap: 14, marginBottom: 16, padding: '12px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12 }}>
        <span style={{ fontSize: 14, color: '#f0ede8' }}><strong id="bulk-count">0</strong> {t.orders_selected}</span>
        <button type="submit" form="bulk-form" className="a-btn-danger" data-confirm={t.orders_confirm_bulk_delete} style={{ marginLeft: 'auto' }}>{t.orders_delete_selected}</button>
      </div>

      <div className="a-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="a-table">
          <thead>
            <tr>
              <th style={{ width: 36, paddingRight: 0 }}>
                <input type="checkbox" id="sel-all" style={{ width: 16, height: 16, accentColor: '#f1562e', cursor: 'pointer' }} aria-label={t.aria_select_all} />
              </th>
              <th>{t.col_created}</th>
              <th>{t.col_campaign}</th>
              <th>{t.col_orderer}</th>
              <th>{t.col_products}</th>
              <th>{t.col_status}</th>
              <th>{t.col_pm}</th>
              <th>{t.col_actions}</th>
            </tr>
          </thead>
          <tbody>
            {(orders || []).map(o => {
              const b = statusBadge(o, t, locale)
              const isPending = o.status === 'pending' && (!o.send_after || new Date(o.send_after).getTime() > Date.now())
              return (
                <tr key={o.id}>
                  <td style={{ paddingRight: 0 }}>
                    <input type="checkbox" className="ord-check" name="ids" value={o.id} form="bulk-form" style={{ width: 16, height: 16, accentColor: '#f1562e', cursor: 'pointer' }} aria-label={t.aria_select_order.replace('{x}', o.butiksnavn || o.id)} />
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: '#b8b4ae' }}>{fmtDate(o.created_at, locale)}</td>
                  <td>
                    {o.butiksnavn || '—'}
                    {o.revision > 0 && <span style={{ color: '#7a7672', fontSize: 12 }}> · {t.rev_prefix} {o.revision}</span>}
                  </td>
                  <td>
                    {o.navn || '—'}
                    <div style={{ color: '#7a7672', fontSize: 12 }}>{o.email}</div>
                  </td>
                  <td style={{ color: '#b8b4ae', fontSize: 13, maxWidth: 320 }}>
                    {productSummary(o.produkter)}
                    {Array.isArray(o.uploads) && o.uploads.length > 0 && (
                      <div style={{ color: '#7a7672', fontSize: 12, marginTop: 4 }}>📎 {o.uploads.length} {o.uploads.length > 1 ? t.files_many : t.files_one}</div>
                    )}
                  </td>
                  <td><span className={`a-badge ${b.cls}`}>{b.text}</span></td>
                  <td>
                    <form method="POST" action="/api/admin/orders" style={{ display: 'inline' }}>
                      <input type="hidden" name="action" value="set-pm-status" />
                      <input type="hidden" name="id" value={o.id} />
                      <select name="pm_status" className={`pm-select${o.pm_status ? ` ${o.pm_status}` : ''}`}
                        onChange="this.form.submit()" defaultValue={o.pm_status || ''}>
                        <option value="">—</option>
                        <option value="not_handled">{t.pm_not_handled}</option>
                        <option value="quote_approval">{t.pm_quote_approval}</option>
                        <option value="awaiting_info">{t.pm_awaiting_info}</option>
                        <option value="taken_further">{t.pm_taken_further}</option>
                        <option value="completed">{t.pm_completed}</option>
                      </select>
                    </form>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {isPending && (
                        <form method="POST" action="/api/admin/orders">
                          <input type="hidden" name="action" value="approve" />
                          <input type="hidden" name="id" value={o.id} />
                          <button type="submit" className="a-btn-2" data-confirm={t.confirm_approve}>{t.btn_approve_now}</button>
                        </form>
                      )}
                      <a className="a-btn-2" href={`/?edit=${o.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{t.btn_edit}</a>
                      <form method="POST" action="/api/admin/orders">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="id" value={o.id} />
                        <button type="submit" className="a-btn-danger" data-confirm={t.confirm_delete_order}>{t.btn_delete}</button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
            {(!orders || orders.length === 0) && !error && (
              <tr><td colSpan={8} style={{ color: '#7a7672' }}>{t.orders_empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `(function(){
        function boxes(){return Array.prototype.slice.call(document.querySelectorAll('.ord-check'));}
        var all=document.getElementById('sel-all'),bar=document.getElementById('bulk-bar'),cnt=document.getElementById('bulk-count');
        function upd(){var b=boxes(),c=b.filter(function(x){return x.checked;}).length;if(cnt)cnt.textContent=c;if(bar)bar.style.display=c?'flex':'none';if(all){all.checked=c>0&&c===b.length;all.indeterminate=c>0&&c<b.length;}}
        if(all)all.addEventListener('change',function(){boxes().forEach(function(x){x.checked=all.checked;});upd();});
        document.addEventListener('change',function(e){if(e.target&&e.target.classList&&e.target.classList.contains('ord-check'))upd();});
      })();` }} />
    </>
  )
}
