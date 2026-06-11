import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { translations } from '@/lib/translations'

export const dynamic = 'force-dynamic'

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function parseList(value, fallback) {
  if (!value) return fallback
  try {
    const arr = JSON.parse(value)
    return Array.isArray(arr) ? arr.map(String) : fallback
  } catch {
    return fallback
  }
}

async function loadData(t) {
  let brands = []
  const settings = {}
  try {
    const [{ data: brandRows }, { data: settingRows }] = await Promise.all([
      supabase.from('brands').select('name, variants, active, sort').eq('active', true).order('sort', { ascending: true }),
      supabase.from('app_settings').select('key, value').in('key', ['sizes', 'regions', 'pantmaerke_exempt_region', 'help_box_active', 'help_box_html']),
    ])
    brands = brandRows || []
    for (const r of settingRows || []) settings[r.key] = r.value
  } catch (e) {
    console.error('Kunne ikke hente formular-data:', e?.message)
  }

  const sizes = parseList(settings.sizes, ['250 ml', '330 ml', '330 ml slim', '440 ml', '500 ml'])
  const regions = parseList(settings.regions, ['DK', 'Border'])
  const pantExempt = settings.pantmaerke_exempt_region || 'Border'

  // Print type + finish are fixed in code; the finish options depend on the print type.
  const labelTypes = ['Label', 'Can']
  const finishMap = {
    Label: ['White', 'Metallic', 'Transparent', 'To be confirmed'],
    Can: ['Mat', 'Gloss', 'To be confirmed'],
  }

  // Brand tiles + variants map
  const variantsMap = {}
  let brandTiles = ''
  for (const b of brands) {
    const variants = Array.isArray(b.variants) ? b.variants : []
    variantsMap[b.name] = variants
    brandTiles += `<button type="button" class="brand-tile" data-brand="${esc(b.name)}" onclick="selectBrand(this)"><span class="brand-radio"></span><span class="brand-name">${esc(b.name)}</span></button>`
  }
  brandTiles += `<button type="button" class="brand-tile unknown" data-unknown="1" onclick="selectBrand(this)"><span class="brand-radio"></span><span class="brand-name">${esc(t.brand_unknown)}</span></button>`

  const sizeChips = sizes.map(s => `<button type="button" class="size-chip" data-size="${esc(s)}" onclick="selectSize(this)">${esc(s)}</button>`).join('')
  const regionSeg = regions.map((r, i) => `<button type="button" class="seg-btn${i === 0 ? ' selected' : ''}" data-region="${esc(r)}" onclick="selectRegion(this)">${esc(r)}</button>`).join('')
  const labelSeg = labelTypes.map((l, i) => `<button type="button" class="seg-btn${i === 0 ? ' selected' : ''}" data-labeltype="${esc(l)}" onclick="selectLabelType(this)">${esc(l)}</button>`).join('')
  // No finish pre-selected: a disabled placeholder + the default print type's options.
  const finishOpts = `<option value="" disabled selected hidden>${esc(t.finish_ph)}</option>` +
    (finishMap[labelTypes[0]] || []).map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('')

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const dataScript =
    `window.__VARIANTS=${JSON.stringify(variantsMap).replace(/</g, '\\u003c')};` +
    `window.__SUPABASE_URL=${JSON.stringify(supabaseUrl)};` +
    `window.__PANT_EXEMPT=${JSON.stringify(pantExempt)};` +
    `window.__FINISHES=${JSON.stringify(finishMap).replace(/</g, '\\u003c')};`

  return { brandTiles, sizeChips, regionSeg, labelSeg, finishOpts, dataScript, helpBox: buildHelpBox(settings) }
}

function buildHelpBox(settings) {
  if (settings.help_box_active !== '1') return ''
  const content = settings.help_box_html || ''
  if (!content) return ''
  return `<div class="help-box">${content}</div>`
}

export default async function Home() {
  const lang = (await cookies()).get('lang')?.value === 'da' ? 'da' : 'en'
  const t = translations[lang]

  const filePath = path.join(process.cwd(), 'app', 'page.html')
  let html = fs.readFileSync(filePath, 'utf-8')

  const { brandTiles, sizeChips, regionSeg, labelSeg, finishOpts, dataScript, helpBox } = await loadData(t)

  html = html.replace('<!--BRAND_TILES-->', brandTiles)
  html = html.replace('<!--SIZE_CHIPS-->', sizeChips)
  html = html.replace('<!--REGION_SEG-->', regionSeg)
  html = html.replace('<!--LABELTYPE_SEG-->', labelSeg)
  html = html.replace('<!--FINISH_OPTIONS-->', finishOpts)
  html = html.replace(/\s*<!--HELP_BOX-->/, helpBox)

  const tJson = JSON.stringify(t).replace(/</g, '\\u003c')
  html = html.replace('/*PRODUCTS_JSON*/', `${dataScript} window.__T=${tJson}; window.__LANG=${JSON.stringify(lang)};`)

  // Server-side translations — replace all {{key}} markers
  html = html.replace(/\{\{(\w+)\}\}/g, (_, key) => t[key] ?? '')

  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const headContent = headMatch ? headMatch[1] : ''
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyContent = bodyMatch ? bodyMatch[1] : html

  return <div dangerouslySetInnerHTML={{ __html: headContent + bodyContent }} />
}
