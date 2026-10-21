function blankState() {
  return {
    brandId: 'decorabano',
    format: 'short',
    imageMotion: 'auto',
    logoUrl: '',
    portada: { titulo: '', parrafo: '', imageUrl: '' },
    productos: [newProduct()],
    cupones: { enabled: false, titulo: '', codigos: '', disclaimer: '' },
    cierre: { titulo: '', cta: '', refuerzo: '' },
    audio: { locucionUrl: '', musicaUrl: '' },
    // Original filenames of the uploads, keyed by their data-upload path, so the
    // labels still say "mampara.jpg" after a reload instead of going blank.
    fileNames: {},
  };
}

const state = blankState();

function newProduct() {
  return { titulo: '', precioAntes: '', precioActual: '', descuento: '', mediaUrl: '', mediaType: 'image' };
}

// ---- Session persistence -------------------------------------------------
// Everything the form holds is plain JSON and the uploads already live on the
// server under /uploads, so storing the state is enough to restore a session:
// the media URLs stay valid. Saved per browser, not per user.
const STORAGE_KEY = 'banners.video.state.v1';

const persist = debounce(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), state }));
    setSaveStatus(Date.now());
  } catch (err) {
    setSaveStatus(null, 'No se pudo guardar (almacenamiento lleno o bloqueado).');
  }
}, 400);

// Merge the saved snapshot key by key: an older snapshot missing a field, or a
// corrupt one, degrades to the defaults instead of breaking the form.
function loadSavedState() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch { return null; }
  const s = saved && saved.state;
  if (!s || typeof s !== 'object') return null;

  const str = (v, fallback = '') => (typeof v === 'string' ? v : fallback);
  state.brandId = str(s.brandId, state.brandId);
  state.format = s.format === 'youtube' ? 'youtube' : 'short';
  state.imageMotion = str(s.imageMotion, 'auto');
  state.logoUrl = str(s.logoUrl);
  for (const k of ['titulo', 'parrafo', 'imageUrl']) state.portada[k] = str(s.portada?.[k]);
  for (const k of ['titulo', 'cta', 'refuerzo']) state.cierre[k] = str(s.cierre?.[k]);
  for (const k of ['titulo', 'codigos', 'disclaimer']) state.cupones[k] = str(s.cupones?.[k]);
  state.cupones.enabled = !!s.cupones?.enabled;
  for (const k of ['locucionUrl', 'musicaUrl']) state.audio[k] = str(s.audio?.[k]);
  if (Array.isArray(s.productos) && s.productos.length) {
    state.productos = s.productos.map((p) => ({
      ...newProduct(),
      titulo: str(p?.titulo), precioAntes: str(p?.precioAntes), precioActual: str(p?.precioActual),
      descuento: str(p?.descuento), mediaUrl: str(p?.mediaUrl),
      mediaType: p?.mediaType === 'video' ? 'video' : 'image',
    }));
  }
  if (s.fileNames && typeof s.fileNames === 'object') {
    for (const [k, v] of Object.entries(s.fileNames)) if (typeof v === 'string') state.fileNames[k] = v;
  }
  return saved.savedAt || null;
}

function setSaveStatus(savedAt, message) {
  const el = document.getElementById('save-status');
  if (!el) return;
  if (message) { el.textContent = message; return; }
  el.textContent = savedAt
    ? `Guardado automáticamente a las ${new Date(savedAt).toLocaleTimeString('es-ES')}.`
    : 'Los campos se guardan solos en este navegador.';
}

// Push the (possibly restored) state into the form controls.
function applyStateToForm() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('brand-select', state.brandId);
  set('image-motion', state.imageMotion);
  set('p-titulo', state.portada.titulo);
  set('p-parrafo', state.portada.parrafo);
  set('c-titulo', state.cierre.titulo);
  set('c-cta', state.cierre.cta);
  set('c-refuerzo', state.cierre.refuerzo);
  set('cup-titulo', state.cupones.titulo);
  set('cup-codigos', state.cupones.codigos);
  set('cup-disclaimer', state.cupones.disclaimer);

  document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('active', b.dataset.format === state.format));
  const cupEnabled = document.getElementById('cup-enabled');
  cupEnabled.checked = state.cupones.enabled;
  document.getElementById('cup-fields').hidden = !state.cupones.enabled;
  applyFileNames();
}

// File inputs can't be prefilled, so show the stored name next to them instead.
function applyFileNames() {
  document.querySelectorAll('[data-name]').forEach((el) => {
    const path = el.dataset.name;
    const name = state.fileNames[path];
    if (name) el.textContent = name;
  });
}

const FORMAT_DIMS = {
  short: { w: 1080, h: 1920, previewW: 232 },
  youtube: { w: 1920, h: 1080, previewW: 440 },
};

