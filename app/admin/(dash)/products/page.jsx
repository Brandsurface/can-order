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

export default async function AdminProducts({ searchParams }) {
  const { data: products } = await supabase
    .from('products')
    .select('id, grp, label, formats, sort, active')
    .order('grp', { ascending: true })
    .order('sort', { ascending: true })

  const note = searchParams?.status ? STATUS[searchParams.status] : null

  return (
    <>
      <h1 className="a-h1">Products</h1>
      <p className="a-sub">Edit the products shown on the order form. Formats are comma-separated (leave empty for none).</p>

      {note && <div className={`a-note ${note[0]}`}>{note[1]}</div>}

      <div className="a-card" style={{ marginBottom: 24 }}>
        <form method="POST" action="/api/admin/products" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <input type="hidden" name="action" value="create" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 2, minWidth: 180 }}>
            <label className="a-label">Name</label>
            <input className="a-input" name="label" required placeholder="New product" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
            <label className="a-label">Group</label>
            <select className="a-input" name="grp" defaultValue="print">
              {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 2, minWidth: 180 }}>
            <label className="a-label">Formats (comma-separated)</label>
            <input className="a-input" name="formats" placeholder="A4, 50×70 cm" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 80 }}>
            <label className="a-label">Sort</label>
            <input className="a-input" name="sort" type="number" defaultValue={0} />
          </div>
          <button type="submit" className="a-btn">Add</button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(products || []).map(p => (
          <div key={p.id} className="a-card" style={{ opacity: p.active ? 1 : 0.55 }}>
            <form method="POST" action="/api/admin/products" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <input type="hidden" name="action" value="update" />
              <input type="hidden" name="id" value={p.id} />
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 2, minWidth: 180 }}>
                <label className="a-label">Formats</label>
                <input className="a-input" name="formats" defaultValue={(p.formats || []).join(', ')} placeholder="—" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 80 }}>
                <label className="a-label">Sort</label>
                <input className="a-input" name="sort" type="number" defaultValue={p.sort} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b8b4ae', height: 40 }}>
                <input type="checkbox" name="active" defaultChecked={p.active} /> Active
              </label>
              <button type="submit" className="a-btn-2">Save</button>
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
