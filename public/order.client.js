// ══ Can Artwork & Production — order form logic ══

const T = window.__T || {};
const LANG = window.__LANG || 'en';
const VARIANTS = window.__VARIANTS || {};                 // { "Tuborg": ["Classic", ...], ... }
const PANT_EXEMPT = (window.__PANT_EXEMPT || 'Border');   // region that hides the deposit mark

// ── State ──
const state = {
  brand: null,        // brand name, '' = "I don't know yet"
  brandUnknown: false,
  variant: '',
  size: '',
  region: '',
  labelType: '',
  artwork: false,
  smash: false,
};
let uploadedFiles = []; // { path, name, size }
window.__editId = null;

function g(id) { return document.getElementById(id)?.value?.trim() || ''; }
function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ── Brand selection ──
function selectBrand(el) {
  document.querySelectorAll('.brand-tile.selected').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
  state.brandUnknown = el.dataset.unknown === '1';
  state.brand = state.brandUnknown ? '' : (el.dataset.brand || '');
  populateVariants();
  document.getElementById('err-brand')?.classList.remove('show');
}

function populateVariants() {
  const sel = document.getElementById('variant');
  if (!sel) return;
  const prev = state.variant;
  const list = (!state.brandUnknown && state.brand && Array.isArray(VARIANTS[state.brand])) ? VARIANTS[state.brand] : [];
  let html = `<option value="">${escHtml(T.variant_ph || 'Choose variant…')}</option>`;
  list.forEach(v => { html += `<option value="${escHtml(v)}">${escHtml(v)}</option>`; });
  html += `<option value="__unknown__">${escHtml(T.brand_unknown || "I don't know yet")}</option>`;
  sel.innerHTML = html;
  sel.disabled = false;
  // keep previous selection if still valid
  if (prev && (prev === '__unknown__' || list.includes(prev))) sel.value = prev;
  else { sel.value = ''; state.variant = ''; }
}

// ── Segmented controls ──
function selectSize(el) {
  document.querySelectorAll('#size-chips .size-chip.selected').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.size = el.dataset.size || '';
  document.getElementById('err-size')?.classList.remove('show');
}
function selectRegion(el) {
  document.querySelectorAll('#region-seg .seg-btn.selected').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  state.region = el.dataset.region || '';
  updatePantmaerke();
}
function selectLabelType(el) {
  document.querySelectorAll('#labeltype-seg .seg-btn.selected').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  state.labelType = el.dataset.labeltype || '';
}
// Hide/omit the deposit mark when the exempt region (e.g. Border) is chosen
function updatePantmaerke() {
  const card = document.getElementById('pantmaerke-card');
  if (!card) return;
  const exempt = state.region && state.region.toLowerCase() === String(PANT_EXEMPT).toLowerCase();
  card.classList.toggle('hidden', exempt);
}

// ── Toggles ──
function toggleLegal() {
  const toggle = document.getElementById('legal-toggle');
  const active = toggle.classList.toggle('active');
  document.getElementById('legal-expand').classList.toggle('show', active);
  if (active) document.getElementById('consent-error').classList.remove('visible');
}
function toggleArtwork() {
  state.artwork = !state.artwork;
  document.getElementById('artwork-toggle').classList.toggle('active', state.artwork);
}
function toggleSmash() {
  state.smash = !state.smash;
  document.getElementById('smash-toggle').classList.toggle('active', state.smash);
}

