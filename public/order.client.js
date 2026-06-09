// ── State ──
let addrType = 'butik';
let altAddrActive = false;
let artworkRequested = false;
let smashRequested = false;
let uploadedFiles = []; // { path, name, size }

const PRODUCTS = window.__PRODUCTS || [];
const selectedOptions = {}; // { pid: { groupName: value } }
const customFormats = {};   // { pid: string }
const productInstances = {}; // { basePid: count }
const extraEntries = [];     // duplicate product entries
const selfPrint = {};        // { pid: bool } — customer handles print process themselves

const _ICON  = '<span class="prod-icon"><svg class="prod-icon-empty" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg><svg class="prod-icon-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="8 12 11 15 16 9"/></svg></span>';
const _MINUS = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const _PLUS  = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const _CHEV  = '<svg class="acc-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
const _CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

function _esc(s) { return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function renderInstanceHTML(cfg, spid, n) {
  const groupsHtml = (cfg.groupDefs || []).map((g, gi) => {
    const recs = Array.isArray(g.recommended) ? g.recommended : [];
    const chips = (g.options || []).map(o => `<span class="format-chip${recs.includes(o)?' rec':''}" onclick="selectOption(this,'${spid}',${gi})">${_esc(o)}</span>`).join('');
    const cfmt = cfg.customFormat ? `<input type="text" id="cfmt-${spid}" class="custom-fmt-input" placeholder="${_esc((window.__T||{}).custom_fmt_ph||'Other format in mm')}" oninput="updateCustomFmt('${spid}',this)"/>` : '';
    return `<div class="opt-group"><span class="opt-label">${_esc(g.name)}</span><div class="opt-chips" id="opt-${spid}-${gi}">${chips}${cfmt}</div></div>`;
  }).join('');
  const _t = window.__T || {};
  return `<div class="produkt-acc open" id="prodacc-${spid}">
    <div class="produkt-acc-head-row">
      <button type="button" class="produkt-acc-head" onclick="toggleProduct('${spid}')">
        <span class="produkt-name">${_ICON}${_esc(cfg.type)} <span style="color:var(--text-3);font-size:11px;font-family:'IBM Plex Mono',monospace;margin-left:4px;">#${n}</span></span>
        <span class="acc-right"><span class="acc-qty" id="accqty-${spid}"></span>${_CHEV}</span>
      </button>
      <button type="button" class="remove-instance-btn" onclick="removeProductInstance('${spid}')" title="Remove">×</button>
    </div>
    <div class="produkt-acc-body open" id="accbody-${spid}">
      ${groupsHtml}
      <div class="alt-addr-toggle self-print-toggle" id="selfprint-toggle-${spid}" onclick="toggleSelfPrint('${spid}')">
        <div class="toggle-switch"></div>
        <span class="alt-addr-toggle-label">${_esc(_t.self_print_toggle || 'I will handle the print process myself.')}</span>
      </div>
      <div class="acc-row">
        <span class="opt-label">${_esc(_t.qty_label || 'Quantity')}</span>
        <div class="qty-stepper">
          <button type="button" onclick="stepQty('qty-${spid}',-1)">${_MINUS}</button>
          <input type="number" id="qty-${spid}" value="0" min="0" oninput="updateQtyBadge('${spid}')"/>
          <button type="button" onclick="stepQty('qty-${spid}',1)">${_PLUS}</button>
        </div>
      </div>
      <div class="field-error" id="err-qty-${spid}">${_esc(_t.qty_err || 'Please enter a quantity greater than 0')}</div>
      <div class="acc-comment">
        <span class="opt-label">${_esc(_t.comment_label || 'Comment')}</span>
        <textarea id="cmt-${spid}" rows="2" placeholder="${_esc(_t.comment_ph || 'Notes for this product (optional)…')}"></textarea>
      </div>
      <button type="button" class="add-instance-btn" onclick="addProductInstance('${cfg.pid}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> ${_esc(cfg.type)}</button>
    </div>
  </div>`;
}

function addProductInstance(pid) {
  const cfg = PRODUCTS.find(p => p.pid === pid);
  if (!cfg) return;
  productInstances[pid] = (productInstances[pid] || 1) + 1;
  const n = productInstances[pid];
  const spid = pid + '__' + n;
  const html = renderInstanceHTML(cfg, spid, n);
  const grp = document.getElementById('prodgrp-' + pid);
  if (grp) grp.insertAdjacentHTML('beforeend', html);
  extraEntries.push({ type: cfg.type, pid: spid, qty: 'qty-' + spid, cmt: 'cmt-' + spid, groups: cfg.groups, groupDefs: cfg.groupDefs, customFormat: cfg.customFormat });
}

function removeProductInstance(spid) {
  document.getElementById('prodacc-' + spid)?.remove();
  const i = extraEntries.findIndex(e => e.pid === spid);
  if (i >= 0) extraEntries.splice(i, 1);
  delete selectedOptions[spid];
  delete customFormats[spid];
  delete selfPrint[spid];
}

function updateCustomFmt(pid, el) {
  const v = el.value.trim();
  customFormats[pid] = v;
  el.classList.toggle('active', v.length > 0);
  // deselect any chip in same group when user types a custom value
  if (v) {
    const chips = el.parentElement ? el.parentElement.querySelectorAll('.format-chip.active') : [];
    chips.forEach(c => c.classList.remove('active'));
    const prod = PRODUCTS.find(p => p.pid === pid) || extraEntries.find(e => e.pid === pid);
    if (prod && prod.groups[0]) {
      selectedOptions[pid] = selectedOptions[pid] || {};
      delete selectedOptions[pid][prod.groups[0]];
    }
  }
  refreshRecState(el.parentElement);
}

const ARTWORK_TYPE = 'Artwork';
const SMASH_TYPE = 'Smash upload link';

// ── Prefill fra ?edit=ordreId (når kunde fortryder via mail-link) ──
window.__editId = null;
async function prefillFromOrder(orderId) {
  try {
    const res = await fetch('/api/order-data?id=' + orderId);
    if (!res.ok) return;
    const d = await res.json();

    window.__editId = orderId;

    // Grundoplysninger
    if (d.butiksnavn) document.getElementById('butiksnavn').value = d.butiksnavn;
    if (d.navn)       document.getElementById('bestiller_navn').value = d.navn;
    if (d.email)      document.getElementById('bestiller_email').value = d.email;
    if (d.delivery_date) document.getElementById('delivery_date').value = d.delivery_date;

    // Produkter
    if (Array.isArray(d.produkter)) {
      d.produkter.forEach(p => {
        if (p.type === ARTWORK_TYPE) {
          if (!artworkRequested) toggleArtwork();
          return;
        }
        if (p.type === SMASH_TYPE) {
          if (!smashRequested) toggleSmash();
          return;
        }
        const cfg = PRODUCTS.find(x => x.type === p.type);
        if (!cfg) return;
        if (p.self_print && !selfPrint[cfg.pid]) toggleSelfPrint(cfg.pid);
        const qtyEl = document.getElementById(cfg.qty);
        if (qtyEl && p.antal != null) { qtyEl.value = p.antal; updateQtyBadge(cfg.pid); }
        // Restore selected options (new) or legacy single format
        const opts = p.options || (p.format ? { [cfg.groups[0]]: p.format } : null);
        if (opts) {
          cfg.groups.forEach((name, gi) => {
            const val = opts[name];
            if (val == null) return;
            const wanted = Array.isArray(val) ? val : [val];
            const sel = [];
            document.querySelectorAll('#opt-' + cfg.pid + '-' + gi + ' .format-chip').forEach(chip => {
              if (wanted.includes(chip.textContent)) { chip.classList.add('active'); sel.push(chip.textContent); }
            });
            refreshRecState(document.getElementById('opt-' + cfg.pid + '-' + gi));
            if (sel.length) {
              selectedOptions[cfg.pid] = selectedOptions[cfg.pid] || {};
              selectedOptions[cfg.pid][name] = sel;
            }
          });
        }
        if (p.comment) { const c = document.getElementById(cfg.cmt); if (c) c.value = p.comment; }
        if (p.antal > 0 || opts || p.comment || p.self_print) toggleProduct(cfg.pid, true);
      });
    }
    if (d.andet) document.getElementById('andet').value = d.andet;
    if (Array.isArray(d.uploads)) { uploadedFiles = d.uploads.slice(); renderUploads(); }

    // Levering
    if (d.addr_type) { addrType = d.addr_type; setAddrTab(d.addr_type); }
    if (d.gade)   document.getElementById('gade').value = d.gade;
    if (d.postnr) document.getElementById('postnr').value = d.postnr;
    if (d.by)     document.getElementById('by').value = d.by;
    if (d.land)   document.getElementById('land').value = d.land;
    if (d.att)    document.getElementById('att').value = d.att;
    if (d.tlf)    document.getElementById('tlf_lev').value = d.tlf;

    // Alternativ adresse
    if (d.alt_active && d.alt_gade) {
      toggleAltAddr();
      document.getElementById('alt_gade').value = d.alt_gade || '';
      document.getElementById('alt_postnr').value = d.alt_postnr || '';
      document.getElementById('alt_by').value = d.alt_by || '';
      document.getElementById('alt_att').value = d.alt_att || '';
      document.getElementById('alt_tlf').value = d.alt_tlf || '';
    }

    // Konsulent
    if (d.konsulent_navn)  document.getElementById('konsulent_navn').value = d.konsulent_navn;
    if (d.konsulent_tlf)   document.getElementById('konsulent_tlf').value = d.konsulent_tlf;
    if (d.konsulent_email) document.getElementById('konsulent_email').value = d.konsulent_email;

    showToast((window.__T?.toast_order_loaded) || 'Order loaded — edit and resubmit', '');
  } catch (err) {
    console.error('Prefill fejl:', err);
  }
}

// Check if page was opened via ?edit= link from cancel email
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('edit');
if (editId) {
  window.addEventListener('DOMContentLoaded', () => prefillFromOrder(editId));
}

// ── Accordion expand/collapse ──
function toggleProduct(pid, forceOpen) {
  const body = document.getElementById('accbody-' + pid);
  if (!body || !body.parentElement) return;
  if (forceOpen === true) body.parentElement.classList.add('open');
  else body.parentElement.classList.toggle('open');
}

// Hide the orange "standard assortment" overlay once a non-standard choice
// is made in a group (a non-recommended chip, or a typed custom format).
function refreshRecState(container) {
  if (!container) return;
  const activeChip = container.querySelector('.format-chip.active');
  const activeCustom = container.querySelector('.custom-fmt-input.active');
  const diverged = (activeChip && !activeChip.classList.contains('rec')) || !!activeCustom;
  container.classList.toggle('rec-hidden', diverged);
}

// ── Option selection (one choice per group) ──
function selectOption(chip, pid, groupIndex) {
  const wasActive = chip.classList.contains('active');
  chip.parentElement.querySelectorAll('.format-chip.active').forEach(c => c.classList.remove('active'));
  if (!wasActive) chip.classList.add('active');
  const prod = PRODUCTS.find(p => p.pid === pid);
  const name = prod && prod.groups[groupIndex];
  refreshRecState(chip.parentElement);
  if (!name) return;
  selectedOptions[pid] = selectedOptions[pid] || {};
  selectedOptions[pid][name] = Array.from(chip.parentElement.querySelectorAll('.format-chip.active')).map(c => c.textContent);
}

// ── Quantity stepper ──
function stepQty(id, delta) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = Math.max(0, (parseInt(el.value) || 0) + delta);
  updateQtyBadge(id.replace(/^qty-/, ''));
}

