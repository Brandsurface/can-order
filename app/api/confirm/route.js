import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { buildBrandsurfaceEmail } from '@/lib/emails'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.redirect(`${origin}/godkendt?error=missing-id`)
  }

  // Hent ordren
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.redirect(`${origin}/godkendt?error=not-found`)
  }

  if (order.status === 'confirmed') {
    return NextResponse.redirect(`${origin}/godkendt?already=1`)
  }

  if (order.status === 'cancelled') {
    return NextResponse.redirect(`${origin}/godkendt?error=cancelled`)
  }

  // Opdater til confirmed
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'confirmed' })
    .eq('id', id)

  if (updateError) {
    console.error('Supabase UPDATE fejl:', updateError)
    return NextResponse.redirect(`${origin}/godkendt?error=update-failed`)
  }

  // Send mail til Brandsurface
  try {
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'brandsurface_email')
      .single()
    const recipient = (setting?.value || process.env.BRANDSURFACE_EMAIL || '').trim()

    if (process.env.RESEND_API_KEY && recipient) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromAddress = process.env.RESEND_FROM || 'onboarding@resend.dev'

      // Sending now — cancel any pending scheduled send to avoid a duplicate
      if (order.scheduled_email_id) {
        try { await resend.emails.cancel(order.scheduled_email_id) } catch (e) { console.warn('Kunne ikke annullere planlagt mail:', e?.message) }
      }

      const { subject, html } = buildBrandsurfaceEmail({ order })

      await resend.emails.send({
        from:    `Brandsurface Ordre <${fromAddress}>`,
        to:      recipient,
        replyTo: order.email,
        subject,
        html,
      })
    } else {
      console.warn('RESEND_API_KEY eller modtager mangler — ingen mail sendt til Brandsurface')
    }
  } catch (mailErr) {
    console.error('Brandsurface-mail fejl:', mailErr)
    // Fortsætter — ordren er stadig godkendt
  }

  return NextResponse.redirect(`${origin}/godkendt`)
}
