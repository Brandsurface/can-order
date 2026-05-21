import { supabase } from '@/lib/supabase'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return Response.json({ error: 'Manglende id' }, { status: 400 })
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) {
    return Response.json({ error: 'Ikke fundet' }, { status: 404 })
  }

  // Returner kun de felter der er nødvendige for at genopfylde formularen
  // (vi eksponerer ikke interne felter som status, revision, etc.)
  return Response.json({
    butiksnavn:       order.butiksnavn,
    navn:             order.navn,
    email:            order.email,
    produkter:        order.produkter,
    andet:            order.andet,
    addr_type:        order.addr_type,
    gade:             order.gade,
    postnr:           order.postnr,
    by:               order.by,
    att:              order.att,
    tlf:              order.tlf,
    alt_active:       order.alt_active,
    alt_gade:         order.alt_gade,
    alt_postnr:       order.alt_postnr,
    alt_by:           order.alt_by,
    alt_att:          order.alt_att,
    alt_tlf:          order.alt_tlf,
    konsulent_navn:   order.konsulent_navn,
    konsulent_tlf:    order.konsulent_tlf,
    konsulent_email:  order.konsulent_email,
    revision:         order.revision,
  })
}
