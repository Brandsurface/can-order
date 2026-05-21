// ── Mail template helpers ─────────────────────────────────────

function escapeHtml(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ── Customer email with Approve / Cancel buttons ──────────────
export function buildCustomerConfirmEmail({ order, baseUrl }) {
  const confirmUrl = `${baseUrl}/api/confirm?id=${order.id}`
  const cancelUrl  = `${baseUrl}/api/cancel?id=${order.id}`

  const produkterRows = (order.produkter || [])
    .map(p => {
      const format = p.format ? ` — ${escapeHtml(p.format)}` : ''
      const qtyCell = p.antal != null ? `${escapeHtml(String(p.antal))} pcs` : 'Help requested'
      return `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #2e2e2e;color:#f0ede8;font-size:14px;">${escapeHtml(p.type)}${format}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #2e2e2e;color:#b8b4ae;text-align:right;font-size:14px;">${qtyCell}</td>
      </tr>`
    })
    .join('')

  const andetBlock = order.andet
    ? `<div style="margin-top:14px;padding:14px 16px;background:#1e1d1a;border:1px solid #4a4640;border-radius:10px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#7a7672;">Other</p>
        <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.5;">${escapeHtml(order.andet)}</p>
      </div>`
    : ''

  const altAddrBlock = order.alt_active && order.alt_gade
    ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #4a4640;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#7a7672;">Alternative delivery address</p>
        <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.5;">
          ${escapeHtml(order.alt_gade)}, ${escapeHtml(order.alt_postnr || '')} ${escapeHtml(order.alt_by || '')}
          ${order.alt_att ? `<br>Attn: ${escapeHtml(order.alt_att)}` : ''}
          ${order.alt_tlf ? `<br>Phone: ${escapeHtml(order.alt_tlf)}` : ''}
        </p>
      </div>`
    : ''

  const revisionNote = order.revision > 0
    ? `<div style="margin-bottom:24px;padding:12px 16px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.3);border-radius:10px;color:#f87171;font-size:13px;">
        This is revision ${order.revision} of your order — the previous version was cancelled.
      </div>`
    : ''

  return {
    subject: `Confirm your order — ${order.butiksnavn}${order.revision > 0 ? ` (revision ${order.revision})` : ''}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Confirm your order</title>
</head>
<body style="margin:0;padding:0;background:#0e0a00;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0a00;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

      <tr><td style="padding-bottom:36px;">
        <span style="font-size:24px;font-weight:800;letter-spacing:-0.02em;color:#f0ede8;">brand<span style="color:#f1562e;">surface</span></span>
      </td></tr>

      <tr><td style="padding-bottom:8px;">
        <h1 style="margin:0;font-size:30px;font-weight:800;letter-spacing:-0.02em;color:#f1562e;line-height:1.1;">Review your order</h1>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <p style="margin:0;font-size:15px;color:#b8b4ae;line-height:1.6;">
          Hi ${escapeHtml(order.navn)} — your order for <strong style="color:#f0ede8;">${escapeHtml(order.butiksnavn)}</strong> is ready for approval.
        </p>
      </td></tr>

      ${revisionNote}

      <tr><td style="padding-bottom:24px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">Products</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1d1a;border:1px solid #4a4640;border-radius:12px;overflow:hidden;">
          ${produkterRows || '<tr><td style="padding:14px;color:#7a7672;font-size:13px;">No products</td></tr>'}
        </table>
        ${andetBlock}
      </td></tr>

      <tr><td style="padding-bottom:32px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">Delivery</p>
        <div style="background:#1e1d1a;border:1px solid #4a4640;border-radius:12px;padding:16px 18px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#7a7672;">${order.addr_type === 'privat' ? 'Private address' : 'Business address'}</p>
          <p style="margin:0;color:#b8b4ae;font-size:13px;line-height:1.6;">
            ${escapeHtml(order.gade || '')}, ${escapeHtml(order.postnr || '')} ${escapeHtml(order.by || '')}${order.land ? `, ${escapeHtml(order.land)}` : ''}
            ${order.att ? `<br>Attn: ${escapeHtml(order.att)}` : ''}
            ${order.tlf ? `<br>Phone: ${escapeHtml(order.tlf)}` : ''}
          </p>
          ${altAddrBlock}
        </div>
      </td></tr>

      <tr><td style="padding-bottom:24px;">
        <p style="margin:0 0 16px;font-size:14px;color:#b8b4ae;line-height:1.6;">
          Click <strong style="color:#4ade80;">Approve</strong> to send the order to Brandsurface, or <strong style="color:#f87171;">Cancel</strong> to go back and make changes.
        </p>
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:10px;">
              <a href="${confirmUrl}"
                 style="display:inline-block;padding:14px 28px;background:#4ade80;color:#0a2010;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;letter-spacing:-0.01em;">
                ✓ Approve order
              </a>
            </td>
            <td>
              <a href="${cancelUrl}"
                 style="display:inline-block;padding:14px 28px;background:#1e1d1a;color:#f87171;font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;border:1px solid #5a2020;letter-spacing:-0.01em;">
                Cancel &amp; edit
              </a>
            </td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="border-top:1px solid #2e2e2e;padding-top:20px;">
        <p style="margin:0;font-size:11px;color:#5a5652;line-height:1.6;">
          This email was sent automatically by the Brandsurface ordering system.<br>
          Order ID: <code style="color:#7a7672;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${order.id}</code>
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
      const qtyText = p.antal != null ? `${escapeHtml(String(p.antal))} pcs` : 'Help requested'
      return `<li style="margin-bottom:6px;color:#f0ede8;font-size:14px;">${escapeHtml(p.type)}${format}: <strong>${qtyText}</strong></li>`
    })
    .join('')

  return {
    subject: `New approved order — ${order.butiksnavn}`,
    html: `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:32px;background:#0e0a00;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f0ede8;">
<div style="max-width:600px;margin:0 auto;">

  <h1 style="color:#f1562e;margin:0 0 8px;font-size:24px;font-weight:800;letter-spacing:-0.02em;">New approved order</h1>
  <p style="color:#b8b4ae;margin:0 0 28px;font-size:14px;">The customer has approved their order. Ready for production.</p>

  <div style="background:#1e1d1a;border:1px solid #4a4640;border-radius:12px;padding:18px;margin-bottom:20px;">
    <p style="margin:0 0 8px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">Campaign:</strong> ${escapeHtml(order.butiksnavn)}</p>
    <p style="margin:0 0 8px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">Orderer:</strong> ${escapeHtml(order.navn)}</p>
    <p style="margin:0 0 8px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">Email:</strong> ${escapeHtml(order.email)}</p>
    ${order.revision > 0 ? `<p style="margin:0;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">Revision:</strong> ${order.revision}</p>` : ''}
  </div>

  <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">Products</p>
  <ul style="padding-left:20px;margin:0 0 20px;">${produkterList}</ul>
  ${order.andet ? `<p style="margin:0 0 20px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">Other:</strong> ${escapeHtml(order.andet)}</p>` : ''}

  <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">Delivery (${order.addr_type === 'privat' ? 'Private' : 'Business'})</p>
  <p style="margin:0 0 20px;color:#b8b4ae;font-size:13px;line-height:1.6;">
    ${escapeHtml(order.gade || '')}, ${escapeHtml(order.postnr || '')} ${escapeHtml(order.by || '')}${order.land ? `, ${escapeHtml(order.land)}` : ''}
    ${order.att ? `<br>Attn: ${escapeHtml(order.att)}` : ''}
    ${order.tlf ? `<br>Phone: ${escapeHtml(order.tlf)}` : ''}
  </p>

  ${order.alt_active && order.alt_gade ? `
    <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">Alternative delivery address</p>
    <p style="margin:0 0 20px;color:#b8b4ae;font-size:13px;line-height:1.6;">
      ${escapeHtml(order.alt_gade)}, ${escapeHtml(order.alt_postnr || '')} ${escapeHtml(order.alt_by || '')}
      ${order.alt_att ? `<br>Attn: ${escapeHtml(order.alt_att)}` : ''}
      ${order.alt_tlf ? `<br>Phone: ${escapeHtml(order.alt_tlf)}` : ''}
    </p>
  ` : ''}

  ${order.konsulent_navn ? `
    <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">Sales consultant</p>
    <p style="margin:0 0 20px;color:#b8b4ae;font-size:13px;line-height:1.6;">
      ${escapeHtml(order.konsulent_navn)}
      ${order.konsulent_tlf ? `<br>Phone: ${escapeHtml(order.konsulent_tlf)}` : ''}
      ${order.konsulent_email ? `<br>Email: ${escapeHtml(order.konsulent_email)}` : ''}
    </p>
  ` : ''}

  <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #2e2e2e;font-size:11px;color:#5a5652;">
    Order ID: <code style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${order.id}</code>
  </p>

</div>
</body>
</html>`,
  }
}
