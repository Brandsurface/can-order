import { supabase } from '@/lib/supabase'
import { getAdminT } from '@/lib/admin-i18n'
import OptionGroupsBuilder from './OptionGroupsBuilder'

export const dynamic = 'force-dynamic'

function groupsToJson(p) {
  if (Array.isArray(p?.option_groups) && p.option_groups.length) {
    return p.option_groups
      .filter(g => g && g.name)
      .map(g => ({ name: g.name, options: Array.isArray(g.options) ? g.options : [], recommended: Array.isArray(g.recommended) ? g.recommended : [] }))
  }
  if (Array.isArray(p?.formats) && p.formats.length) return [{ name: 'Format', options: p.formats }]
  return []
}

export default async function AdminProducts({ searchParams }) {
  const { t } = await getAdminT()
  const STATUS = {
    created: ['ok', t.st_created_product],
    saved: ['ok', t.st_saved],
    deleted: ['ok', t.st_deleted_product],
    invalid: ['err', t.st_invalid_product],
    error: ['err', t.st_error],
  }
  const GROUPS = [['print', t.group_print], ['some', t.group_some]]
  const ogT = {
    label: t.og_label, hint: t.og_hint, groupNamePh: t.og_group_name_ph,
    removeGroup: t.og_remove_group, optionPh: t.og_option_ph, starOn: t.og_star_on,
    starOff: t.og_star_off, removeOption: t.og_remove_option, addOption: t.og_add_option,
    addGroup: t.og_add_group,
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, grp, label, description, formats, option_groups, sort, active, allow_custom_format, allow_duplicate')
    .order('grp', { ascending: true })
    .order('sort', { ascending: true })

  const note = searchParams?.status ? STATUS[searchParams.status] : null

  return (
    <>
      <h1 className="a-h1">{t.products_title}</h1>
      <p className="a-sub">{t.products_sub}</p>

      {note && <div className={`a-note ${note[0]}`}>{note[1]}</div>}

      <div className="a-card" style={{ marginBottom: 24 }}>
        <form method="POST" action="/api/admin/products" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="hidden" name="action" value="create" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 2, minWidth: 180 }}>
              <label className="a-label">{t.products_new_name}</label>
              <input className="a-input" name="label" required placeholder={t.products_name_ph} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
              <label className="a-label">{t.products_group}</label>
              <select className="a-input" name="grp" defaultValue="print">
                {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 80 }}>
              <label className="a-label">{t.products_sort}</label>
              <input className="a-input" name="sort" type="number" defaultValue={0} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="a-label">{t.products_desc_opt}</label>
            <input className="a-input" name="description" placeholder={t.products_desc_ph} />
          </div>
          <OptionGroupsBuilder initial={[]} t={ogT} />
          <button type="submit" className="a-btn" style={{ alignSelf: 'flex-start' }}>{t.products_add}</button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(products || []).map(p => (
          <div key={p.id} className="a-card" style={{ opacity: p.active ? 1 : 0.55 }}>
            <form method="POST" action="/api/admin/products" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="hidden" name="action" value="update" />
              <input type="hidden" name="id" value={p.id} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 2, minWidth: 180 }}>
                  <label className="a-label">{t.products_name}</label>
                  <input className="a-input" name="label" defaultValue={p.label} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
                  <label className="a-label">{t.products_group}</label>
                  <select className="a-input" name="grp" defaultValue={p.grp}>
                    {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 80 }}>
                  <label className="a-label">{t.products_sort}</label>
                  <input className="a-input" name="sort" type="number" defaultValue={p.sort} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b8b4ae', height: 40 }}>
                  <input type="checkbox" name="active" defaultChecked={p.active} /> {t.products_active}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b8b4ae', height: 40 }}>
                  <input type="checkbox" name="allow_custom_format" defaultChecked={p.allow_custom_format} /> {t.products_custom_format}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b8b4ae', height: 40 }}>
                  <input type="checkbox" name="allow_duplicate" defaultChecked={p.allow_duplicate} /> {t.products_allow_duplicate}
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label">{t.products_desc}</label>
                <input className="a-input" name="description" defaultValue={p.description || ''} placeholder="—" />
              </div>
              <OptionGroupsBuilder initial={groupsToJson(p)} t={ogT} />
              <button type="submit" className="a-btn-2" style={{ alignSelf: 'flex-start' }}>{t.products_save}</button>
            </form>
            <form method="POST" action="/api/admin/products" style={{ marginTop: 10 }}>
              <input type="hidden" name="action" value="delete" />
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" className="a-btn-danger">{t.products_delete}</button>
            </form>
          </div>
        ))}
        {(!products || products.length === 0) && (
          <div className="a-card" style={{ color: '#7a7672' }}>{t.products_empty}</div>
        )}
      </div>
    </>
  )
}
