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

// Brandsurface wordmark logo, rendered in the brand orange
function logo(size = 26) {
  return `<span style="font-family:${FONT_SANS};font-size:${size}px;font-weight:800;letter-spacing:-0.02em;color:#f1562e;">brandsurface</span>`
}

function sectionLabel(text) {
  return `<p style="margin:0 0 12px;font-family:${FONT_MONO};font-size:11px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:#7a7672;">${text}</p>`
}

// ── Customer email: auto-sends to Brandsurface after a delay ──
export function buildCustomerConfirmEmail({ order, baseUrl, delayMinutes = 10 }) {
  const editUrl = `${baseUrl}/?edit=${order.id}`

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
      const format = p.format ? ` — ${escapeHtml(p.format)}` : ''
      const meta = p.antal != null ? `${escapeHtml(String(p.antal))} pcs` : escapeHtml(p.note || 'Requested')
      return productCard(`${escapeHtml(p.type)}${format}`, meta)
    })
    .join('')

  const andetBlock = order.andet
    ? `<tr><td style="padding-top:8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e1d1a;border:1px solid #4a4640;border-radius:14px;">
          <tr><td style="padding:14px 18px;">
            ${sectionLabel('Other')}
            <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.5;">${escapeHtml(order.andet)}</p>
          </td></tr>
        </table>
      </td></tr>`
    : ''

  const altAddrBlock = order.alt_active && order.alt_gade
    ? `<div style="margin-top:14px;padding-top:14px;border-top:1px solid #4a4640;">
        <p style="margin:0 0 5px;font-family:${FONT_MONO};font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">Alternative delivery address</p>
        <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.6;">
          ${escapeHtml(order.alt_gade)}, ${escapeHtml(order.alt_postnr || '')} ${escapeHtml(order.alt_by || '')}
          ${order.alt_att ? `<br>Attn: ${escapeHtml(order.alt_att)}` : ''}
          ${order.alt_tlf ? `<br>Phone: ${escapeHtml(order.alt_tlf)}` : ''}
        </p>
      </div>`
    : ''

  const revisionNote = order.revision > 0
    ? `<tr><td style="padding-bottom:24px;">
        <div style="padding:12px 16px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.3);border-radius:12px;color:#f87171;font-size:13px;line-height:1.5;">
          This is revision ${order.revision} of your order — the previous version was cancelled.
        </div>
      </td></tr>`
    : ''

  return {
    subject: `Confirm your order — ${order.butiksnavn}${order.revision > 0 ? ` (revision ${order.revision})` : ''}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Confirm your order</title>
  ${FONT_LINK}
</head>
<body style="margin:0;padding:0;background:#0e0a00;font-family:${FONT_SANS};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0a00;background:linear-gradient(160deg,#2a2820 0%,#0e0a00 55%);">
  <tr><td align="center" style="padding:44px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <tr><td style="padding-bottom:32px;">${logo(26)}</td></tr>

      <tr><td style="padding-bottom:8px;">
        <h1 style="margin:0;font-size:30px;font-weight:800;letter-spacing:-0.03em;color:#f1562e;line-height:1.05;">Review your order</h1>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <p style="margin:0;font-size:15px;color:#b8b4ae;line-height:1.6;font-weight:300;">
          Hi ${escapeHtml(order.navn)} — your order for <strong style="color:#f0ede8;font-weight:600;">${escapeHtml(order.butiksnavn)}</strong> is ready for approval.
        </p>
      </td></tr>

      ${revisionNote}

      <tr><td style="padding-bottom:28px;">
        ${sectionLabel('Products')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${produkterRows || productCard('No products', '')}
          ${andetBlock}
        </table>
      </td></tr>

      <tr><td style="padding-bottom:32px;">
        ${sectionLabel('Delivery')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e1d1a;border:1px solid #4a4640;border-radius:16px;">
          <tr><td style="padding:16px 18px;">
            <p style="margin:0 0 5px;font-family:${FONT_MONO};font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">${order.addr_type === 'privat' ? 'Private address' : 'Business address'}</p>
            <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.6;">
              ${escapeHtml(order.gade || '')}, ${escapeHtml(order.postnr || '')} ${escapeHtml(order.by || '')}${order.land ? `, ${escapeHtml(order.land)}` : ''}
              ${order.att ? `<br>Attn: ${escapeHtml(order.att)}` : ''}
              ${order.tlf ? `<br>Phone: ${escapeHtml(order.tlf)}` : ''}
            </p>
            ${altAddrBlock}
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding-bottom:24px;">
        <div style="background:#1e1d1a;border:1px solid #4a4640;border-radius:14px;padding:16px 18px;">
          <p style="margin:0 0 14px;font-size:14px;color:#b8b4ae;line-height:1.6;">
            Your order will automatically be sent to Brandsurface in about <strong style="color:#f0ede8;">${delayMinutes} minutes</strong>. You don't need to do anything.
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#b8b4ae;line-height:1.6;">
            Need to change something? Edit your order below — we'll send an updated confirmation and the timer restarts.
          </p>
          <a href="${editUrl}"
             style="display:inline-block;padding:13px 26px;background:#f1562e;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px;">
            Edit order
          </a>
        </div>
      </td></tr>

      <tr><td style="border-top:1px solid #2e2e2e;padding-top:20px;">
        <p style="margin:0;font-size:11px;color:#5a5652;line-height:1.6;">
          This email was sent automatically by the Brandsurface ordering system.<br>
          Order ID: <code style="color:#7a7672;font-family:${FONT_MONO};">${order.id}</code>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
  }
}

// ── Email to Brandsurface when customer has approved ──────────
export function buildBrandsurfaceEmail({ order }) {
  const produkterList = (order.produkter || [])
    .map(p => {
      const format = p.format ? ` — ${escapeHtml(p.format)}` : ''
      const qtyText = p.antal != null ? `${escapeHtml(String(p.antal))} pcs` : escapeHtml(p.note || 'Requested')
      return `<li style="margin-bottom:6px;color:#f0ede8;font-size:14px;">${escapeHtml(p.type)}${format}: <strong>${qtyText}</strong></li>`
    })
    .join('')

  return {
    subject: `New approved order — ${order.butiksnavn}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>${FONT_LINK}</head>
<body style="margin:0;padding:0;background:#0e0a00;font-family:${FONT_SANS};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0a00;background:linear-gradient(160deg,#2a2820 0%,#0e0a00 55%);">
  <tr><td align="center" style="padding:44px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <tr><td style="padding-bottom:28px;">${logo(22)}</td></tr>

      <tr><td style="padding-bottom:6px;">
        <h1 style="margin:0;color:#f1562e;font-size:26px;font-weight:800;letter-spacing:-0.02em;">New approved order</h1>
      </td></tr>
      <tr><td style="padding-bottom:26px;">
        <p style="margin:0;color:#b8b4ae;font-size:14px;line-height:1.6;">The customer has approved their order. Ready for production.</p>
      </td></tr>

      <tr><td style="padding-bottom:20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e1d1a;border:1px solid #4a4640;border-radius:16px;">
          <tr><td style="padding:18px;">
            <p style="margin:0 0 8px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">Campaign:</strong> ${escapeHtml(order.butiksnavn)}</p>
            <p style="margin:0 0 8px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">Orderer:</strong> ${escapeHtml(order.navn)}</p>
            <p style="margin:0 0 8px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">Email:</strong> ${escapeHtml(order.email)}</p>
            ${order.revision > 0 ? `<p style="margin:0;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">Revision:</strong> ${order.revision}</p>` : ''}
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding-bottom:20px;">
        ${sectionLabel('Products')}
        <ul style="padding-left:20px;margin:0;">${produkterList}</ul>
        ${order.andet ? `<p style="margin:12px 0 0;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">Other:</strong> ${escapeHtml(order.andet)}</p>` : ''}
      </td></tr>

      <tr><td style="padding-bottom:20px;">
        ${sectionLabel(`Delivery (${order.addr_type === 'privat' ? 'Private' : 'Business'})`)}
        <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.6;">
          ${escapeHtml(order.gade || '')}, ${escapeHtml(order.postnr || '')} ${escapeHtml(order.by || '')}${order.land ? `, ${escapeHtml(order.land)}` : ''}
          ${order.att ? `<br>Attn: ${escapeHtml(order.att)}` : ''}
          ${order.tlf ? `<br>Phone: ${escapeHtml(order.tlf)}` : ''}
        </p>
      </td></tr>

      ${order.alt_active && order.alt_gade ? `<tr><td style="padding-bottom:20px;">
        ${sectionLabel('Alternative delivery address')}
        <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.6;">
          ${escapeHtml(order.alt_gade)}, ${escapeHtml(order.alt_postnr || '')} ${escapeHtml(order.alt_by || '')}
          ${order.alt_att ? `<br>Attn: ${escapeHtml(order.alt_att)}` : ''}
          ${order.alt_tlf ? `<br>Phone: ${escapeHtml(order.alt_tlf)}` : ''}
        </p>
      </td></tr>` : ''}

      ${order.konsulent_navn ? `<tr><td style="padding-bottom:20px;">
        ${sectionLabel('Sales consultant')}
        <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.6;">
          ${escapeHtml(order.konsulent_navn)}
          ${order.konsulent_tlf ? `<br>Phone: ${escapeHtml(order.konsulent_tlf)}` : ''}
          ${order.konsulent_email ? `<br>Email: ${escapeHtml(order.konsulent_email)}` : ''}
        </p>
      </td></tr>` : ''}

      <tr><td style="border-top:1px solid #2e2e2e;padding-top:18px;">
        <p style="margin:0;font-size:11px;color:#5a5652;">Order ID: <code style="font-family:${FONT_MONO};">${order.id}</code></p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
  }
}
