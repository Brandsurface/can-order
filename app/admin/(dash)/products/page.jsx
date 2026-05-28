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

function groupsToJson(p) {
  if (Array.isArray(p?.option_groups) && p.option_groups.length) {
    return p.option_groups
      .filter(g => g && g.name)
      .map(g => ({ name: g.name, options: Array.isArray(g.options) ? g.options : [] }))
  }
  if (Array.isArray(p?.formats) && p.formats.length) return [{ name: 'Format', options: p.formats }]
  return []
}

function OptionGroupsBuilder({ groups }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="a-label">Option groups (multiple choice)</label>
      <div className="og-builder">
        <input type="hidden" name="option_groups" defaultValue={JSON.stringify(groups)} />
        <div className="og-groups" />
        <button type="button" className="og-add-group">+ Add option group</button>
      </div>
    </div>
  )
}

const BUILDER_SCRIPT = `(function(){
  function draw(b){
    var wrap=b.querySelector('.og-groups');
    wrap.innerHTML='';
    (b._groups||[]).forEach(function(g,gi){
      var row=document.createElement('div'); row.className='og-group';
      var head=document.createElement('div'); head.className='og-group-head';
      var nameIn=document.createElement('input'); nameIn.className='a-input'; nameIn.placeholder='Group name (e.g. Format)'; nameIn.value=g.name||'';
      nameIn.addEventListener('input',function(){g.name=nameIn.value;sync(b);});
      var delG=document.createElement('button'); delG.type='button'; delG.className='og-del'; delG.title='Remove group'; delG.textContent='\\u00d7';
      delG.addEventListener('click',function(){b._groups.splice(gi,1);draw(b);sync(b);});
      head.appendChild(nameIn); head.appendChild(delG); row.appendChild(head);
      var opts=document.createElement('div'); opts.className='og-opts';
      (g.options||[]).forEach(function(opt,oi){
        var o=document.createElement('div'); o.className='og-opt';
        var oin=document.createElement('input'); oin.className='a-input'; oin.placeholder='Option value'; oin.value=opt;
        oin.addEventListener('input',function(){g.options[oi]=oin.value;sync(b);});
        var od=document.createElement('button'); od.type='button'; od.className='og-del'; od.title='Remove option'; od.textContent='\\u00d7';
        od.addEventListener('click',function(){g.options.splice(oi,1);draw(b);sync(b);});
        o.appendChild(oin); o.appendChild(od); opts.appendChild(o);
      });
      row.appendChild(opts);
      var addOpt=document.createElement('button'); addOpt.type='button'; addOpt.className='og-add-opt'; addOpt.textContent='+ Add option';
      addOpt.addEventListener('click',function(){g.options=g.options||[];g.options.push('');draw(b);sync(b);});
      row.appendChild(addOpt);
      wrap.appendChild(row);
    });
  }
  function sync(b){ b.querySelector('input[name=option_groups]').value=JSON.stringify(b._groups); }
  function initBuilders(){
    document.querySelectorAll('.og-builder').forEach(function(b){
      if(b._init) return;
      b._init=true;
      var hidden=b.querySelector('input[name=option_groups]');
      try{ b._groups=JSON.parse(hidden.value||'[]'); }catch(e){ b._groups=[]; }
      if(!Array.isArray(b._groups)) b._groups=[];
      draw(b);
      b.querySelector('.og-add-group').addEventListener('click',function(){
        b._groups.push({name:'',options:['']}); draw(b); sync(b);
      });
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initBuilders);
  } else {
    initBuilders();
  }
})();`

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
      <p className="a-sub">Edit the order-form products. Add option groups (e.g. <code style={{ fontFamily: "'DM Mono',monospace" }}>Format</code> with choices A4, 50×70 cm) to give customers multiple-choice selections. Every product also shows a comment field on the form.</p>

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
          <OptionGroupsBuilder groups={[]} />
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
              <OptionGroupsBuilder groups={groupsToJson(p)} />
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

      <script dangerouslySetInnerHTML={{ __html: BUILDER_SCRIPT }} />
    </>
  )
}
