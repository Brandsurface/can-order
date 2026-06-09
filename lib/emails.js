import { translations } from './translations.js'

// ── Mail template helpers ─────────────────────────────────────

const FONT_SANS = "'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const FONT_MONO = "'DM Mono','SFMono-Regular',Menlo,Consolas,monospace"
const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet"/>'

function escapeHtml(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Escape, then preserve line breaks as <br> (robust across mail clients incl. Outlook)
function escapeMultiline(text) {
  return escapeHtml(text).replace(/\r\n|\r|\n/g, '<br>')
}

// "Format: A4 · Print: 4+4" from p.options, with legacy p.format fallback
function optionsStr(p) {
  if (p.options && typeof p.options === 'object') {
    return Object.entries(p.options)
      .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(Array.isArray(v) ? v.join(', ') : v)}`)
      .join(' · ')
  }
  return p.format ? escapeHtml(p.format) : ''
}

// Brand Surface wordmark logo, rendered in the brand orange
function logo(size = 26) {
  return `<span style="font-family:${FONT_SANS};font-size:${size}px;font-weight:800;letter-spacing:0.02em;color:#f1562e;">BRANDSURFACE</span>`
}

function sectionLabel(text) {
  return `<p style="margin:0 0 12px;font-family:${FONT_MONO};font-size:11px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:#7a7672;">${text}</p>`
}

function getT(order) {
  const lang = (order && order.language === 'da') ? 'da' : 'en'
  return translations[lang]
}

// ── Customer email: auto-sends to Brand Surface after a delay ──
export function buildCustomerConfirmEmail({ order, baseUrl, delayMinutes = 10 }) {
  const t = getT(order)
  const editUrl = `${baseUrl}/?edit=${order.id}`
  const dateLocale = t.email_date_locale || 'en-GB'

  const productCard = (name, meta) => `<tr><td style="padding-bottom:8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e1d1a;border:1px solid #4a4640;border-radius:14px;">
      <tr>
        <td style="padding:14px 18px;color:#f0ede8;font-size:14px;font-weight:600;">${name}</td>
        <td align="right" style="padding:14px 18px;color:#b8b4ae;font-size:13px;font-family:${FONT_MONO};white-space:nowrap;">${meta}</td>
      </tr>
    </table>
  </td></tr>`

  const produkterRows = (order.produkter || [])
    .map(p => {
      const opts = optionsStr(p)
      const name = `${escapeHtml(p.type)}` +
        (opts ? `<br><span style="color:#7a7672;font-size:12px;">${opts}</span>` : '') +
        (p.comment ? `<br><span style="color:#b8b4ae;font-size:12px;font-style:italic;">${escapeHtml(p.comment)}</span>` : '')
      const meta = p.antal != null ? `${escapeHtml(String(p.antal))} ${t.email_pcs}` : escapeHtml(p.note || t.email_requested)
      return productCard(name, meta)
    })
    .join('')

  const andetBlock = order.andet
    ? `<tr><td style="padding-top:8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e1d1a;border:1px solid #4a4640;border-radius:14px;">
          <tr><td style="padding:14px 18px;">
            ${sectionLabel(t.email_brief)}
            <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.5;">${escapeMultiline(order.andet)}</p>
          </td></tr>
        </table>
      </td></tr>`
    : ''

  const altAddrBlock = order.alt_active && order.alt_gade
    ? `<div style="margin-top:14px;padding-top:14px;border-top:1px solid #4a4640;">
        <p style="margin:0 0 5px;font-family:${FONT_MONO};font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">${t.email_alt_delivery}</p>
        <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.6;">
          ${escapeHtml(order.alt_gade)}, ${escapeHtml(order.alt_postnr || '')} ${escapeHtml(order.alt_by || '')}
          ${order.alt_att ? `<br>${t.email_attn} ${escapeHtml(order.alt_att)}` : ''}
          ${order.alt_tlf ? `<br>${t.email_phone} ${escapeHtml(order.alt_tlf)}` : ''}
        </p>
      </div>`
    : ''

  const revisionNote = order.revision > 0
    ? `<tr><td style="padding-bottom:24px;">
        <div style="padding:12px 16px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.3);border-radius:12px;color:#f87171;font-size:13px;line-height:1.5;">
          ${t.email_cust_revision.replace('{n}', order.revision)}
        </div>
      </td></tr>`
    : ''

  const subject = order.revision > 0
    ? t.email_cust_subject_rev.replace('{campaign}', order.butiksnavn).replace('{n}', order.revision)
    : t.email_cust_subject.replace('{campaign}', order.butiksnavn)

  const greeting = t.email_cust_greeting
    .replace('{name}', escapeHtml(order.navn))
    .replace('{campaign}', escapeHtml(order.butiksnavn))

  const addrLabel = order.addr_type === 'privat' ? t.email_private_addr : t.email_business_addr

  const autoSendText = t.email_auto_send.replace('{n}', delayMinutes)

  return {
    subject,
    html: `<!DOCTYPE html>
<html lang="${order.language || 'en'}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${t.email_cust_heading}</title>
  ${FONT_LINK}
</head>
<body style="margin:0;padding:0;background:#0e0a00;font-family:${FONT_SANS};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0a00;background:linear-gradient(160deg,#2a2820 0%,#0e0a00 55%);">
  <tr><td align="center" style="padding:44px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <tr><td style="padding-bottom:32px;">${logo(26)}</td></tr>

      <tr><td style="padding-bottom:8px;">
        <h1 style="margin:0;font-size:30px;font-weight:800;letter-spacing:-0.03em;color:#f1562e;line-height:1.05;">${t.email_cust_heading}</h1>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <p style="margin:0;font-size:15px;color:#b8b4ae;line-height:1.6;font-weight:300;">
          ${greeting}
        </p>
      </td></tr>

      ${revisionNote}

      <tr><td style="padding-bottom:28px;">
        ${sectionLabel(t.email_products)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${produkterRows || productCard(t.email_no_products, '')}
          ${andetBlock}
        </table>
      </td></tr>

      ${(order.uploads && order.uploads.length) ? `<tr><td style="padding-bottom:28px;">
        ${sectionLabel(t.email_files)}
        <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.8;">${order.uploads.map(f => escapeHtml(f.name)).join('<br>')}</p>
      </td></tr>` : ''}

      <tr><td style="padding-bottom:32px;">
        ${sectionLabel(t.email_delivery)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e1d1a;border:1px solid #4a4640;border-radius:16px;">
          ${order.delivery_date ? `<tr><td style="padding:16px 18px 0;">
            <p style="margin:0 0 5px;font-family:${FONT_MONO};font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">${t.email_delivery_date}</p>
            <p style="margin:0;color:#b8b4ae;font-size:13px;">${escapeHtml(new Date(order.delivery_date).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' }))}</p>
          </td></tr>` : ''}
          <tr><td style="padding:16px 18px;">
            <p style="margin:0 0 5px;font-family:${FONT_MONO};font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">${addrLabel}</p>
            <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.6;">
              ${escapeHtml(order.gade || '')}, ${escapeHtml(order.postnr || '')} ${escapeHtml(order.by || '')}${order.land ? `, ${escapeHtml(order.land)}` : ''}
              ${order.att ? `<br>${t.email_attn} ${escapeHtml(order.att)}` : ''}
              ${order.tlf ? `<br>${t.email_phone} ${escapeHtml(order.tlf)}` : ''}
            </p>
            ${altAddrBlock}
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding-bottom:24px;">
        <div style="background:#1e1d1a;border:1px solid #4a4640;border-radius:14px;padding:16px 18px;">
          <p style="margin:0 0 14px;font-size:14px;color:#b8b4ae;line-height:1.6;">
            ${autoSendText}
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#b8b4ae;line-height:1.6;">
            ${t.email_edit_hint}
          </p>
          <a href="${editUrl}"
             style="display:inline-block;padding:13px 26px;background:#f1562e;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px;">
            ${t.email_edit_btn}
          </a>
        </div>
      </td></tr>

      <tr><td style="border-top:1px solid #2e2e2e;padding-top:20px;">
        <p style="margin:0;font-size:11px;color:#5a5652;line-height:1.6;">
          ${t.email_footer}<br>
          ${t.email_order_id} <code style="color:#7a7672;font-family:${FONT_MONO};">${order.id}</code>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
  }
}

// ── Email to Brand Surface when customer has approved ──────────
export function buildBrand SurfaceEmail({ order }) {
  const t = getT(order)
  const dateLocale = t.email_date_locale || 'en-GB'

  const produkterList = (order.produkter || [])
    .map(p => {
      const opts = optionsStr(p)
      const qtyText = p.antal != null ? `${escapeHtml(String(p.antal))} ${t.email_pcs}` : escapeHtml(p.note || t.email_requested)
      return `<li style="margin-bottom:6px;color:#f0ede8;font-size:14px;">${escapeHtml(p.type)}${opts ? ' — ' + opts : ''}: <strong>${qtyText}</strong>` +
        (p.comment ? `<br><span style="color:#b8b4ae;font-size:13px;">${t.email_comment} ${escapeHtml(p.comment)}</span>` : '') +
      `</li>`
    })
    .join('')

  const deliveryLabel = order.addr_type === 'privat' ? t.email_delivery_private : t.email_delivery_business

  return {
    subject: t.email_bs_subject.replace('{campaign}', order.butiksnavn),
    html: `<!DOCTYPE html>
<html lang="${order.language || 'en'}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>${FONT_LINK}</head>
<body style="margin:0;padding:0;background:#0e0a00;font-family:${FONT_SANS};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0a00;background:linear-gradient(160deg,#2a2820 0%,#0e0a00 55%);">
  <tr><td align="center" style="padding:44px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <tr><td style="padding-bottom:28px;">${logo(22)}</td></tr>

      <tr><td style="padding-bottom:6px;">
        <h1 style="margin:0;color:#f1562e;font-size:26px;font-weight:800;letter-spacing:-0.02em;">${t.email_bs_heading}</h1>
      </td></tr>
      <tr><td style="padding-bottom:26px;">
        <p style="margin:0;color:#b8b4ae;font-size:14px;line-height:1.6;">${t.email_bs_intro}</p>
      </td></tr>

      <tr><td style="padding-bottom:20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e1d1a;border:1px solid #4a4640;border-radius:16px;">
          <tr><td style="padding:18px;">
            <p style="margin:0 0 8px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">${t.email_campaign}</strong> ${escapeHtml(order.butiksnavn)}</p>
            <p style="margin:0 0 8px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">${t.email_orderer}</strong> ${escapeHtml(order.navn)}</p>
            <p style="margin:0 0 8px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">${t.email_email}</strong> ${escapeHtml(order.email)}</p>
            ${order.delivery_date ? `<p style="margin:0 0 8px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">${t.email_delivery_date}:</strong> ${escapeHtml(new Date(order.delivery_date).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' }))}</p>` : ''}
            ${order.revision > 0 ? `<p style="margin:0;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">${t.email_revision}</strong> ${order.revision}</p>` : ''}
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding-bottom:20px;">
        ${sectionLabel(t.email_products)}
        <ul style="padding-left:20px;margin:0;">${produkterList}</ul>
        ${order.andet ? `<p style="margin:12px 0 0;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">${t.email_bs_brief}</strong> ${escapeMultiline(order.andet)}</p>` : ''}
      </td></tr>

      ${(order.uploadLinks && order.uploadLinks.length) ? `<tr><td style="padding-bottom:20px;">
        ${sectionLabel(t.email_files)}
        <p style="margin:0;font-size:13px;line-height:1.9;">${order.uploadLinks.map(f => `<a href="${f.url}" style="color:#f1562e;">${escapeHtml(f.name)}</a>`).join('<br>')}</p>
        <p style="margin:6px 0 0;font-size:11px;color:#5a5652;">${t.email_download_expiry}</p>
      </td></tr>` : ''}

      <tr><td style="padding-bottom:20px;">
        ${sectionLabel(deliveryLabel)}
        <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.6;">
          ${escapeHtml(order.gade || '')}, ${escapeHtml(order.postnr || '')} ${escapeHtml(order.by || '')}${order.land ? `, ${escapeHtml(order.land)}` : ''}
          ${order.att ? `<br>${t.email_attn} ${escapeHtml(order.att)}` : ''}
          ${order.tlf ? `<br>${t.email_phone} ${escapeHtml(order.tlf)}` : ''}
        </p>
      </td></tr>

      ${order.alt_active && order.alt_gade ? `<tr><td style="padding-bottom:20px;">
        ${sectionLabel(t.email_alt_delivery)}
        <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.6;">
          ${escapeHtml(order.alt_gade)}, ${escapeHtml(order.alt_postnr || '')} ${escapeHtml(order.alt_by || '')}
          ${order.alt_att ? `<br>${t.email_attn} ${escapeHtml(order.alt_att)}` : ''}
          ${order.alt_tlf ? `<br>${t.email_phone} ${escapeHtml(order.alt_tlf)}` : ''}
        </p>
      </td></tr>` : ''}

      ${order.konsulent_navn ? `<tr><td style="padding-bottom:20px;">
        ${sectionLabel(t.email_sales_consultant)}
        <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.6;">
          ${escapeHtml(order.konsulent_navn)}
          ${order.konsulent_tlf ? `<br>${t.email_phone} ${escapeHtml(order.konsulent_tlf)}` : ''}
          ${order.konsulent_email ? `<br>${t.email_email} ${escapeHtml(order.konsulent_email)}` : ''}
        </p>
      </td></tr>` : ''}

      <tr><td style="border-top:1px solid #2e2e2e;padding-top:18px;">
        <p style="margin:0;font-size:11px;color:#5a5652;">${t.email_order_id} <code style="font-family:${FONT_MONO};">${order.id}</code></p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
  }
}