// ── File uploads (direct to Supabase Storage via signed URL) ──
const MAX_UPLOAD = 50 * 1024 * 1024;
async function handleFiles(input) {
  const files = Array.from(input.files || []);
  input.value = '';
  for (const file of files) {
    if (file.size > MAX_UPLOAD) { showToast(file.name + ' ' + (T.upload_exceeds || 'exceeds 50 MB'), 'error'); continue; }
    showToast((T.upload_uploading || 'Uploading') + ' ' + file.name + '…', '');
    try {
      const r = await fetch('/api/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Upload failed');
      const put = await fetch(d.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, body: file });
      if (!put.ok) throw new Error('Upload failed (' + put.status + ')');
      uploadedFiles.push({ path: d.path, name: file.name, size: file.size });
      renderUploads();
      showToast(file.name + ' ' + (T.upload_uploaded || 'uploaded'), 'success');
    } catch (e) {
      showToast((T.upload_error || 'Could not upload') + ' ' + file.name + ': ' + e.message, 'error');
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

// ── Validation ──
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function flashError() {
  const btn = document.querySelector('.review-order-btn');
  if (btn) { btn.classList.remove('btn-shake'); void btn.offsetWidth; btn.classList.add('btn-shake'); btn.addEventListener('animationend', () => btn.classList.remove('btn-shake'), { once: true }); }
  const overlay = document.getElementById('legal-overlay');
  if (overlay) { overlay.classList.remove('flash'); void overlay.offsetWidth; overlay.classList.add('flash'); }
}
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
    const invalid = id === 'bestiller_email' ? !isValidEmail(val) : !val;
    el.classList.toggle('error', invalid);
    if (errEl) errEl.classList.toggle('show', invalid);
    if (invalid) ok = false;
  });

  // Brand: a tile (including "I don't know yet") must be selected
  const brandPicked = !!document.querySelector('.brand-tile.selected');
  document.getElementById('err-brand')?.classList.toggle('show', !brandPicked);
  if (!brandPicked) ok = false;

  // Size required
  if (!state.size) { document.getElementById('err-size')?.classList.add('show'); ok = false; }
  else document.getElementById('err-size')?.classList.remove('show');

  // GDPR consent
  const legalActive = document.getElementById('legal-toggle').classList.contains('active');
  document.getElementById('consent-error').classList.toggle('visible', !legalActive);
  if (!legalActive) ok = false;

  if (!ok) flashError();
  return ok;
}

// ── Collect the can brief ──
function collectPayload() {
  const variantSel = document.getElementById('variant');
  let variant = '';
  if (variantSel && variantSel.value) variant = variantSel.value === '__unknown__' ? (T.brand_unknown || "I don't know yet") : variantSel.value;

  const exempt = state.region && state.region.toLowerCase() === String(PANT_EXEMPT).toLowerCase();
  const pantmaerke = exempt ? false : !!document.getElementById('pantmaerke')?.checked;

  return {
    butiksnavn:    g('butiksnavn'),
    navn:          g('bestiller_navn'),
    email:         g('bestiller_email'),
    delivery_date: g('delivery_date') || null,

    brand:         state.brandUnknown ? (T.brand_unknown || "I don't know yet") : state.brand,
    variant,
    size:          state.size,
    region:        state.region,
    label_type:    state.labelType,
    cutterguide:   g('cutterguide'),
    finish:        g('finish'),
    material_old:  g('material_old'),
    material_new:  g('material_new'),
    ean:           g('ean'),
    pantmaerke,
    ingredients:   g('ingredients'),

    andet:         '',
    artwork_help:  state.artwork,
    smash_link:    state.smash,
    uploads:       uploadedFiles,

    previous_id:   window.__editId || null,
    language:      LANG,
  };
}

// ── Review popup ──
function rvRow(label, val, cls) {
  const v = (val == null || val === '') ? (T.rv_none || '—') : val;
  return `<div class="rv-row${cls && cls.full ? ' full' : ''}"><div class="rv-label">${escHtml(label)}</div><div class="rv-val${cls && cls.mod ? ' ' + cls.mod : ''}">${cls && cls.html ? v : escHtml(v)}</div></div>`;
}

function goToReview() {
  if (!validate()) return;
  const p = collectPayload();
  const exempt = p.region && p.region.toLowerCase() === String(PANT_EXEMPT).toLowerCase();

  const orderer = [
    rvRow(T.f_campaign || 'Campaign', p.butiksnavn),
    rvRow(T.f_name || 'Name', p.navn),
    rvRow(T.f_email || 'Email', p.email, { full: true, mod: 'mono' }),
    rvRow(T.f_deadline || 'Deadline', p.delivery_date ? fmtDate(p.delivery_date) : null),
  ].join('');

  const can = [
    rvRow(T.f_brand || 'Brand', p.brand),
    rvRow(T.f_variant || 'Variant', p.variant),
    rvRow(T.f_size || 'Size', p.size),
    rvRow(T.f_region || 'Region', p.region),
    rvRow(T.f_label_type || 'Label type', p.label_type),
    rvRow(T.f_finish || 'Finish', p.finish),
    rvRow(T.f_cutterguide || 'Cutterguide', p.cutterguide, { full: true }),
  ].join('');

  const production = [
    rvRow(T.f_material_old || 'Material no. (old)', p.material_old),
    rvRow(T.f_material_new || 'Material no. (new)', p.material_new),
    rvRow(T.f_ean || 'EAN', p.ean),
    exempt ? '' : rvRow(T.f_pantmaerke || 'Pantmærke', p.pantmaerke ? (T.rv_yes || 'Yes') : (T.rv_no || 'No')),
    p.ingredients ? rvRow(T.f_ingredients || 'Ingredients', p.ingredients, { full: true, mod: 'pre' }) : '',
  ].join('');

  let artwork = '';
  if (p.artwork_help) artwork += rvRow(T.f_artwork || 'Artwork', T.rv_help_requested || 'Help requested', { full: true });
  if (p.smash_link) artwork += rvRow(T.f_smash || 'Smash upload link', T.rv_smash_requested || 'Requested', { full: true });

  let html =
    `<div class="rv-section"><div class="rv-section-label">${escHtml(T.review_orderer || 'Orderer')}</div><div class="rv-grid">${orderer}</div></div>` +
    `<div class="rv-section"><div class="rv-section-label">${escHtml(T.review_can || 'Can brief')}</div><div class="rv-grid">${can}</div></div>` +
    `<div class="rv-section"><div class="rv-section-label">${escHtml(T.review_production || 'Production details')}</div><div class="rv-grid">${production}</div></div>`;

  if (artwork) html += `<div class="rv-section"><div class="rv-section-label">${escHtml(T.review_artwork_section || 'Artwork')}</div><div class="rv-grid">${artwork}</div></div>`;

  if (uploadedFiles.length) {
    html += `<div class="rv-section"><div class="rv-section-label">${escHtml(T.review_files || 'Attached files')}</div><div class="rv-files-grid">${uploadedFiles.map(fileCardHtml).join('')}</div></div>`;
  }

  document.getElementById('rv-body').innerHTML = html;
  openModal();
  setPill(2);
}

