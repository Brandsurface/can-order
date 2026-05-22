import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { buildBrandsurfaceEmail } from '@/lib/emails'

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
    const fromAddress = process.env.RESEND_FROM || 'onboarding@resend.dev'
    if (order.scheduled_email_id) {
      try { await resend.emails.cancel(order.scheduled_email_id) } catch (e) { console.warn('Kunne ikke annullere planlagt mail:', e?.message) }
    }
    const { subject, html } = buildBrandsurfaceEmail({ order })
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
