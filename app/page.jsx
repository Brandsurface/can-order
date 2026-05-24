import fs from 'fs'
import path from 'path'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const GROUP_LABELS = { print: 'Print materials', some: 'SoMe assets' }

const ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'
const MINUS = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
const PLUS = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
const CHEVRON = '<svg class="acc-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

// option_groups takes precedence; fall back to the legacy formats list
function effectiveGroups(p) {
  if (Array.isArray(p.option_groups) && p.option_groups.length) {
    return p.option_groups.filter(g => g && g.name && Array.isArray(g.options) && g.options.length)
  }
  if (Array.isArray(p.formats) && p.formats.length) {
    return [{ name: 'Format', options: p.formats }]
  }
  return []
}

function renderItem(p) {
  const pid = p.id
  const qid = 'qty-' + pid
  const cid = 'cmt-' + pid
  const groups = effectiveGroups(p)

  const desc = p.description ? `<p class="acc-desc">${esc(p.description)}</p>` : ''
  const groupsHtml = groups.map((g, gi) => `
              <div class="opt-group">
                <span class="opt-label">${esc(g.name)}</span>
                <div class="opt-chips" id="opt-${pid}-${gi}">${g.options.map(o => `<span class="format-chip" onclick="selectOption(this,'${pid}',${gi})">${esc(o)}</span>`).join('')}</div>
              </div>`).join('')

  return `
          <div class="produkt-acc">
            <button type="button" class="produkt-acc-head" onclick="toggleProduct('${pid}')">
              <span class="produkt-name">${ICON}${esc(p.label)}</span>
              <span class="acc-right"><span class="acc-qty" id="accqty-${pid}"></span>${CHEVRON}</span>
            </button>
            <div class="produkt-acc-body" id="accbody-${pid}">
              ${desc}${groupsHtml}
              <div class="acc-row">
                <span class="opt-label">Quantity</span>
                <div class="qty-stepper">
                  <button type="button" onclick="stepQty('${qid}',-1)">${MINUS}</button>
                  <input type="number" id="${qid}" value="0" min="0" oninput="updateQtyBadge('${pid}')"/>
                  <button type="button" onclick="stepQty('${qid}',1)">${PLUS}</button>
                </div>
              </div>
              <div class="acc-comment">
                <span class="opt-label">Comment</span>
                <textarea id="${cid}" rows="2" placeholder="Notes for this product (optional)…"></textarea>
              </div>
            </div>
          </div>`
}

async function buildProducts() {
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
                `        <div class="produkt-list">${rows.map(renderItem).join('')}\n        </div>\n\n`
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const arr = products.map(p => ({
    type: p.label,
    pid: p.id,
    qty: 'qty-' + p.id,
    cmt: 'cmt-' + p.id,
    groups: effectiveGroups(p).map(g => g.name),
  }))
  const json = JSON.stringify(arr).replace(/</g, '\\u003c')
  return { sections, dataScript: `window.__PRODUCTS = ${json}; window.__SUPABASE_URL = ${JSON.stringify(supabaseUrl)};` }
}

export default async function Home() {
  const filePath = path.join(process.cwd(), 'app', 'page.html')
  let html = fs.readFileSync(filePath, 'utf-8')

  const { sections, dataScript } = await buildProducts()
  html = html.replace('        <!--PRODUCTS_SECTIONS-->', sections)
  html = html.replace('/*PRODUCTS_JSON*/', dataScript)

  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const headContent = headMatch ? headMatch[1] : ''
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyContent = bodyMatch ? bodyMatch[1] : html

  const combined = headContent + bodyContent
  return <div dangerouslySetInnerHTML={{ __html: combined }} />
}
