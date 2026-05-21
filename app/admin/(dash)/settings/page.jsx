import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function AdminSettings({ searchParams }) {
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['brandsurface_email', 'confirm_delay_minutes'])
  const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  const currentEmail = map.brandsurface_email || ''
  const currentDelay = map.confirm_delay_minutes ?? '10'
  const status = searchParams?.status

  return (
    <>
      <h1 className="a-h1">Settings</h1>
      <p className="a-sub">Order forwarding to Brandsurface.</p>

      {status === 'saved' && <div className="a-note ok">Saved.</div>}
      {status === 'error' && <div className="a-note err">Could not save. Please try again.</div>}

      <div className="a-card" style={{ maxWidth: 520 }}>
        <form method="POST" action="/api/admin/settings" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="a-label" htmlFor="bs-email">Brandsurface recipient email</label>
            <input id="bs-email" className="a-input" name="brandsurface_email" type="email"
              defaultValue={currentEmail} placeholder="orders@brandsurface.dk" />
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>
              Leave empty to fall back to the <code style={{ fontFamily: "'DM Mono',monospace" }}>BRANDSURFACE_EMAIL</code> environment variable.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="a-label" htmlFor="delay">Delay before sending to Brandsurface (minutes)</label>
            <input id="delay" className="a-input" name="confirm_delay_minutes" type="number" min="0" step="1"
              defaultValue={currentDelay} placeholder="10" style={{ maxWidth: 160 }} />
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>
              After a customer submits, the order is forwarded to Brandsurface after this many minutes. Editing the order restarts the timer. Set to 0 to send immediately.
            </p>
          </div>

          <button type="submit" className="a-btn" style={{ alignSelf: 'flex-start' }}>Save</button>
        </form>
      </div>
    </>
  )
}
