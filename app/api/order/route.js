import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { buildCustomerConfirmEmail, buildBrandsurfaceEmail } from '@/lib/emails'

export const dynamic = 'force-dynamic'

async function getSettings() {
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['brandsurface_email', 'confirm_delay_minutes'])
  const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  const delay = parseInt(map.confirm_delay_minutes, 10)
  return {
    recipient: (map.brandsurface_email || process.env.BRANDSURFACE_EMAIL || '').trim(),
    delayMinutes: Number.isFinite(delay) && delay >= 0 ? delay : 10,
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    // Validering
    if (!body.butiksnavn || !body.navn || !body.email) {
      return Response.json({ error: 'Manglende påkrævede felter' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return Response.json({ error: 'Ugyldig e-mailadresse' }, { status: 400 })
    }

    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

    // Bestem revision + annullér tidligere planlagt afsendelse ved redigering
    let revision = 0
    if (body.previous_id) {
      const { data: prev } = await supabase
        .from('orders')
        .select('revision, scheduled_email_id')
        .eq('id', body.previous_id)
        .single()
      if (prev) {
        revision = (prev.revision || 0) + 1
        if (resend && prev.scheduled_email_id) {
          try { await resend.emails.cancel(prev.scheduled_email_id) } catch (e) { console.warn('Kunne ikke annullere tidligere planlagt mail:', e?.message) }
        }
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', body.previous_id)
      }
    }

    // Gem ordre i Supabase
    const { data: order, error: dbError } = await supabase
      .from('orders')
      .insert({
        butiksnavn:      body.butiksnavn,
        navn:            body.navn,
        email:           body.email,
        produkter:       body.produkter || [],
        andet:           body.andet || null,
        addr_type:       body.addr_type || 'butik',
        gade:            body.gade,
        postnr:          body.postnr,
        by:              body.by,
        att:             body.att || null,
        tlf:             body.tlf || null,
        alt_active:      body.alt_active || false,
        alt_gade:        body.alt_gade || null,
        alt_postnr:      body.alt_postnr || null,
        alt_by:          body.alt_by || null,
        alt_att:         body.alt_att || null,
        alt_tlf:         body.alt_tlf || null,
        konsulent_navn:  body.konsulent_navn || null,
        konsulent_tlf:   body.konsulent_tlf || null,
        konsulent_email: body.konsulent_email || null,
        status:          'pending',
        revision,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Supabase INSERT fejl:', dbError)
      return Response.json({ error: 'Database fejl' }, { status: 500 })
    }

    if (!resend) {
      console.error('RESEND_API_KEY mangler')
      return Response.json({ error: 'Mail-service ikke konfigureret' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
    const fromAddress = process.env.RESEND_FROM || 'onboarding@resend.dev'
    const { recipient, delayMinutes } = await getSettings()

    // 1) Send ordrebekræftelse til kunden med det samme
    const { subject, html } = buildCustomerConfirmEmail({ order, baseUrl, delayMinutes })
    const { error: mailError } = await resend.emails.send({
      from: `Brandsurface <${fromAddress}>`,
      to: order.email,
      subject,
      html,
    })
    if (mailError) {
      console.error('Resend fejl (kundebekræftelse):', mailError)
      return Response.json({ success: true, orderId: order.id, warning: 'Ordre gemt, men bekræftelsesmail kunne ikke sendes' })
    }

    // 2) Planlæg ordremailen til Brandsurface efter forsinkelsen
    if (recipient) {
      const sendAfter = new Date(Date.now() + delayMinutes * 60 * 1000)
      try {
        const bs = buildBrandsurfaceEmail({ order })
        const { data: scheduled, error: schedErr } = await resend.emails.send({
          from: `Brandsurface Ordre <${fromAddress}>`,
          to: recipient,
          replyTo: order.email,
          scheduledAt: sendAfter.toISOString(),
          subject: bs.subject,
          html: bs.html,
        })
        if (schedErr) {
          console.error('Resend planlægning fejl:', schedErr)
        } else {
          await supabase
            .from('orders')
            .update({ send_after: sendAfter.toISOString(), scheduled_email_id: scheduled?.id || null })
            .eq('id', order.id)
        }
      } catch (e) {
        console.error('Planlægning af Brandsurface-mail fejlede:', e?.message)
      }
    } else {
      console.warn('Ingen Brandsurface-modtager konfigureret — ingen ordremail planlagt')
    }

    return Response.json({ success: true, orderId: order.id, delayMinutes })

  } catch (err) {
    console.error('Uventet fejl i /api/order:', err)
    return Response.json({ error: 'Server fejl: ' + err.message }, { status: 500 })
  }
}
