const state = {
  brandId: 'decorabano',
  campaign: 'generic', // generic | black-friday | cyber-monday
  discount: '',
  copy: 'Tu baño no se va a reformar solo, confía en los expertos',
  subcopy: '',
  cta: 'Quiero reformar mi baño',
  imageUrl: '',
  perFormat: {}, // id → { focalX, focalY, veil }
  formats: [],
  formatsByBrand: {},
};

const PREVIEW_WIDTH = 320; // px shown on screen for each format card

async function init() {
  const catalog = await fetch('/api/catalog').then((r) => r.json());

  // Populate brand select
  const brandSelect = document.getElementById('brand-select');
  for (const b of catalog.brands) {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    brandSelect.appendChild(opt);
  }
  brandSelect.value = state.brandId;
  brandSelect.addEventListener('change', () => {
    state.brandId = brandSelect.value;
    setFormatsForBrand();
    refreshAllPreviews();
    updateGenerateBtn();
  });

  // Campaign selector (one radio per campaign) + optional discount label.
  const campaignBox = document.getElementById('campaign-options');
  const discountRow = document.getElementById('discount-row');
  for (const c of catalog.campaigns) {
    const label = document.createElement('label');
    label.className = 'row';
    label.innerHTML = `<input type="radio" name="campaign" value="${c.id}"><span>${c.name}</span>`;
    const radio = label.querySelector('input');
    radio.checked = c.id === state.campaign;
    radio.addEventListener('change', () => {
      state.campaign = radio.value;
      discountRow.hidden = state.campaign === 'generic';
      refreshAllPreviews();
    });
    campaignBox.appendChild(label);
  }
  discountRow.hidden = state.campaign === 'generic';
  const discountEl = document.getElementById('discount');
  discountEl.addEventListener('input', debounce(() => { state.discount = discountEl.value; refreshAllPreviews(); }, 250));

  // Bind text inputs
  const copyEl = document.getElementById('copy');
  const subcopyEl = document.getElementById('subcopy');
  const ctaEl = document.getElementById('cta');
  copyEl.value = state.copy;
  ctaEl.value = state.cta;
  copyEl.addEventListener('input', debounce(() => { state.copy = copyEl.value; refreshAllPreviews(); }, 250));
  subcopyEl.addEventListener('input', debounce(() => { state.subcopy = subcopyEl.value; refreshAllPreviews(); }, 250));
  ctaEl.addEventListener('input', debounce(() => { state.cta = ctaEl.value; refreshAllPreviews(); }, 250));

  // Image upload
  document.getElementById('image-input').addEventListener('change', onImageUpload);

  // Global veil toggle
  document.getElementById('veil-all').addEventListener('change', (e) => {
    for (const id of Object.keys(state.perFormat)) {
      state.perFormat[id].veil = e.target.checked;
    }
    document.querySelectorAll('input[data-veil-toggle]').forEach((el) => {
      el.checked = e.target.checked;
    });
    refreshAllPreviews();
  });
  document.getElementById('reset-focal').addEventListener('click', () => {
    for (const id of Object.keys(state.perFormat)) {
      state.perFormat[id].focalX = 50;
      state.perFormat[id].focalY = 50;
      state.perFormat[id].zoom = 1;
    }
    document.querySelectorAll('.focal-dot').forEach((el) => {
      el.style.left = '50%';
      el.style.top = '50%';
    });
    document.querySelectorAll('input[data-zoom-slider]').forEach((el) => {
      el.value = '1';
      const valEl = el.closest('.format-card').querySelector('.zoom-value');
      if (valEl) valEl.textContent = '1.00×';
    });
    refreshAllPreviews();
  });

  // Generate button
  document.getElementById('generate-btn').addEventListener('click', onGenerate);

  // Build format grid (formats depend on the selected brand)
  state.formatsByBrand = catalog.formatsByBrand;
  setFormatsForBrand();
  updateGenerateBtn();
}

function setFormatsForBrand() {
  state.formats = state.formatsByBrand[state.brandId] || [];
  for (const f of state.formats) {
    if (!state.perFormat[f.id]) {
      state.perFormat[f.id] = { focalX: 50, focalY: 50, veil: false, zoom: 1 };
    }
  }
  renderFormatGrid();
}

