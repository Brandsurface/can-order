import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { buildCustomerConfirmEmail } from '@/lib/emails'

export const dynamic = 'force-dynamic'

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

    // Bestem revision
    let revision = 0
    if (body.previous_id) {
      const { data: prev } = await supabase
        .from('orders')
        .select('revision')
        .eq('id', body.previous_id)
        .single()
      if (prev) revision = (prev.revision || 0) + 1
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

    // Send bekræftelsesmail til kunden
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY mangler')
      return Response.json({ error: 'Mail-service ikke konfigureret' }, { status: 500 })
    }
    const resend = new Resend(process.env.RESEND_API_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
    const fromAddress = process.env.RESEND_FROM || 'onboarding@resend.dev'

    const { subject, html } = buildCustomerConfirmEmail({ order, baseUrl })

    const { error: mailError } = await resend.emails.send({
      from:    `Brandsurface <${fromAddress}>`,
      to:      order.email,
      subject,
      html,
    })

    if (mailError) {
      console.error('Resend fejl:', mailError)
      // Ordre er gemt — vi returnerer success men advarer
      return Response.json({
        success: true,
        orderId: order.id,
        warning: 'Ordre gemt, men bekræftelsesmail kunne ikke sendes'
      })
    }

    return Response.json({ success: true, orderId: order.id })

  } catch (err) {
    console.error('Uventet fejl i /api/order:', err)
    return Response.json({ error: 'Server fejl: ' + err.message }, { status: 500 })
  }
}
