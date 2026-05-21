import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function AdminSettings({ searchParams }) {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'brandsurface_email').single()
  const current = data?.value || ''
  const status = searchParams?.status

  return (
    <>
      <h1 className="a-h1">Settings</h1>
      <p className="a-sub">Where the &ldquo;new approved order&rdquo; email is sent at Brandsurface.</p>

      {status === 'saved' && <div className="a-note ok">Saved.</div>}
      {status === 'error' && <div className="a-note err">Could not save. Please try again.</div>}

      <div className="a-card" style={{ maxWidth: 520 }}>
        <form method="POST" action="/api/admin/settings" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label className="a-label" htmlFor="bs-email">Brandsurface recipient email</label>
          <input id="bs-email" className="a-input" name="brandsurface_email" type="email"
            defaultValue={current} placeholder="orders@brandsurface.dk" />
          <p style={{ fontSize: 12, color: '#7a7672', margin: '2px 0 0', lineHeight: 1.5 }}>
            Leave empty to fall back to the <code style={{ fontFamily: "'DM Mono',monospace" }}>BRANDSURFACE_EMAIL</code> environment variable.
          </p>
          <button type="submit" className="a-btn" style={{ alignSelf: 'flex-start', marginTop: 8 }}>Save</button>
        </form>
      </div>
    </>
  )
}
