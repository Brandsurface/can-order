import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/admin/login', req.url), 303)

  const form = await req.formData()
  const email = String(form.get('brandsurface_email') || '').trim()
  const delayRaw = parseInt(String(form.get('confirm_delay_minutes') || ''), 10)
  const delay = Number.isFinite(delayRaw) && delayRaw >= 0 ? delayRaw : 10
  const helpActive = form.get('help_box_active') === '1' ? '1' : '0'
  const helpHtml = String(form.get('help_box_html') || '').trim()

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('app_settings')
    .upsert([
      { key: 'brandsurface_email', value: email, updated_at: now },
      { key: 'confirm_delay_minutes', value: String(delay), updated_at: now },
      { key: 'help_box_active', value: helpActive, updated_at: now },
      { key: 'help_box_html', value: helpHtml, updated_at: now },
    ], { onConflict: 'key' })

  const status = error ? 'error' : 'saved'
  return NextResponse.redirect(new URL(`/admin/settings?status=${status}`, req.url), 303)
}
