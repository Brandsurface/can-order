import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function AdminSettings({ searchParams }) {
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['brandsurface_email', 'confirm_delay_minutes', 'help_box_active', 'help_box_html'])
  const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  const currentEmail = map.brandsurface_email || ''
  const currentDelay = map.confirm_delay_minutes ?? '10'
  const helpBoxActive = map.help_box_active === '1'
  const helpBoxHtml = map.help_box_html || ''
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

          <div style={{ borderTop: '1px solid #2e2e2e', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="a-label">Help / contact box on order form</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#f0ede8' }}>
              <input type="checkbox" name="help_box_active" value="1" defaultChecked={helpBoxActive}
                style={{ width: 16, height: 16, accentColor: '#f1562e', cursor: 'pointer' }} />
              Show box below the Sales Consultant section
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['b','Bold'],['u','Underline'],['br','Line break']].map(([tag, label]) => (
                <button key={tag} type="button" onClick={undefined}
                  data-tag={tag}
                  style={{ padding: '4px 10px', background: '#2e2e2e', border: '1px solid #4a4640', borderRadius: 6, color: '#b8b4ae', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                  dangerouslySetInnerHTML={{ __html: tag === 'br' ? '&#x21B5; br' : `<${tag}>${label}</${tag}>` }}
                />
              ))}
            </div>
            <textarea id="help-content" className="a-input" name="help_box_html" rows={5}
              defaultValue={helpBoxHtml}
              placeholder={'<b>Need help?</b><br>Contact us: <a href="mailto:info@brandsurface.dk">info@brandsurface.dk</a>'}
              style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, resize: 'vertical' }} />
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>
              Supports: <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;b&gt;</code> bold,{' '}
              <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;u&gt;</code> underline,{' '}
              <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;br&gt;</code> line break,{' '}
              <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;a href=""&gt;</code> link.
            </p>
          </div>

          <button type="submit" className="a-btn" style={{ alignSelf: 'flex-start' }}>Save</button>
        </form>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelectorAll('[data-tag]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var tag = btn.dataset.tag;
            var ta = document.getElementById('help-content');
            var s = ta.selectionStart, e = ta.selectionEnd;
            if (tag === 'br') {
              ta.setRangeText('<br>', s, s, 'end');
            } else {
              var sel = ta.value.slice(s, e);
              ta.setRangeText('<' + tag + '>' + (sel || '') + '</' + tag + '>', s, e, 'end');
            }
            ta.focus();
          });
        });
      `}} />
    </>
  )
}
