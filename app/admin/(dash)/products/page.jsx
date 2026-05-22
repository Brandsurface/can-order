import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const STATUS = {
  created: ['ok', 'Product added.'],
  saved: ['ok', 'Saved.'],
  deleted: ['ok', 'Product deleted.'],
  invalid: ['err', 'Please enter a product name.'],
  error: ['err', 'Something went wrong. Please try again.'],
}

const GROUPS = [['print', 'Print materials'], ['some', 'SoMe assets']]

function groupsToText(p) {
  if (Array.isArray(p.option_groups) && p.option_groups.length) {
    return p.option_groups.map(g => `${g.name}: ${(g.options || []).join(', ')}`).join('\n')
  }
  if (Array.isArray(p.formats) && p.formats.length) return `Format: ${p.formats.join(', ')}`
  return ''
}

export default async function AdminProducts({ searchParams }) {
  const { data: products } = await supabase
    .from('products')
    .select('id, grp, label, description, formats, option_groups, sort, active')
    .order('grp', { ascending: true })
    .order('sort', { ascending: true })

  const note = searchParams?.status ? STATUS[searchParams.status] : null

  return (
    <>
      <h1 className="a-h1">Products</h1>
      <p className="a-sub">Edit the order-form products. Options: one group per line, e.g. <code style={{ fontFamily: "'DM Mono',monospace" }}>Format: A4, 50×70 cm</code>. Every product also shows a comment field on the form.</p>

      {note && <div className={`a-note ${note[0]}`}>{note[1]}</div>}

      <div className="a-card" style={{ marginBottom: 24 }}>
        <form method="POST" action="/api/admin/products" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="hidden" name="action" value="create" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 2, minWidth: 180 }}>
              <label className="a-label">New product name</label>
              <input className="a-input" name="label" required placeholder="Product name" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
              <label className="a-label">Group</label>
              <select className="a-input" name="grp" defaultValue="print">
                {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 80 }}>
              <label className="a-label">Sort</label>
              <input className="a-input" name="sort" type="number" defaultValue={0} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="a-label">Description (optional)</label>
            <input className="a-input" name="description" placeholder="Spec text shown when expanded" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="a-label">Option groups (one per line)</label>
            <textarea className="a-input" name="option_groups" rows={2} placeholder="Format: A4, 50×70 cm, A3&#10;Print: 4+0, 4+4" style={{ fontFamily: "'DM Mono',monospace", resize: 'vertical' }} />
          </div>
          <button type="submit" className="a-btn" style={{ alignSelf: 'flex-start' }}>Add product</button>
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
                  <label className="a-label">Name</label>
                  <input className="a-input" name="label" defaultValue={p.label} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
                  <label className="a-label">Group</label>
                  <select className="a-input" name="grp" defaultValue={p.grp}>
                    {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 80 }}>
                  <label className="a-label">Sort</label>
                  <input className="a-input" name="sort" type="number" defaultValue={p.sort} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b8b4ae', height: 40 }}>
                  <input type="checkbox" name="active" defaultChecked={p.active} /> Active
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label">Description</label>
                <input className="a-input" name="description" defaultValue={p.description || ''} placeholder="—" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label">Option groups (one per line)</label>
                <textarea className="a-input" name="option_groups" rows={2} defaultValue={groupsToText(p)} placeholder="—" style={{ fontFamily: "'DM Mono',monospace", resize: 'vertical' }} />
              </div>
              <button type="submit" className="a-btn-2" style={{ alignSelf: 'flex-start' }}>Save</button>
            </form>
            <form method="POST" action="/api/admin/products" style={{ marginTop: 10 }}>
              <input type="hidden" name="action" value="delete" />
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" className="a-btn-danger">Delete</button>
            </form>
          </div>
        ))}
        {(!products || products.length === 0) && (
          <div className="a-card" style={{ color: '#7a7672' }}>No products yet — add one above.</div>
        )}
      </div>
    </>
  )
}
