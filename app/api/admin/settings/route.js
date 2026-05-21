import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/admin/login', req.url), 303)

  const form = await req.formData()
  const email = String(form.get('brandsurface_email') || '').trim()

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'brandsurface_email', value: email, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  const status = error ? 'error' : 'saved'
  return NextResponse.redirect(new URL(`/admin/settings?status=${status}`, req.url), 303)
}
