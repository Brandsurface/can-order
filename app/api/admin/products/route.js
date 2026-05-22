import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const back = (req, status) => NextResponse.redirect(new URL(`/admin/products?status=${status}`, req.url), 303)

// "A4, 50×70 cm" → ["A4","50×70 cm"]
function parseFormats(raw) {
  return String(raw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/admin/login', req.url), 303)

  const form = await req.formData()
  const action = String(form.get('action') || '')

  if (action === 'create') {
    const label = String(form.get('label') || '').trim()
    const grp = String(form.get('grp') || 'print')
    if (!label) return back(req, 'invalid')
    const { error } = await supabase.from('products').insert({
      label,
      grp: grp === 'some' ? 'some' : 'print',
      formats: parseFormats(form.get('formats')),
      sort: parseInt(form.get('sort'), 10) || 0,
    })
    return back(req, error ? 'error' : 'created')
  }

  if (action === 'update') {
    const id = String(form.get('id') || '')
    const label = String(form.get('label') || '').trim()
    const grp = String(form.get('grp') || 'print')
    if (!id || !label) return back(req, 'invalid')
    const { error } = await supabase.from('products').update({
      label,
      grp: grp === 'some' ? 'some' : 'print',
      formats: parseFormats(form.get('formats')),
      sort: parseInt(form.get('sort'), 10) || 0,
      active: form.get('active') === 'on',
    }).eq('id', id)
    return back(req, error ? 'error' : 'saved')
  }

  if (action === 'delete') {
    const id = String(form.get('id') || '')
    const { error } = await supabase.from('products').delete().eq('id', id)
    return back(req, error ? 'error' : 'deleted')
  }

  return back(req, 'error')
}
