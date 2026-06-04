import { supabase } from '@/lib/supabase'
import { getAdminT } from '@/lib/admin-i18n'

export const dynamic = 'force-dynamic'

export default async function AdminSettings({ searchParams }) {
  const { t } = await getAdminT()
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
      <h1 className="a-h1">{t.settings_title}</h1>
      <p className="a-sub">{t.settings_sub}</p>

      {status === 'saved' && <div className="a-note ok">{t.settings_saved}</div>}
      {status === 'error' && <div className="a-note err">{t.settings_error}</div>}

      <div className="a-card" style={{ maxWidth: 520 }}>
        <form method="POST" action="/api/admin/settings" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="a-label" htmlFor="bs-email">{t.settings_email_label}</label>
            <input id="bs-email" className="a-input" name="brandsurface_email" type="email"
              defaultValue={currentEmail} placeholder="orders@brandsurface.dk" />
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>
              {t.settings_email_help_pre}<code style={{ fontFamily: "'DM Mono',monospace" }}>BRANDSURFACE_EMAIL</code>{t.settings_email_help_post}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="a-label" htmlFor="delay">{t.settings_delay_label}</label>
            <input id="delay" className="a-input" name="confirm_delay_minutes" type="number" min="0" step="1"
              defaultValue={currentDelay} placeholder="10" style={{ maxWidth: 160 }} />
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>
              {t.settings_delay_help}
            </p>
          </div>

          <div style={{ borderTop: '1px solid #2e2e2e', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="a-label">{t.settings_helpbox_label}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#f0ede8' }}>
              <input type="checkbox" name="help_box_active" value="1" defaultChecked={helpBoxActive}
                style={{ width: 16, height: 16, accentColor: '#f1562e', cursor: 'pointer' }} />
              {t.settings_helpbox_show}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['b', t.settings_fmt_bold], ['u', t.settings_fmt_underline], ['br', t.settings_fmt_linebreak]].map(([tag, label]) => (
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
              {t.settings_supports_prefix} <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;b&gt;</code> {t.word_bold},{' '}
              <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;u&gt;</code> {t.word_underline},{' '}
              <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;br&gt;</code> {t.word_linebreak},{' '}
              <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;a href=""&gt;</code> {t.word_link}.
            </p>
          </div>

          <button type="submit" className="a-btn" style={{ alignSelf: 'flex-start' }}>{t.settings_save}</button>
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
