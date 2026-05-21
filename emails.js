export function buildConfirmEmail({ order, baseUrl }) {
  const confirmUrl = `${baseUrl}/api/confirm?id=${order.id}`
  const cancelUrl  = `${baseUrl}/api/cancel?id=${order.id}`

  const produkterHtml = order.produkter
    .map(p => {
      const format = p.format ? ` — ${p.format}` : ''
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2e2e2e;color:#f0ede8;">${p.type}${format}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2e2e2e;color:#b8b4ae;text-align:right;">${p.antal} stk</td>
      </tr>`
    })
    .join('')

  const andetHtml = order.andet
    ? `<p style="margin:0 0 8px;color:#b8b4ae;font-size:13px;"><strong style="color:#f0ede8;">Andet:</strong> ${order.andet}</p>`
    : ''

  const altAddrHtml = order.alt_active && order.alt_gade
    ? `<p style="margin:0 0 4px;color:#b8b4ae;font-size:13px;">
        <strong style="color:#f0ede8;">Alternativ leveringsadresse:</strong><br>
        ${order.alt_gade}, ${order.alt_postnr} ${order.alt_by}
        ${order.alt_att ? `<br>Att: ${order.alt_att}` : ''}
      </p>`
    : ''

  const revisionNote = order.revision > 0
    ? `<p style="margin:0 0 20px;padding:10px 14px;background:#2a0700;border:1px solid #5a1500;border-radius:8px;color:#f87171;font-size:13px;">
        Dette er revision ${order.revision} af din bestilling.
      </p>`
    : ''

  return {
    subject: `Bekræft din bestilling — ${order.butiksnavn}${order.revision > 0 ? ` (rev. ${order.revision})` : ''}`,
    html: `<!DOCTYPE html>
<html lang="da">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0e0a00;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0a00;min-height:100vh;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

      <!-- Logo -->
      <tr><td style="padding-bottom:32px;">
        <span style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#f0ede8;">brand<span style="color:#f1562e;">surface</span></span>
      </td></tr>

      <!-- Heading -->
      <tr><td style="padding-bottom:8px;">
        <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.02em;color:#f1562e;">Gennemgå din bestilling</h1>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <p style="margin:0;font-size:15px;color:#b8b4ae;line-height:1.6;">
          Hej ${order.navn} — din bestilling fra <strong style="color:#f0ede8;">${order.butiksnavn}</strong> er klar til godkendelse.<br>
          Klik <strong style="color:#4ade80;">Godkend</strong> for at sende den videre, eller <strong style="color:#f87171;">Fortryd</strong> for at gå tilbage og rette.
        </p>
      </td></tr>

      ${revisionNote}

      <!-- Produkter -->
      <tr><td style="padding-bottom:20px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">Produkter</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1d1a;border:1px solid #4a4640;border-radius:12px;overflow:hidden;">
          ${produkterHtml}
        </table>
        ${andetHtml}
      </td></tr>

      <!-- Levering -->
      <tr><td style="padding-bottom:28px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a7672;">Levering</p>
        <div style="background:#1e1d1a;border:1px solid #4a4640;border-radius:12px;padding:16px 18px;">
          <p style="margin:0 0 4px;color:#b8b4ae;font-size:13px;">
            <strong style="color:#f0ede8;">${order.addr_type === 'privat' ? 'Privat-adresse' : 'Butiks-adresse'}:</strong>
            ${order.gade}, ${order.postnr} ${order.by}
            ${order.att ? `<br>Att: ${order.att}` : ''}
            ${order.tlf ? `<br>Tlf: ${order.tlf}` : ''}
          </p>
          ${altAddrHtml}
        </div>
      </td></tr>

      <!-- CTA knapper -->
      <tr><td style="padding-bottom:32px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:12px;">
              <a href="${confirmUrl}"
                 style="display:inline-block;padding:14px 28px;background:#4ade80;color:#0a2010;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;letter-spacing:-0.01em;">
                Godkend bestilling
              </a>
            </td>
            <td>
              <a href="${cancelUrl}"
                 style="display:inline-block;padding:14px 28px;background:#1e1d1a;color:#f87171;font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;border:1px solid #5a2020;letter-spacing:-0.01em;">
                Fortryd &amp; ret
              </a>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="border-top:1px solid #2e2e2e;padding-top:20px;">
        <p style="margin:0;font-size:12px;color:#5a5652;line-height:1.6;">
          Denne mail er sendt automatisk af Brandsurface bestillingssystemet.<br>
          Ordre-ID: <code style="color:#7a7672;">${order.id}</code>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
  }
}

export function buildBrandsurfaceEmail({ order }) {
  const produkterHtml = order.produkter
    .map(p => {
      const format = p.format ? ` — ${p.format}` : ''
      return `<li style="margin-bottom:4px;color:#f0ede8;">${p.type}${format}: <strong>${p.antal} stk</strong></li>`
    })
    .join('')

  return {
    subject: `Ny godkendt ordre — ${order.butiksnavn}`,
    html: `<!DOCTYPE html>
<html lang="da">
<body style="margin:0;padding:32px;background:#0e0a00;font-family:'Helvetica Neue',Arial,sans-serif;color:#f0ede8;">
  <h1 style="color:#f1562e;margin:0 0 8px;">Ny godkendt ordre</h1>
  <p style="color:#b8b4ae;margin:0 0 24px;">Ordren er godkendt af kunden og klar til produktion.</p>

  <p><strong>Butik:</strong> ${order.butiksnavn}</p>
  <p><strong>Bestiller:</strong> ${order.navn} — ${order.email}</p>
  <p><strong>Revision:</strong> ${order.revision}</p>

  <h3 style="color:#b8b4ae;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:20px 0 8px;">Produkter</h3>
  <ul style="padding-left:20px;margin:0 0 16px;">${produkterHtml}</ul>
  ${order.andet ? `<p><strong>Andet:</strong> ${order.andet}</p>` : ''}

  <h3 style="color:#b8b4ae;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:20px 0 8px;">Levering</h3>
  <p style="margin:0;">${order.gade}, ${order.postnr} ${order.by}${order.att ? ` — Att: ${order.att}` : ''}</p>
  ${order.alt_active && order.alt_gade ? `<p style="margin:4px 0 0;color:#b8b4ae;">Alt. adresse: ${order.alt_gade}, ${order.alt_postnr} ${order.alt_by}</p>` : ''}

  ${order.konsulent_navn ? `
  <h3 style="color:#b8b4ae;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:20px 0 8px;">Salgskonsulent</h3>
  <p style="margin:0;">${order.konsulent_navn}${order.konsulent_tlf ? ` — ${order.konsulent_tlf}` : ''}${order.konsulent_email ? ` — ${order.konsulent_email}` : ''}</p>
  ` : ''}

  <p style="margin:24px 0 0;font-size:12px;color:#5a5652;">Ordre-ID: ${order.id}</p>
</body></html>`
  }
}
