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
          .map(g => {
            const options = Array.isArray(g?.options) ? g.options.map(o => String(o).trim()).filter(Boolean) : []
            const recommended = Array.isArray(g?.recommended)
              ? g.recommended.map(o => String(o).trim()).filter(v => options.includes(v))
              : []
            return { name: String(g?.name || '').trim(), options, recommended }
          })
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
    const description = String(form.get('description') || '').trim() || null
    const lang = String(form.get('lang') || '') === 'en' ? 'en' : 'da'
    const optionGroups = parseOptionGroups(form.get('option_groups'))

    // Language-neutral fields shared by both languages
    const common = {
      grp: String(form.get('grp') || 'print') === 'some' ? 'some' : 'print',
      formats: [], // option_groups is the single source of truth going forward
      sort: parseInt(form.get('sort'), 10) || 0,
    }

    if (action === 'create') {
      // New products seed both languages so they show regardless of customer language
      const { error } = await supabase.from('products').insert({
        ...common,
        label, description, option_groups: optionGroups,
        label_en: label, label_da: label,
        description_en: description, description_da: description,
        option_groups_en: optionGroups, option_groups_da: optionGroups,
      })
      return back(req, error ? 'error' : 'created')
    }

    const id = String(form.get('id') || '')
    if (!id) return back(req, 'invalid')
    // Update only the edited language — the other language is left untouched
    const { error } = await supabase.from('products').update({
      ...common,
      [`label_${lang}`]:         label,
      [`description_${lang}`]:   description,
      [`option_groups_${lang}`]: optionGroups,
      active:              form.get('active') === 'on',
      allow_custom_format: form.get('allow_custom_format') === 'on',
      allow_duplicate:     form.get('allow_duplicate') === 'on',
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