// Show the chosen quantity on the collapsed accordion header
function updateQtyBadge(pid) {
  const el = document.getElementById('qty-' + pid);
  const badge = document.getElementById('accqty-' + pid);
  if (!el || !badge) return;
  const v = parseInt(el.value) || 0;
  const self = !!selfPrint[pid];
  const _t2 = window.__T || {};
  badge.textContent = self ? (_t2.badge_self_print || 'Self-print') : (v > 0 ? ('× ' + v) : '');
  const acc = el.closest('.produkt-acc');
  if (acc) acc.classList.toggle('filled', v > 0 || self);
  if (v > 0 || self) {
    el.classList.remove('error');
    document.getElementById('err-qty-' + pid)?.classList.remove('show');
    if ([...PRODUCTS, ...extraEntries].some(p => parseInt(document.getElementById(p.qty)?.value || 0) > 0 || selfPrint[p.pid])) {
      document.getElementById('err-products')?.classList.remove('show');
    }
  }
}

// ── File uploads (direct to Supabase Storage via signed URL) ──
const MAX_UPLOAD = 50 * 1024 * 1024;
async function handleFiles(input) {
  const files = Array.from(input.files || []);
  input.value = '';
  for (const file of files) {
    const _ut = window.__T || {};
    if (file.size > MAX_UPLOAD) { showToast(file.name + ' ' + (_ut.upload_exceeds || 'exceeds 50 MB'), 'error'); continue; }
    showToast((_ut.upload_uploading || 'Uploading') + ' ' + file.name + '…', '');
    try {
      const r = await fetch('/api/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Upload failed');
      const put = await fetch(d.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, body: file });
      if (!put.ok) throw new Error('Upload failed (' + put.status + ')');
      uploadedFiles.push({ path: d.path, name: file.name, size: file.size });
      renderUploads();
      showToast(file.name + ' ' + (window.__T?.upload_uploaded || 'uploaded'), 'success');
    } catch (e) {
      showToast((window.__T?.upload_error || 'Could not upload') + ' ' + file.name + ': ' + e.message, 'error');
    }
  }
}
function removeUpload(i) { uploadedFiles.splice(i, 1); renderUploads(); }
function renderUploads() {
  const c = document.getElementById('upload-list');
  if (!c) return;
  c.innerHTML = uploadedFiles.map((f, i) =>
    `<div class="upload-item"><span>📎 ${escHtml(f.name)}</span><button type="button" class="upload-remove" onclick="removeUpload(${i})" aria-label="Remove">×</button></div>`
  ).join('');
}

