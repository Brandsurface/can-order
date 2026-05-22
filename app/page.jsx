import fs from 'fs'
import path from 'path'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const GROUP_LABELS = { print: 'Print materials', some: 'SoMe assets' }

const ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'
const MINUS = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
const PLUS = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function renderRow(p) {
  const qid = 'qty-' + p.id
  const formats = Array.isArray(p.formats) ? p.formats : []
  const options = formats.length
    ? `<div class="produkt-row-options" id="fmt-${p.id}">` +
        formats.map(f => `<span class="format-chip" onclick="selectFormat(this,'${p.id}')">${esc(f)}</span>`).join('') +
      `</div>`
    : `<div class="produkt-row-options"></div>`
  return `
          <div class="produkt-row">
            <div class="produkt-name">${ICON}${esc(p.label)}</div>
            ${options}
            <div class="qty-stepper">
              <button type="button" onclick="stepQty('${qid}',-1)">${MINUS}</button>
              <input type="number" id="${qid}" value="0" min="0"/>
              <button type="button" onclick="stepQty('${qid}',1)">${PLUS}</button>
            </div>
          </div>`
}

async function buildProducts() {
  let products = []
  try {
    const { data } = await supabase
      .from('products')
      .select('id, grp, label, formats, sort')
      .eq('active', true)
      .order('grp', { ascending: true })
      .order('sort', { ascending: true })
    products = data || []
  } catch (e) {
    console.error('Kunne ikke hente produkter:', e?.message)
  }

  // Sections HTML, grouped (print before some)
  const order = ['print', 'some']
  const groups = [...new Set([...order, ...products.map(p => p.grp)])]
  let sections = ''
  for (const g of groups) {
    const rows = products.filter(p => p.grp === g)
    if (!rows.length) continue
    sections += `        <div class="produkt-section-label">${esc(GROUP_LABELS[g] || g)}</div>\n` +
                `        <div class="produkt-list">${rows.map(renderRow).join('')}\n        </div>\n\n`
  }

  // Client config array (matches the inline JS shape)
  const arr = products.map(p => {
    const hasFmt = Array.isArray(p.formats) && p.formats.length > 0
    return { type: p.label, id: 'qty-' + p.id, fmt: hasFmt ? p.id : null }
  })
  const json = JSON.stringify(arr).replace(/</g, '\\u003c')
  return { sections, dataScript: `window.__PRODUCTS = ${json};` }
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
