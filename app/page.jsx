import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { translations } from '@/lib/translations'

export const dynamic = 'force-dynamic'

const GROUP_LABELS = { print: 'Print materials', some: 'SoMe assets' }

const ICON = '<span class="prod-icon"><svg class="prod-icon-empty" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg><svg class="prod-icon-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="8 12 11 15 16 9"/></svg></span>'
const MINUS = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
const PLUS = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
const CHEVRON = '<svg class="acc-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

// Per-language option groups (fallback to the shared column, then legacy formats)
function effectiveGroups(p, lang) {
  const perLang = p[`option_groups_${lang}`]
  const og = (Array.isArray(perLang) && perLang.length) ? perLang : p.option_groups
  if (Array.isArray(og) && og.length) {
    return og.filter(g => g && g.name && Array.isArray(g.options) && g.options.length)
  }
  if (Array.isArray(p.formats) && p.formats.length) {
    return [{ name: 'Format', options: p.formats }]
  }
  return []
}

// Per-language product text with fallback to the legacy single-value column
function txt(p, field, lang) {
  return p[`${field}_${lang}`] || p[field] || ''
}

function renderItem(p, t, lang) {
  const pid = p.id
  const qid = 'qty-' + pid
  const cid = 'cmt-' + pid
  const groups = effectiveGroups(p, lang)
  const label = txt(p, 'label', lang)
  const description = txt(p, 'description', lang)

  const desc = description ? `<p class="acc-desc">${esc(description)}</p>` : ''
  const groupsHtml = groups.map((g, gi) => {
    const cfmtInput = (p.allow_custom_format && gi === 0)
      ? `<input type="text" id="cfmt-${pid}" class="custom-fmt-input" placeholder="${esc(t.custom_fmt_ph)}" oninput="updateCustomFmt('${pid}',this)"/>`
      : ''
    const rec = Array.isArray(g.recommended) ? g.recommended : []
    return `
              <div class="opt-group">
                <span class="opt-label">${esc(g.name)}</span>
                <div class="opt-chips" id="opt-${pid}-${gi}">${g.options.map(o => `<span class="format-chip${rec.includes(o) ? ' rec' : ''}" onclick="selectOption(this,'${pid}',${gi})">${esc(o)}</span>`).join('')}${cfmtInput}</div>
              </div>`
  }).join('')

  const addBtn = p.allow_duplicate
    ? `<button type="button" class="add-instance-btn" onclick="addProductInstance('${pid}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> ${esc(label)}</button>`
    : ''

  return `
          <div class="produkt-group" id="prodgrp-${pid}">
          <div class="produkt-acc" id="prodacc-${pid}">
            <button type="button" class="produkt-acc-head" onclick="toggleProduct('${pid}')">
              <span class="produkt-name">${ICON}${esc(label)}</span>
              <span class="acc-right"><span class="acc-qty" id="accqty-${pid}"></span>${CHEVRON}</span>
            </button>
            <div class="produkt-acc-body" id="accbody-${pid}">
              ${desc}${groupsHtml}
              ${p.grp !== 'some' ? `<div class="alt-addr-toggle self-print-toggle" id="selfprint-toggle-${pid}" onclick="toggleSelfPrint('${pid}')">
                <div class="toggle-switch"></div>
                <span class="alt-addr-toggle-label">${esc(t.self_print_toggle)}</span>
              </div>` : ''}
              <div class="acc-row">
                <span class="opt-label">${esc(t.qty_label)}</span>
                <div class="qty-stepper">
                  <button type="button" onclick="stepQty('${qid}',-1)">${MINUS}</button>
                  <input type="number" id="${qid}" value="0" min="0" oninput="updateQtyBadge('${pid}')"/>
                  <button type="button" onclick="stepQty('${qid}',1)">${PLUS}</button>
                </div>
              </div>
              <div class="field-error" id="err-qty-${pid}">${esc(t.qty_err)}</div>
              <div class="acc-comment">
                <span class="opt-label">${esc(t.comment_label)}</span>
                <textarea id="${cid}" rows="2" placeholder="${esc(t.comment_ph)}"></textarea>
              </div>
              ${addBtn}
            </div>
          </div>
          </div>`
}

async function buildProducts(t, lang) {
  let products = []
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('grp', { ascending: true })
      .order('sort', { ascending: true })
    if (error) console.error('Produkt-hentning fejl:', error.message)
    products = data || []
  } catch (e) {
    console.error('Kunne ikke hente produkter:', e?.message)
  }

  const order = ['print', 'some']
  const groups = [...new Set([...order, ...products.map(p => p.grp)])]
  let sections = ''
  for (const g of groups) {
    const rows = products.filter(p => p.grp === g)
    if (!rows.length) continue
    sections += `        <div class="produkt-section-label">${esc(GROUP_LABELS[g] || g)}</div>\n` +
                `        <div class="produkt-list">${rows.map(p => renderItem(p, t, lang)).join('')}\n        </div>\n\n`
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const arr = products.map(p => ({
    type: txt(p, 'label', lang),
    pid: p.id,
    qty: 'qty-' + p.id,
    cmt: 'cmt-' + p.id,
    groups: effectiveGroups(p, lang).map(g => g.name),
    groupDefs: effectiveGroups(p, lang),
    customFormat: !!p.allow_custom_format,
    allowDuplicate: !!p.allow_duplicate,
    allowMulti: !!p.allow_multi,
  }))
  const json = JSON.stringify(arr).replace(/</g, '\\u003c')
  return { sections, dataScript: `window.__PRODUCTS = ${json}; window.__SUPABASE_URL = ${JSON.stringify(supabaseUrl)};` }
}

async function buildHelpBox() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['help_box_active', 'help_box_html'])
    if (error) { console.error('[help_box] DB error:', error.message); return '' }
    const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))
    console.log('[help_box] active:', map.help_box_active, 'html length:', map.help_box_html?.length)
    if (map.help_box_active !== '1') return ''
    const content = map.help_box_html || ''
    if (!content) return ''
    return `
      <div class="card" style="margin-top:16px;">
        <div class="card-label">Need help?</div>
        <div class="help-box-content">${content}</div>
      </div>`
  } catch (e) {
    console.error('[help_box] exception:', e?.message)
    return ''
  }
}

export default async function Home() {
  const lang = (await cookies()).get('lang')?.value === 'da' ? 'da' : 'en'
  const t = translations[lang]

  const filePath = path.join(process.cwd(), 'app', 'page.html')
  let html = fs.readFileSync(filePath, 'utf-8')

  const [{ sections, dataScript }, helpBox] = await Promise.all([buildProducts(t, lang), buildHelpBox()])
  html = html.replace('        <!--PRODUCTS_SECTIONS-->', sections)

  // Inject products data + translations for client-side JS
  const tJson = JSON.stringify(t).replace(/</g, '\\u003c')
  html = html.replace('/*PRODUCTS_JSON*/', dataScript + ` window.__T=${tJson}; window.__LANG=${JSON.stringify(lang)};`)

  html = html.replace(/\s*<!--HELP_BOX-->/, helpBox)

  // Apply server-side translations — replace all {{key}} markers
  html = html.replace(/\{\{(\w+)\}\}/g, (_, key) => t[key] ?? '')

  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const headContent = headMatch ? headMatch[1] : ''
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyContent = bodyMatch ? bodyMatch[1] : html

  const combined = headContent + bodyContent
  return <div dangerouslySetInnerHTML={{ __html: combined }} />
}