async function init() {
  const catalog = await fetch('/api/catalog').then((r) => r.json());
  const brandSelect = document.getElementById('brand-select');
  for (const b of catalog.brands) {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    brandSelect.appendChild(opt);
  }

  // Restore the last session before any control is read or rendered.
  const savedAt = loadSavedState();
  if (!catalog.brands.some((b) => b.id === state.brandId)) state.brandId = catalog.brands[0].id;
  applyStateToForm();
  setSaveStatus(savedAt);

  brandSelect.addEventListener('change', () => { state.brandId = brandSelect.value; refreshAllPreviews(); persist(); });

  // Format toggle
  document.querySelectorAll('.seg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.format = btn.dataset.format;
      document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('active', b === btn));
      renderGrid();
      persist();
    });
  });

  // Image motion select
  const motionEl = document.getElementById('image-motion');
  if (motionEl) {
    motionEl.addEventListener('change', () => { state.imageMotion = motionEl.value; refreshAllPreviews(); persist(); });
  }

  // Simple text bindings
  bindText('p-titulo', (v) => (state.portada.titulo = v));
  bindText('p-parrafo', (v) => (state.portada.parrafo = v));
  bindText('c-titulo', (v) => (state.cierre.titulo = v));
  bindText('c-cta', (v) => (state.cierre.cta = v));
  bindText('c-refuerzo', (v) => (state.cierre.refuerzo = v));
  bindText('cup-titulo', (v) => (state.cupones.titulo = v));
  bindText('cup-codigos', (v) => (state.cupones.codigos = v));
  bindText('cup-disclaimer', (v) => (state.cupones.disclaimer = v));

  // Cupones toggle
  const cupEnabled = document.getElementById('cup-enabled');
  cupEnabled.addEventListener('change', () => {
    state.cupones.enabled = cupEnabled.checked;
    document.getElementById('cup-fields').hidden = !cupEnabled.checked;
    renderGrid();
    persist();
  });

  document.getElementById('clear-saved').addEventListener('click', () => {
    if (!confirm('Se borrarán todos los campos guardados de este vídeo. ¿Continuar?')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  // File uploads bound by data-upload="path.to.field"
  document.querySelectorAll('input[data-upload]').forEach((inp) => {
    inp.addEventListener('change', () => onUpload(inp));
  });

  document.getElementById('add-product').addEventListener('click', () => {
    state.productos.push(newProduct());
    renderProductList();
    renderGrid();
    persist();
  });

  document.getElementById('generate-btn').addEventListener('click', onGenerate);

  renderProductList();
  renderGrid();
  updateGenerateBtn();
}

function bindText(id, setter) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', debounce(() => { setter(el.value); refreshAllPreviews(); persist(); }, 250));
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = value;
}

async function onUpload(inp) {
  const file = inp.files?.[0];
  if (!file) return;
  const nameEl = document.querySelector(`[data-name="${inp.dataset.upload}"]`);
  if (nameEl) nameEl.textContent = 'Subiendo…';
  try {
    const url = await uploadFile(file);
    setByPath(state, inp.dataset.upload, url);
    // media type for product uploads
    if (inp.dataset.upload.endsWith('.mediaUrl')) {
      const idx = Number(inp.dataset.index);
      state.productos[idx].mediaType = file.type.startsWith('video') ? 'video' : 'image';
    }
    state.fileNames[inp.dataset.upload] = file.name;
    if (nameEl) nameEl.textContent = file.name;
    refreshAllPreviews();
    updateGenerateBtn();
    persist();
  } catch (err) {
    if (nameEl) nameEl.textContent = 'Error: ' + err.message;
  }
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append('image', file);
  const r = await fetch('/api/upload', { method: 'POST', body: fd }).then((r) => r.json());
  if (r.error) throw new Error(r.error);
  return r.url;
}

// ---- Product list UI ----
function renderProductList() {
  const wrap = document.getElementById('product-list');
  wrap.innerHTML = '';
  state.productos.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'product';
    el.innerHTML = `
      <h4>Producto ${i + 1} ${state.productos.length > 1 ? `<span class="link" data-remove="${i}">quitar</span>` : ''}</h4>
      <label class="blk">Título
        <input type="text" data-p="${i}.titulo" value="${escapeAttr(p.titulo)}" placeholder="Nombre del producto"></label>
      <div class="two">
        <label class="blk">Precio antes
          <input type="text" data-p="${i}.precioAntes" value="${escapeAttr(p.precioAntes)}" placeholder="399 €"></label>
        <label class="blk">Precio actual
          <input type="text" data-p="${i}.precioActual" value="${escapeAttr(p.precioActual)}" placeholder="249 €"></label>
      </div>
      <label class="blk">Descuento (opcional, si vacío se calcula)
        <input type="text" data-p="${i}.descuento" value="${escapeAttr(p.descuento)}" placeholder="-38%"></label>
      <label class="blk">Foto o vídeo
        <input type="file" accept="image/*,video/*" data-upload="productos.${i}.mediaUrl" data-index="${i}">
        <span class="file-name" data-name="productos.${i}.mediaUrl">${p.mediaUrl ? p.mediaType : ''}</span></label>
    `;
    wrap.appendChild(el);
  });
  applyFileNames();

  wrap.querySelectorAll('input[data-p]').forEach((inp) => {
    inp.addEventListener('input', debounce(() => {
      const [idx, key] = inp.dataset.p.split('.');
      state.productos[Number(idx)][key] = inp.value;
      refreshAllPreviews();
      persist();
    }, 250));
  });
  wrap.querySelectorAll('input[data-upload]').forEach((inp) => {
    inp.addEventListener('change', () => onUpload(inp));
  });
  wrap.querySelectorAll('[data-remove]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = Number(el.dataset.remove);
      state.productos.splice(idx, 1);
      shiftProductFileNames(idx);
      renderProductList();
      renderGrid();
      persist();
    });
  });
}

