import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { buildBrandsurfaceEmail } from '@/lib/emails'

// Signed (7-day) download links for an order's uploaded files
export async function buildUploadLinks(order) {
  const ups = Array.isArray(order?.uploads) ? order.uploads : []
  const links = []
  for (const u of ups) {
    try {
      const { data } = await supabase.storage.from('order-uploads').createSignedUrl(u.path, 60 * 60 * 24 * 7)
      if (data?.signedUrl) links.push({ name: u.name, url: data.signedUrl })
    } catch (e) {
      console.warn('Kunne ikke lave download-link:', e?.message)
    }
  }
  return links
}

// Mark an order confirmed and send it to Brandsurface now.
// Cancels any pending scheduled send first so it can't fire twice.
// Never throws on a mail failure — the order is still confirmed.
export async function dispatchToBrandsurface(order) {
  await supabase.from('orders').update({ status: 'confirmed' }).eq('id', order.id)
  try {
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'brandsurface_email')
      .single()
    const recipient = (setting?.value || process.env.BRANDSURFACE_EMAIL || '').trim()
    if (!process.env.RESEND_API_KEY || !recipient) {
      console.warn('RESEND_API_KEY eller modtager mangler — ingen mail sendt til Brandsurface')
      return
    }
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromAddress = process.env.RESEND_FROM || 'no-reply@brandsurface.dk'
    if (order.scheduled_email_id) {
      try { await resend.emails.cancel(order.scheduled_email_id) } catch (e) { console.warn('Kunne ikke annullere planlagt mail:', e?.message) }
    }
    const uploadLinks = await buildUploadLinks(order)
    const { subject, html } = buildBrandsurfaceEmail({ order: { ...order, uploadLinks } })
    await resend.emails.send({
      from: `Brandsurface Ordre <${fromAddress}>`,
      to: recipient,
      replyTo: order.email,
      subject,
      html,
    })
  } catch (e) {
    console.error('Brandsurface dispatch mail-fejl:', e?.message)
  }
}

// Cancel a pending scheduled Brandsurface send (used when deleting an order)
export async function cancelScheduledSend(order) {
  if (order?.scheduled_email_id && process.env.RESEND_API_KEY) {
    try { await new Resend(process.env.RESEND_API_KEY).emails.cancel(order.scheduled_email_id) } catch (e) { console.warn('Kunne ikke annullere planlagt mail:', e?.message) }
  }
}
