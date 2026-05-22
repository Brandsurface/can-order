import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'
import { dispatchToBrandsurface, cancelScheduledSend } from '@/lib/dispatch'

export const dynamic = 'force-dynamic'

const back = (req, status) => NextResponse.redirect(new URL(`/admin?status=${status}`, req.url), 303)

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/admin/login', req.url), 303)

  const form = await req.formData()
  const action = String(form.get('action') || '')
  const id = String(form.get('id') || '')
  if (!id) return back(req, 'error')

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single()
  if (!order) return back(req, 'notfound')

  if (action === 'approve') {
    if (order.status !== 'pending') return back(req, 'notpending')
    await dispatchToBrandsurface(order)
    return back(req, 'approved')
  }

  if (action === 'delete') {
    await cancelScheduledSend(order)
    if (Array.isArray(order.uploads) && order.uploads.length) {
      try { await supabase.storage.from('order-uploads').remove(order.uploads.map(u => u.path)) } catch (e) { console.warn('Kunne ikke slette filer:', e?.message) }
    }
    const { error } = await supabase.from('orders').delete().eq('id', id)
    return back(req, error ? 'error' : 'deleted')
  }

  return back(req, 'error')
}
