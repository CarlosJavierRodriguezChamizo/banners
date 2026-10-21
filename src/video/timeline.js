// Build the ordered slide list (with durations + transitions) from a video payload.

const DEFAULTS = {
  portada: 3000,
  producto: 4000,
  cupones: 4500,
  cierre: 5000,
  transition: 500, // xfade overlap between consecutive slides
};

// Videos must run at least this long; any shortfall is added to the cupones
// and cierre slides (see enforceMinDuration).
const MIN_TOTAL_MS = 30000;

const FORMATS = {
  short:   { w: 1080, h: 1920, name: 'short' },   // TikTok / Reels / Shorts
  youtube: { w: 1920, h: 1080, name: 'youtube' }, // YouTube horizontal
};

function resolveFormat(f) {
  const fmt = FORMATS[f] || FORMATS.short;
  return { ...fmt };
}

function buildTimeline(payload = {}) {
  const brandId = payload.brandId;
  if (!brandId) throw new Error('brandId required');
  const t = payload.timings || {};
  const slides = [];

  slides.push({
    type: 'portada', brandId,
    data: payload.portada || {},
    durationMs: Number(t.portada) || DEFAULTS.portada,
  });

  for (const prod of payload.productos || []) {
    const isVideo = prod.mediaType === 'video' && !!prod.mediaUrl;
    slides.push({
      type: 'producto', brandId,
      data: prod,
      durationMs: Number(t.producto) || DEFAULTS.producto,
      overlayOnly: isVideo,
      mediaUrl: prod.mediaUrl,
      mediaType: isVideo ? 'video' : 'image',
    });
  }

  const cup = payload.cupones;
  const hasCupones = cup && ((cup.codigos || []).filter(Boolean).length > 0 || (cup.disclaimer || '').trim());
  if (hasCupones) {
    slides.push({
      type: 'cupones', brandId,
      data: cup,
      durationMs: Number(t.cupones) || DEFAULTS.cupones,
    });
  }

  slides.push({
    type: 'cierre', brandId,
    data: payload.cierre || {},
    durationMs: Number(t.cierre) || DEFAULTS.cierre,
  });

  const transition = t.transition != null ? Number(t.transition) : DEFAULTS.transition;
  return { slides, transition, format: resolveFormat(payload.format) };
}

// Ensure the visible video (sum of durations minus the transition overlaps)
// lasts at least MIN_TOTAL_MS by extending the cierre and cupones slides.
// Mutates slide durations in place. `transTotalMs` is the sum of all xfade
// durations. Returns the resulting visible total (ms).
function enforceMinDuration(slides, transTotalMs) {
  const visible = () => slides.reduce((a, s) => a + s.durationMs, 0) - transTotalMs;
  let deficit = MIN_TOTAL_MS - visible();
  if (deficit <= 0) return visible();

  const cierre = slides.find((s) => s.type === 'cierre');
  const cupones = slides.find((s) => s.type === 'cupones');
  if (cupones && cierre) {
    const toCupones = Math.round(deficit * 0.45);
    cupones.durationMs += toCupones;
    cierre.durationMs += deficit - toCupones;
  } else if (cierre) {
    cierre.durationMs += deficit;
  } else {
    slides[slides.length - 1].durationMs += deficit;
  }
  return visible();
}

module.exports = { buildTimeline, enforceMinDuration, resolveFormat, DEFAULTS, MIN_TOTAL_MS, FORMATS };