function renderFormatGrid() {
  const grid = document.getElementById('format-grid');
  grid.innerHTML = '';
  for (const f of state.formats) {
    const card = document.createElement('div');
    card.className = 'format-card';
    card.dataset.formatId = f.id;

    const aspect = f.w / f.h;
    const previewW = PREVIEW_WIDTH;
    const previewH = Math.round(previewW / aspect);
    const scale = previewW / f.w;

    // Text-only deliverables carry no photo, so hide the image controls.
    const isText = f.part === 'text';
    const badge = f.label ? `${f.platform} · ${f.label}` : f.platform;

    const imageControls = isText ? '' : `
      <div class="controls">
        <label class="row">
          <input type="checkbox" data-veil-toggle data-id="${f.id}">
          <span>Velo</span>
        </label>
        <span class="hint">Click en la previa = focal point</span>
      </div>
      <div class="zoom-row">
        <span class="zoom-label">Zoom</span>
        <input type="range" min="1" max="3" step="0.05" value="1" data-zoom-slider data-id="${f.id}">
        <span class="zoom-value">1.00×</span>
      </div>
    `;

    card.innerHTML = `
      <header>
        <strong>${f.w} × ${f.h}</strong>
        <span class="platform">${badge}</span>
      </header>
      <div class="preview-wrap" style="height:${previewH}px;" data-id="${f.id}">
        <iframe class="preview-frame"
          style="width:${f.w}px; height:${f.h}px; transform: scale(${scale});"
          sandbox="allow-same-origin"></iframe>
        ${isText ? '' : '<div class="focal-dot" style="left:50%; top:50%;"></div>'}
        ${isText ? '' : '<div class="focal-empty">Sube una imagen para empezar</div>'}
      </div>
      ${imageControls}
    `;
    grid.appendChild(card);

    if (isText) continue;

    const wrap = card.querySelector('.preview-wrap');
    wrap.addEventListener('click', (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      state.perFormat[f.id].focalX = clamp(x, 0, 100);
      state.perFormat[f.id].focalY = clamp(y, 0, 100);
      const dot = wrap.querySelector('.focal-dot');
      dot.style.left = state.perFormat[f.id].focalX + '%';
      dot.style.top = state.perFormat[f.id].focalY + '%';
      refreshPreview(f.id);
    });

    const veilToggle = card.querySelector('input[data-veil-toggle]');
    veilToggle.addEventListener('change', () => {
      state.perFormat[f.id].veil = veilToggle.checked;
      refreshPreview(f.id);
    });

    const zoomSlider = card.querySelector('input[data-zoom-slider]');
    const zoomValue  = card.querySelector('.zoom-value');
    zoomSlider.addEventListener('input', () => {
      const z = parseFloat(zoomSlider.value);
      state.perFormat[f.id].zoom = z;
      zoomValue.textContent = z.toFixed(2) + '×';
      refreshPreview(f.id);
    });
  }
}

async function onImageUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  const statusEl = document.getElementById('image-status');
  statusEl.textContent = 'Subiendo…';
  try {
    const r = await fetch('/api/upload', { method: 'POST', body: fd }).then((r) => r.json());
    if (r.error) throw new Error(r.error);
    state.imageUrl = r.url;
    statusEl.textContent = `Lista: ${r.filename}`;
    document.querySelectorAll('.focal-empty').forEach((el) => el.style.display = 'none');
    refreshAllPreviews();
    updateGenerateBtn();
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
}

async function refreshPreview(formatId) {
  const f = state.formats.find((x) => x.id === formatId);
  if (!f) return;
  const card = document.querySelector(`.format-card[data-format-id="${formatId}"]`);
  if (!card) return;
  const iframe = card.querySelector('iframe');
  const cfg = state.perFormat[formatId];

  try {
    const r = await fetch('/api/preview-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandId: state.brandId,
        campaign: state.campaign,
        discount: state.discount,
        copy: state.copy,
        subcopy: state.subcopy,
        cta: state.cta,
        imageUrl: state.imageUrl,
        focal: { x: cfg.focalX, y: cfg.focalY },
        veil: cfg.veil,
        zoom: cfg.zoom,
        format: { w: f.w, h: f.h, platform: f.platform, part: f.part },
      }),
    });
    const html = await r.text();
    iframe.srcdoc = html;
  } catch (err) {
    console.error('preview error', err);
  }
}

const refreshAllPreviews = debounce(() => {
  for (const f of state.formats) refreshPreview(f.id);
}, 100);

function updateGenerateBtn() {
  document.getElementById('generate-btn').disabled = !state.imageUrl;
}

async function onGenerate() {
  if (!state.imageUrl) return;
  const overlay = document.getElementById('overlay');
  const msg = document.getElementById('overlay-msg');
  overlay.hidden = false;
  msg.textContent = `Renderizando ${state.formats.length} banners… esto tarda ~30s`;

  try {
    const r = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandId: state.brandId,
        campaign: state.campaign,
        discount: state.discount,
        copy: state.copy,
        subcopy: state.subcopy,
        cta: state.cta,
        imageUrl: state.imageUrl,
        perFormat: state.perFormat,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText }));
      throw new Error(err.error || 'Error generando');
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const campaignSuffix = state.campaign === 'generic' ? '' : `-${state.campaign}`;
    a.download = `banners-${state.brandId}${campaignSuffix}-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    overlay.hidden = true;
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

init();