// ── Address tabs ──
function setAddrTab(type) {
  addrType = type;
}

function toggleAltAddr() {
  altAddrActive = !altAddrActive;
  document.getElementById('alt-addr-toggle').classList.toggle('active', altAddrActive);
  document.getElementById('alt-addr-fields').classList.toggle('show', altAddrActive);
}

function toggleArtwork() {
  artworkRequested = !artworkRequested;
  document.getElementById('artwork-toggle').classList.toggle('active', artworkRequested);
}

function toggleSmash() {
  smashRequested = !smashRequested;
  document.getElementById('smash-toggle').classList.toggle('active', smashRequested);
}

function toggleSelfPrint(pid) {
  selfPrint[pid] = !selfPrint[pid];
  document.getElementById('selfprint-toggle-' + pid)?.classList.toggle('active', selfPrint[pid]);
  document.getElementById('accbody-' + pid)?.classList.toggle('self-on', selfPrint[pid]);
  updateQtyBadge(pid);
}

function toggleOrderHelp() {
  document.getElementById('oh-trigger').classList.toggle('open');
  document.getElementById('oh-content').classList.toggle('open');
}

function flashError() {
  const reviewBtn = document.querySelector('#view-form .btn-primary');
  reviewBtn.classList.remove('btn-shake');
  void reviewBtn.offsetWidth;
  reviewBtn.classList.add('btn-shake');
  reviewBtn.addEventListener('animationend', () => reviewBtn.classList.remove('btn-shake'), { once: true });
  const overlay = document.getElementById('legal-overlay');
  overlay.classList.remove('flash');
  void overlay.offsetWidth;
  overlay.classList.add('flash');
}