function openModal() { document.getElementById('review-modal').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal() { document.getElementById('review-modal').classList.remove('open'); document.body.style.overflow = ''; }
function goBack() { closeModal(); setPill(1); }

// ── File card rendering for review ──
function fmtDate(d) {
  try { return new Date(d).toLocaleDateString(LANG === 'da' ? 'da-DK' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function makeBadge(ext, bg, color) { const el = document.createElement('div'); el.className = 'rv-file-badge'; el.style.background = bg; el.style.color = color; el.textContent = ext.slice(0, 4) || '?'; return el; }
function fileCardHtml(f) {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'tif', 'tiff'].includes(ext);
  const supaUrl = (window.__SUPABASE_URL || '').replace(/\/+$/, '');
  const pubUrl = supaUrl ? `${supaUrl}/storage/v1/object/public/order-uploads/${f.path}` : '';
  const BADGE = {
    pdf: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    ai: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' }, eps: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' }, svg: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
    psd: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' }, indd: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
    zip: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  };
  const imgBadge = { bg: 'rgba(158,214,184,0.14)', color: '#9ed6b8' };
  const defBadge = { bg: 'var(--surface-3)', color: 'var(--text-3)' };
  const badge = isImg ? imgBadge : (BADGE[ext] || defBadge);
  const visual = (isImg && pubUrl)
    ? `<img class="rv-file-thumb" src="${pubUrl}" alt="${escHtml(f.name)}" onerror="this.replaceWith(makeBadge('${ext}','${badge.bg}','${badge.color}'))"/>`
    : `<div class="rv-file-badge" style="background:${badge.bg};color:${badge.color};">${escHtml(ext.slice(0, 4) || '?')}</div>`;
  return `<div class="rv-file-card">${visual}<div class="rv-file-info"><div class="rv-file-name">${escHtml(f.name)}</div>${f.size ? `<div class="rv-file-size">${fmtSize(f.size)}</div>` : ''}</div></div>`;
}

// ── Submit ──
async function submitOrder() {
  const btn = document.querySelector('#review-modal .btn-primary');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = (T.toast_sending || 'Sending…');

  const payload = collectPayload();
  try {
    const res = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    window.__submittedOrderId = data.orderId;
    document.getElementById('conf-email').textContent = payload.email;
    closeModal();
    showView('view-confirm'); setPill(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(T.toast_submitted || 'Order submitted! Check your email.', 'success');

    window.__editId = null;
    window.history.replaceState({}, '', '/');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

function editSubmittedOrder() {
  if (window.__submittedOrderId) window.location.href = '/?edit=' + window.__submittedOrderId;
  else { showView('view-form'); setPill(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}
let __closeTimer = null;
function closePage() {
  const overlay = document.getElementById('close-overlay');
  const countEl = document.getElementById('close-count');
  let n = 5;
  countEl.textContent = n;
  overlay.classList.add('open');
  __closeTimer = setInterval(() => {
    n -= 1;
    countEl.textContent = Math.max(n, 0);
    if (n <= 0) {
      clearInterval(__closeTimer); __closeTimer = null;
      window.close();
      // Browsers block window.close() for tabs they didn't open — leave a fallback message.
      setTimeout(() => {
        const label = document.getElementById('close-label');
        if (label) label.textContent = (T.toast_close_tab || 'You can now close this tab.');
      }, 250);
    }
  }, 1000);
}
function cancelAutoClose() {
  if (__closeTimer) { clearInterval(__closeTimer); __closeTimer = null; }
  document.getElementById('close-overlay').classList.remove('open');
  editSubmittedOrder();
}

// ── Prefill from ?edit= (when a customer edits via the email link) ──
async function prefillFromOrder(orderId) {
  try {
    const res = await fetch('/api/order-data?id=' + orderId);
    if (!res.ok) return;
    const d = await res.json();
    window.__editId = orderId;

    if (d.butiksnavn) document.getElementById('butiksnavn').value = d.butiksnavn;
    if (d.navn) document.getElementById('bestiller_navn').value = d.navn;
    if (d.email) document.getElementById('bestiller_email').value = d.email;
    if (d.delivery_date) document.getElementById('delivery_date').value = d.delivery_date;

    // Brand + variant
    if (d.brand != null) {
      const unknownText = (T.brand_unknown || "I don't know yet");
      let tile = null;
      if (d.brand && d.brand !== unknownText) {
        tile = Array.from(document.querySelectorAll('.brand-tile')).find(t => t.dataset.brand === d.brand);
      }
      if (!tile) tile = document.querySelector('.brand-tile.unknown');
      if (tile) selectBrand(tile);
      if (d.variant) {
        const sel = document.getElementById('variant');
        if (d.variant === unknownText) sel.value = '__unknown__';
        else if (Array.from(sel.options).some(o => o.value === d.variant)) sel.value = d.variant;
        state.variant = sel.value;
      }
    }

    // Size
    if (d.size) { const c = Array.from(document.querySelectorAll('#size-chips .size-chip')).find(x => x.dataset.size === d.size); if (c) selectSize(c); }
    // Region
    if (d.region) { const b = Array.from(document.querySelectorAll('#region-seg .seg-btn')).find(x => x.dataset.region === d.region); if (b) selectRegion(b); }
    // Label type
    if (d.label_type) { const b = Array.from(document.querySelectorAll('#labeltype-seg .seg-btn')).find(x => x.dataset.labeltype === d.label_type); if (b) selectLabelType(b); }
    // Finish
    if (d.finish) { const sel = document.getElementById('finish'); if (Array.from(sel.options).some(o => o.value === d.finish)) sel.value = d.finish; }

    if (d.cutterguide) document.getElementById('cutterguide').value = d.cutterguide;
    if (d.material_old) document.getElementById('material_old').value = d.material_old;
    if (d.material_new) document.getElementById('material_new').value = d.material_new;
    if (d.ean) document.getElementById('ean').value = d.ean;
    const pant = document.getElementById('pantmaerke'); if (pant) pant.checked = !!d.pantmaerke;
    if (d.ingredients) document.getElementById('ingredients').value = d.ingredients;

    if (d.artwork_help && !state.artwork) toggleArtwork();
    if (d.smash_link && !state.smash) toggleSmash();
    if (Array.isArray(d.uploads)) { uploadedFiles = d.uploads.slice(); renderUploads(); }

    updatePantmaerke();
    showToast(T.toast_order_loaded || 'Order loaded — edit and resubmit', '');
  } catch (err) {
    console.error('Prefill error:', err);
  }
}

// ── Helpers ──
function showView(id) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function setPill(n) { document.querySelectorAll('.step-pill').forEach((p, i) => { p.classList.remove('active', 'done'); if (i + 1 < n) p.classList.add('done'); else if (i + 1 === n) p.classList.add('active'); }); }
function showToast(msg, type = '') { const t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast ' + (type === 'success' ? 'success' : type === 'error' ? 'error-t' : ''); t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3500); }

function setLang(l) { document.cookie = 'lang=' + l + ';path=/;max-age=31536000;SameSite=Lax'; location.reload(); }

// ── Init ──
(function init() {
  const btn = document.getElementById('lang-' + LANG);
  if (btn) btn.classList.add('active');

  // Read server-rendered default selections into state
  state.region = document.querySelector('#region-seg .seg-btn.selected')?.dataset.region || '';
  state.labelType = document.querySelector('#labeltype-seg .seg-btn.selected')?.dataset.labeltype || '';
  updatePantmaerke();

  // Close modal on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('review-modal').classList.contains('open')) goBack(); });

  const editId = new URLSearchParams(window.location.search).get('edit');
  if (editId) prefillFromOrder(editId);
})();
