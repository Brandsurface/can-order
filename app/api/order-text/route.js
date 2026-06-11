import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function row(label, value) {
  if (!value && value !== 0) return ''
  return `${label}: ${String(value).trim()}\n`
}

function section(title, lines) {
  const body = lines.filter(Boolean).join('')
  if (!body) return ''
  return `\n${title}\n${'─'.repeat(title.length)}\n${body}`
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return new Response('Missing id', { status: 400 })

  const { data: o, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !o) return new Response('Order not found', { status: 404 })

  const deadline = o.delivery_date
    ? new Date(o.delivery_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  const lines = [
    `BRAND SURFACE — CAN ORDER BRIEF\n${'═'.repeat(32)}`,
    `\nOrder ID: ${o.id}`,
    `Submitted: ${new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    o.revision > 0 ? `Revision: ${o.revision}` : '',

    section('ORDERER', [
      row('Campaign / Project', o.butiksnavn),
      row('Name', o.navn),
      row('Email', o.email),
      row('Deadline', deadline),
    ]),

    section('CAN BRIEF', [
      row('Brand', o.brand),
      row('Variant', o.variant),
      row('Size', o.size),
      row('Region', o.region),
      row('Label Type', o.label_type),
      row('Finish', o.finish),
      row('Cutterguide', o.cutterguide),
    ]),

    section('PRODUCTION', [
      row('Material No. (old)', o.material_old),
      row('Material No. (new)', o.material_new),
      row('EAN', o.ean),
      String(o.region || '').toLowerCase() !== 'border' ? row('Pantmærke', o.pantmaerke ? 'Yes' : 'No') : '',
      row('Ingredients / Nutrition', o.ingredients),
    ]),

    section('ARTWORK', [
      o.artwork_help ? 'Artwork help: Requested\n' : '',
      o.smash_link   ? 'Smash link: Requested\n' : '',
      o.andet        ? row('Notes', o.andet) : '',
    ]),

    o.uploads?.length
      ? section('FILES', o.uploads.map(f => `- ${f.name}\n`))
      : '',

    `\n${'─'.repeat(32)}\nBrand Surface | brandsurface.dk\n`,
  ]

  const text = lines.filter(Boolean).join('\n')

  const campaign = (o.butiksnavn || 'order').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const filename = `bs-order-${campaign}-${o.id.slice(0, 8)}.txt`

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