// ── Validation ──
function validate() {
  let ok = true;
  [
    { id: 'butiksnavn', err: 'err-butiksnavn' },
    { id: 'bestiller_navn', err: 'err-bestiller_navn' },
    { id: 'bestiller_email', err: 'err-bestiller_email' },
  ].forEach(({ id, err }) => {
    const el = document.getElementById(id);
    const errEl = document.getElementById(err);
    const val = el ? el.value.trim() : '';
    const isEmail = id === 'bestiller_email';
    const invalid = isEmail ? !isValidEmail(val) : !val;
    el.classList.toggle('error', invalid);
    if (errEl) errEl.classList.toggle('show', invalid);
    if (invalid) ok = false;
  });

  // Open accordions with qty > 0 must be valid; open accordions with qty 0 only
  // block submission if no other product has been filled in.
  const allEntries = [...PRODUCTS, ...extraEntries];
  const hasQty = allEntries.some(p => parseInt(document.getElementById(p.qty)?.value || 0) > 0);
  const hasSelf = allEntries.some(p => selfPrint[p.pid]);
  const hasAndet = document.getElementById('andet')?.value.trim();
  const hasAnyProduct = hasQty || hasSelf || hasAndet;

  allEntries.forEach(({ pid, qty: qtyId }) => {
    const body = document.getElementById('accbody-' + pid);
    const isOpen = body && body.parentElement.classList.contains('open');
    const qtyEl = document.getElementById(qtyId);
    const qty = parseInt(qtyEl?.value || 0);
    const errEl = document.getElementById('err-qty-' + pid);
    if (isOpen && qty <= 0 && !selfPrint[pid] && !hasAnyProduct) {
      if (qtyEl) qtyEl.classList.add('error');
      if (errEl) errEl.classList.add('show');
      ok = false;
    } else {
      if (qtyEl) qtyEl.classList.remove('error');
      if (errEl) errEl.classList.remove('show');
    }
  });
  const prodErrEl = document.getElementById('err-products');
  if (!hasQty && !hasSelf && !hasAndet) {
    if (prodErrEl) prodErrEl.classList.add('show');
    ok = false;
  } else {
    if (prodErrEl) prodErrEl.classList.remove('show');
  }

  // GDPR consent must be accepted
  const legalActive = document.getElementById('legal-toggle').classList.contains('active');
  const consentErr = document.getElementById('consent-error');
  consentErr.classList.toggle('visible', !legalActive);
  if (!legalActive) ok = false;

  if (!ok) flashError();
  return ok;
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fileCardHtml(f) {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const isImg = ['png','jpg','jpeg','gif','webp','tif','tiff'].includes(ext);
  const supaUrl = (window.__SUPABASE_URL || '').replace(/\/+$/, '');
  const pubUrl = supaUrl ? `${supaUrl}/storage/v1/object/public/order-uploads/${f.path}` : '';

  const BADGE = {
    pdf:  { bg: 'rgba(239,68,68,0.15)',  color: '#f87171' },
    ai:   { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
    eps:  { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
    svg:  { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
    psd:  { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
    indd: { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
    zip:  { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  };
  const imgBadge = { bg: 'rgba(241,86,46,0.12)', color: '#f1562e' };
  const defBadge = { bg: 'var(--surface-3)', color: 'var(--text-3)' };
  const badge = isImg ? imgBadge : (BADGE[ext] || defBadge);

  const visual = (isImg && pubUrl)
    ? `<img class="rv-file-thumb" src="${pubUrl}" alt="${escHtml(f.name)}" onerror="this.replaceWith(makeBadge('${ext}','${badge.bg}','${badge.color}'))"/>`
    : `<div class="rv-file-badge" style="background:${badge.bg};color:${badge.color};">${escHtml(ext.slice(0,4) || '?')}</div>`;

  return `<div class="rv-file-card">
    ${visual}
    <div class="rv-file-info">
      <div class="rv-file-name">${escHtml(f.name)}</div>
      ${f.size ? `<div class="rv-file-size">${fmtSize(f.size)}</div>` : ''}
    </div>
  </div>`;
}

function makeBadge(ext, bg, color) {
  const el = document.createElement('div');
  el.className = 'rv-file-badge';
  el.style.background = bg; el.style.color = color;
  el.textContent = ext.slice(0,4) || '?';
  return el;
}

// ── Go to review ──
function goToReview() {
  if (!validate()) return;

  const _rt = window.__T || {};
  v('rv-butiksnavn', g('butiksnavn'));
  v('rv-navn', g('bestiller_navn'));
  v('rv-email', g('bestiller_email'));
  const dd = g('delivery_date');
  const _dtLocale = window.__LANG === 'da' ? 'da-DK' : 'en-GB';
  v('rv-delivery-date', dd ? new Date(dd).toLocaleDateString(_dtLocale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  v('rv-addrtype', addrType === 'butik' ? (_rt.review_business_addr || 'Business address') : (_rt.review_private_addr || 'Private address'));
  v('rv-addr', [g('gade'), g('postnr'), g('by'), g('land')].filter(Boolean).join(', ') || '—');
  v('rv-att', g('att') || '—');
  v('rv-tlf', g('tlf_lev') || '—');
  v('rv-k-navn', g('konsulent_navn') || '—');
  v('rv-k-tlf', g('konsulent_tlf') || '—');
  v('rv-k-email', g('konsulent_email') || '—');

  // Alt addr
  const altSec = document.getElementById('rv-alt-section');
  if (altAddrActive && g('alt_gade')) {
    altSec.style.display = '';
    v('rv-alt-addr', [g('alt_gade'), g('alt_postnr'), g('alt_by')].filter(Boolean).join(', '));
    v('rv-alt-att', g('alt_att') || '—');
    v('rv-alt-tlf', g('alt_tlf') || '—');
  } else {
    altSec.style.display = 'none';
  }

  // Produkter
  const rvProd = document.getElementById('rv-products');
  rvProd.innerHTML = '';

  [...PRODUCTS, ...extraEntries].forEach(({ type, pid, qty: qtyId, cmt, groups, customFormat }) => {
    const qty = parseInt(document.getElementById(qtyId)?.value || 0);
    const isSelf = !!selfPrint[pid];
    if (qty <= 0 && !isSelf) return;
    const opts = selectedOptions[pid] || {};
    const cfmt = customFormat ? (customFormats[pid] || '') : '';
    const optStr = groups.map((n, gi) => {
      if (customFormat && gi === 0 && cfmt) return `${escHtml(n)}: ${escHtml(cfmt)}`;
      const v = opts[n];
      if (!v || (Array.isArray(v) && !v.length)) return null;
      return `${escHtml(n)}: ${escHtml(Array.isArray(v) ? v.join(', ') : v)}`;
    }).filter(Boolean).join(' · ');
    const comment = document.getElementById(cmt)?.value.trim();
    const qtyLine = isSelf ? (_rt.review_handles_print || 'Handles print process themselves') : ((_rt.review_qty || 'Qty:') + ' ' + qty);
    const meta = [qtyLine, optStr || null, comment ? ((_rt.review_comment || 'Comment:') + ' ' + escHtml(comment)) : null].filter(Boolean).join('<br>');
    const d = document.createElement('div');
    d.className = 'rv-produkt-row';
    d.innerHTML = `
      <div class="rv-produkt-name">${escHtml(type)}</div>
      <div class="rv-produkt-meta">${meta}</div>
    `;
    rvProd.appendChild(d);
  });

  const andet = g('andet');
  if (andet) {
    const d = document.createElement('div');
    d.className = 'rv-produkt-row';
    d.style.flexDirection = 'column';
    d.style.alignItems = 'flex-start';
    d.style.gap = '6px';
    d.innerHTML = `
      <div class="rv-produkt-name">${escHtml(_rt.review_brief || 'Brief')}</div>
      <div style="font-size:13px;color:var(--text-2);line-height:1.5;white-space:pre-wrap;word-break:break-word;">${escHtml(andet)}</div>
    `;
    rvProd.appendChild(d);
  }

  if (artworkRequested) {
    const d = document.createElement('div');
    d.className = 'rv-produkt-row';
    d.innerHTML = `
      <div class="rv-produkt-name">${escHtml(_rt.review_artwork || 'Artwork')}</div>
      <div class="rv-produkt-meta">${escHtml(_rt.review_help_requested || 'Help requested')}</div>
    `;
    rvProd.appendChild(d);
  }

  if (smashRequested) {
    const d = document.createElement('div');
    d.className = 'rv-produkt-row';
    d.innerHTML = `
      <div class="rv-produkt-name">${escHtml(_rt.review_smash || 'Smash upload link')}</div>
      <div class="rv-produkt-meta">${escHtml(_rt.review_smash_requested || 'Requested · brandsurface.fromsmash.com')}</div>
    `;
    rvProd.appendChild(d);
  }

  if (!rvProd.children.length) {
    rvProd.innerHTML = '<div style="color:var(--text-3);font-size:14px;">—</div>';
  }

  // Uploaded files
  const rvUpSec = document.getElementById('rv-uploads-section');
  const rvFiles = document.getElementById('rv-files');
  if (uploadedFiles.length) {
    rvFiles.innerHTML = uploadedFiles.map(fileCardHtml).join('');
    rvUpSec.style.display = '';
  } else {
    rvUpSec.style.display = 'none';
  }

  showView('view-review');
  setPill(2);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() { showView('view-form'); setPill(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function editSubmittedOrder() {
  if (window.__submittedOrderId) window.location.href = '/?edit=' + window.__submittedOrderId;
  else { showView('view-form'); setPill(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}

function toggleLegal() {
  const toggle = document.getElementById('legal-toggle');
  const expand = document.getElementById('legal-expand');
  const active = toggle.classList.toggle('active');
  expand.classList.toggle('show', active);
  if (active) document.getElementById('consent-error').classList.remove('visible');
}

async function submitOrder() {
  const btn = document.querySelector('#view-review .btn-primary');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = (window.__T?.toast_sending) || 'Sending...';

  // Collect products
  const produkter = [];
  [...PRODUCTS, ...extraEntries].forEach(({ type, pid, qty: qtyId, cmt, groups, customFormat }) => {
    const antal = parseInt(document.getElementById(qtyId)?.value || 0);
    const isSelf = !!selfPrint[pid];
    if (antal <= 0 && !isSelf) return;
    const entry = isSelf
      ? { type, self_print: true, note: 'Customer handles the print process themselves' }
      : { type, antal };
    const cfmt = customFormat ? (customFormats[pid] || '') : '';
    const opts = {};
    groups.forEach((n, gi) => {
      if (customFormat && gi === 0 && cfmt) { opts[n] = cfmt; return; }
      const v = selectedOptions[pid] && selectedOptions[pid][n];
      if (Array.isArray(v) ? v.length : v) opts[n] = v;
    });
    if (Object.keys(opts).length) entry.options = opts;
    const comment = document.getElementById(cmt)?.value.trim();
    if (comment) entry.comment = comment;
    produkter.push(entry);
  });
  if (artworkRequested) produkter.push({ type: ARTWORK_TYPE, note: 'Help with key visual requested' });
  if (smashRequested) produkter.push({ type: SMASH_TYPE, note: 'Smash upload link wanted · brandsurface.fromsmash.com' });

  const payload = {
    butiksnavn:      g('butiksnavn'),
    navn:            g('bestiller_navn'),
    email:           g('bestiller_email'),
    delivery_date:   g('delivery_date') || null,
    produkter,
    andet:           g('andet'),
    addr_type:       addrType,
    gade:            g('gade'),
    postnr:          g('postnr'),
    by:              g('by'),
    land:            g('land'),
    att:             g('att'),
    tlf:             g('tlf_lev'),
    alt_active:      altAddrActive,
    alt_gade:        g('alt_gade'),
    alt_postnr:      g('alt_postnr'),
    alt_by:          g('alt_by'),
    alt_att:         g('alt_att'),
    alt_tlf:         g('alt_tlf'),
    konsulent_navn:  g('konsulent_navn'),
    konsulent_tlf:   g('konsulent_tlf'),
    konsulent_email: g('konsulent_email'),
    uploads:         uploadedFiles,
    previous_id:     window.__editId || null,
    language:        window.__LANG || 'en',
  };

  try {
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Server error');

    window.__submittedOrderId = data.orderId;
    document.getElementById('conf-email').textContent = g('bestiller_email');
    showView('view-confirm'); setPill(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast((window.__T?.toast_submitted) || 'Order submitted! Check your email.', 'success');

    // Ryd edit-state efter succes
    window.__editId = null;
    window.history.replaceState({}, '', '/');

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

function closePage() {
  window.close();
  // Browsers won't close tabs they didn't open via script — show a fallback
  setTimeout(() => showToast((window.__T?.toast_close_tab) || 'Thank you! You can now close this tab.', 'success'), 150);
}

function resetForm() {
  document.querySelectorAll('input[type="text"],input[type="email"],input[type="date"]').forEach(el => el.value = '');
  document.querySelectorAll('input[type="number"]').forEach(el => el.value = 0);
  document.querySelectorAll('textarea').forEach(el => el.value = '');
  document.querySelectorAll('.format-chip').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.opt-chips.rec-hidden').forEach(c => c.classList.remove('rec-hidden'));
  document.querySelectorAll('.produkt-acc.open').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.produkt-acc.filled').forEach(a => a.classList.remove('filled'));
  document.querySelectorAll('.acc-qty').forEach(b => b.textContent = '');
  Object.keys(selectedOptions).forEach(k => delete selectedOptions[k]);
  Object.keys(customFormats).forEach(k => delete customFormats[k]);
  Object.keys(productInstances).forEach(k => delete productInstances[k]);
  Object.keys(selfPrint).forEach(k => delete selfPrint[k]);
  document.querySelectorAll('.self-print-toggle.active').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.produkt-acc-body.self-on').forEach(b => b.classList.remove('self-on'));
  extraEntries.length = 0;
  document.querySelectorAll('.produkt-acc[id^="prodacc-"][id*="__"]').forEach(el => el.remove());
  document.querySelectorAll('.custom-fmt-input').forEach(el => { el.value = ''; el.classList.remove('active'); });
  uploadedFiles = []; renderUploads();
  addrType = 'butik'; setAddrTab('butik');
  if (altAddrActive) toggleAltAddr();
  if (artworkRequested) toggleArtwork();
  if (smashRequested) toggleSmash();
  showView('view-form'); setPill(1); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function g(id) { return document.getElementById(id)?.value?.trim() || ''; }
function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function v(id, val) { const el = document.getElementById(id); if (el) el.textContent = val || '—'; }
function showView(id) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function setPill(n) { document.querySelectorAll('.step-pill').forEach((p, i) => { p.classList.remove('active','done'); if (i+1 < n) p.classList.add('done'); else if (i+1 === n) p.classList.add('active'); }); }
function showToast(msg, type='') { const t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast ' + (type==='success'?'success':type==='error'?'error-t':''); t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 3500); }

// Language switcher
function setLang(l) {
  document.cookie = 'lang=' + l + ';path=/;max-age=31536000;SameSite=Lax';
  location.reload();
}
(function() {
  const active = window.__LANG || 'en';
  const btn = document.getElementById('lang-' + active);
  if (btn) btn.classList.add('active');
})();

// Keep the "Review order" button visible at the bottom of the viewport so it
// rides along smoothly while scrolling the form (no jump).
(function () {
  const btn = document.querySelector('.review-order-btn');
  if (!btn) return;
  const ph = document.createElement('div');   // reserves the button's slot in the column
  ph.setAttribute('aria-hidden', 'true');
  ph.style.display = 'none';
  btn.parentNode.insertBefore(ph, btn);

  function sync() {
    const col = btn.closest('.grid-right');
    const onForm = document.getElementById('view-form')?.classList.contains('active');
    if (!col || !onForm || window.innerWidth <= 900) { unpin(); return; }
    if (!btn.classList.contains('pinned')) {
      ph.style.height = btn.offsetHeight + 'px';
      ph.style.display = 'block';
      btn.classList.add('pinned');
    }
    const r = col.getBoundingClientRect();
    btn.style.left = r.left + 'px';
    btn.style.width = r.width + 'px';
  }
  function unpin() {
    if (!btn.classList.contains('pinned')) return;
    btn.classList.remove('pinned');
    btn.style.left = '';
    btn.style.width = '';
    ph.style.display = 'none';
    ph.style.height = '';
  }
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
})();
