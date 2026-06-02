import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const back = (req, status) => NextResponse.redirect(new URL(`/admin/products?status=${status}`, req.url), 303)

// Accepts JSON from the visual builder (preferred) or legacy "Name: a, b" lines.
function parseOptionGroups(raw) {
  const str = String(raw || '').trim()
  if (!str) return []

  if (str.startsWith('[')) {
    try {
      const arr = JSON.parse(str)
      if (Array.isArray(arr)) {
        return arr
          .map(g => ({
            name: String(g?.name || '').trim(),
            options: Array.isArray(g?.options) ? g.options.map(o => String(o).trim()).filter(Boolean) : [],
          }))
          .filter(g => g.name && g.options.length)
      }
    } catch {}
  }

  return str
    .split('\n')
    .map(line => {
      const i = line.indexOf(':')
      if (i < 0) return null
      const name = line.slice(0, i).trim()
      const options = line.slice(i + 1).split(',').map(s => s.trim()).filter(Boolean)
      return name && options.length ? { name, options } : null
    })
    .filter(Boolean)
}

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/admin/login', req.url), 303)

  const form = await req.formData()
  const action = String(form.get('action') || '')

  if (action === 'create' || action === 'update') {
    const label = String(form.get('label') || '').trim()
    if (!label) return back(req, 'invalid')
    const fields = {
      label,
      grp: String(form.get('grp') || 'print') === 'some' ? 'some' : 'print',
      description: String(form.get('description') || '').trim() || null,
      option_groups: parseOptionGroups(form.get('option_groups')),
      formats: [], // option_groups is the single source of truth going forward
      sort: parseInt(form.get('sort'), 10) || 0,
    }
    if (action === 'create') {
      const { error } = await supabase.from('products').insert(fields)
      return back(req, error ? 'error' : 'created')
    }
    const id = String(form.get('id') || '')
    if (!id) return back(req, 'invalid')
    fields.active = form.get('active') === 'on'
    fields.allow_custom_format = form.get('allow_custom_format') === 'on'
    fields.allow_duplicate = form.get('allow_duplicate') === 'on'
    const { error } = await supabase.from('products').update(fields).eq('id', id)
    return back(req, error ? 'error' : 'saved')
  }

  if (action === 'delete') {
    const id = String(form.get('id') || '')
    const { error } = await supabase.from('products').delete().eq('id', id)
    return back(req, error ? 'error' : 'deleted')
  }

  return back(req, 'error')
}