// fileNames is keyed by position (`productos.2.mediaUrl`), so removing a product
// has to shift the keys after it or the labels end up on the wrong rows.
function shiftProductFileNames(removedIdx) {
  const next = {};
  for (const [key, name] of Object.entries(state.fileNames)) {
    const m = /^productos\.(\d+)\.mediaUrl$/.exec(key);
    if (!m) { next[key] = name; continue; }
    const i = Number(m[1]);
    if (i === removedIdx) continue;
    next[`productos.${i > removedIdx ? i - 1 : i}.mediaUrl`] = name;
  }
  state.fileNames = next;
}

// ---- Slide preview grid ----
function slideList() {
  const list = [{ type: 'portada', label: 'Portada' }];
  state.productos.forEach((_, i) => list.push({ type: 'producto', label: `Producto ${i + 1}`, index: i }));
  if (state.cupones.enabled) list.push({ type: 'cupones', label: 'Cupones' });
  list.push({ type: 'cierre', label: 'Cierre' });
  return list;
}

function slideData(slide) {
  switch (slide.type) {
    case 'portada': return state.portada;
    case 'producto': return state.productos[slide.index];
    case 'cupones': return {
      titulo: state.cupones.titulo,
      codigos: state.cupones.codigos.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      disclaimer: state.cupones.disclaimer,
    };
    case 'cierre': return state.cierre;
    default: return {};
  }
}

function renderGrid() {
  const grid = document.getElementById('slide-grid');
  const dims = FORMAT_DIMS[state.format];
  const scale = dims.previewW / dims.w;
  const previewH = Math.round(dims.h * scale);
  grid.innerHTML = '';
  for (const slide of slideList()) {
    const card = document.createElement('div');
    card.className = 'vcard';
    card.style.width = dims.previewW + 'px';
    card.innerHTML = `
      <header><span>${slide.label}</span><span>${dims.w}×${dims.h}</span></header>
      <div class="vwrap" style="height:${previewH}px">
        <iframe style="width:${dims.w}px;height:${dims.h}px;transform:scale(${scale});" sandbox="allow-same-origin allow-scripts"></iframe>
      </div>
    `;
    grid.appendChild(card);
    refreshPreview(card.querySelector('iframe'), slide);
  }
}

async function refreshPreview(iframe, slide) {
  try {
    const r = await fetch('/api/video/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandId: state.brandId,
        format: state.format,
        logoUrl: state.logoUrl,
        imageMotion: state.imageMotion,
        slide: { type: slide.type, data: slideData(slide), index: slide.index || 0 },
      }),
    });
    iframe.srcdoc = await r.text();
  } catch (err) {
    console.error('preview error', err);
  }
}

const refreshAllPreviews = debounce(() => {
  const iframes = document.querySelectorAll('#slide-grid iframe');
  const slides = slideList();
  iframes.forEach((f, i) => slides[i] && refreshPreview(f, slides[i]));
}, 120);

function updateGenerateBtn() {
  document.getElementById('generate-btn').disabled = !state.portada.imageUrl;
}

function buildPayload() {
  const payload = {
    brandId: state.brandId,
    format: state.format,
    imageMotion: state.imageMotion,
    logoUrl: state.logoUrl || undefined,
    portada: state.portada,
    productos: state.productos,
    cierre: state.cierre,
    audio: {
      locucionUrl: state.audio.locucionUrl || undefined,
      musicaUrl: state.audio.musicaUrl || undefined,
    },
  };
  if (state.cupones.enabled) {
    payload.cupones = {
      titulo: state.cupones.titulo,
      codigos: state.cupones.codigos.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      disclaimer: state.cupones.disclaimer,
    };
  }
  return payload;
}

async function onGenerate() {
  if (!state.portada.imageUrl) return;
  const overlay = document.getElementById('overlay');
  const msg = document.getElementById('overlay-msg');
  overlay.hidden = false;
  const t0 = Date.now();
  const timer = setInterval(() => {
    msg.textContent = `Renderizando vídeo… ${Math.round((Date.now() - t0) / 1000)}s (puede tardar 1-3 min)`;
  }, 500);
  try {
    const r = await fetch('/api/video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText }));
      throw new Error(err.error || 'Error generando');
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${state.brandId}-${state.format}-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    clearInterval(timer);
    overlay.hidden = true;
  }
}

function escapeAttr(s) { return String(s ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function debounce(fn, wait) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; }

init();
