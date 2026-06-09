import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { buildConfirmEmail } from '@/lib/emails'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const body = await request.json()

    // Validering
    if (!body.butiksnavn || !body.navn || !body.email) {
      return Response.json({ error: 'Manglende påkrævede felter' }, { status: 400 })
    }
    if (!body.email.includes('@')) {
      return Response.json({ error: 'Ugyldig e-mailadresse' }, { status: 400 })
    }

    // Gem ordre i Supabase
    const { data: order, error: dbError } = await supabase
      .from('orders')
      .insert({
        butiksnavn:       body.butiksnavn,
        navn:             body.navn,
        email:            body.email,
        produkter:        body.produkter || [],
        andet:            body.andet || null,
        addr_type:        body.addr_type,
        gade:             body.gade,
        postnr:           body.postnr,
        by:               body.by,
        att:              body.att || null,
        tlf:              body.tlf || null,
        alt_active:       body.alt_active || false,
        alt_gade:         body.alt_gade || null,
        alt_postnr:       body.alt_postnr || null,
        alt_by:           body.alt_by || null,
        alt_att:          body.alt_att || null,
        alt_tlf:          body.alt_tlf || null,
        konsulent_navn:   body.konsulent_navn || null,
        konsulent_tlf:    body.konsulent_tlf || null,
        konsulent_email:  body.konsulent_email || null,
        status:           'pending',
        revision:         0,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Supabase INSERT fejl:', dbError)
      return Response.json({ error: 'Database fejl' }, { status: 500 })
    }

    // Byg og send bekræftelsesmail til kunden
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    const { subject, html } = buildConfirmEmail({ order, baseUrl })

    const { error: mailError } = await resend.emails.send({
      from:    'Brand Surface <ordre@brandsurface.dk>',
      to:      order.email,
      subject,
      html,
    })

    if (mailError) {
      console.error('Resend fejl:', mailError)
      // Vi returnerer stadig success — ordren er gemt, mailen kan sendes igen
    }

    return Response.json({ success: true, orderId: order.id })

  } catch (err) {
    console.error('Uventet fejl i /api/order:', err)
    return Response.json({ error: 'Server fejl' }, { status: 500 })
  }
}
