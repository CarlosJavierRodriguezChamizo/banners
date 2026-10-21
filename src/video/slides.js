// Slide HTML generators for the video pipeline. Each slide is layout-aware
// (vertical 1080x1920 vs horizontal 1920x1080) and themed from the brand config
// in src/brands.js via a normalized palette.
//
// Portada + producto use the brand's banner language: a solid brand-color panel
// on the TOP THIRD and the image filling the bottom two thirds. Orange is the
// shared promo/action accent (CTA, savings badge, coupon notes).

const { getBrand } = require('../brands');
const {
  escapeHtml, copyToHtml, normalizeCopyKeepingBreaks, fitFontExact,
} = require('../templates/shared');
const { logoSvg } = require('../logo');
const { slideDocument, anim } = require('./animate');

// Shared promo/action accent used across brands (CTA, savings, coupon notes).
const ORANGE = '#F26B2A';
// Top panel occupies one third; the image fills the rest.
const PANEL_FRAC = 0.37;
// Grid square of the brand line pattern, in rem — one single (large) scale for
// every surface, so panels and full-bleed slides read as the same wall.
const PATTERN_CELL_REM = 26;

// Solomamparas "tags" treatment (matches src/templates/tags.js exactly):
// title in blue boxes over a full-bleed photo, and an orange CTA with a swoosh.
const TAG_CONTENT_EM = 1.15;        // Sora ascent+descent (measured)
const TAG_PAD_V_EM = 0.12;          // vertical padding of each blue bar
const TAG_BAR_EM = TAG_CONTENT_EM + 2 * TAG_PAD_V_EM; // 1.39 — painted bar height/em
const SWOOSH_VIEWBOX = '-3 -3 66 100';
const SWOOSH_ASPECT = 66 / 100;
const SWOOSH_PATH =
  'M9.652,94.443-2.5,94.632V88.568c0-20.7,10.21-38.7,27.311-48.159' +
  'A45.142,45.142,0,0,0,41.337,24.868a40.549,40.549,0,0,0,4.514-10.079' +
  'A39.825,39.825,0,0,0,47.426,3.661V-2.4l12.152-.189V3.472' +
  'a54.6,54.6,0,0,1-8.17,28.872A55.092,55.092,0,0,1,31.309,51.4' +
  'A41.387,41.387,0,0,0,9.652,88.379Z';

// `#RRGGBB` → `rgba(r, g, b, a)`; passes anything else through untouched.
function rgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// The brand line pattern (square grid + 45° diagonals across it), authored as
// CSS gradients so it stays crisp at any scale instead of tiling a bitmap. It
// is always drawn expanded (PATTERN_CELL_REM) — a small repeat turns into
// visual noise behind copy; the diagonals run at 0.8 of the grid pitch, as in
// the reference tile. The half-pixel feather on each stop keeps the 45° edges
// from aliasing.
function patternBg(color, rem, lineW = 2) {
  if (!color) return '';
  const cell = Math.round(PATTERN_CELL_REM * rem);
  const diag = Math.round(cell * 0.8);
  const stripe = (deg, pitch) =>
    `repeating-linear-gradient(${deg}deg, ${color} 0 ${lineW}px, transparent ${lineW + 0.5}px ${pitch}px)`;
  return `background-image: ${stripe(45, diag)}, ${stripe(0, cell)}, ${stripe(90, cell)};`;
}

// Normalize each brand's bespoke color keys into one vocabulary the slides use.
function brandPalette(brandId) {
  const brand = getBrand(brandId);
  const c = brand.colors || {};
  const v = brand.video || {};
  const fontTitle = brand.fontTitle || brand.fontFamily || 'Arial, sans-serif';
  const fontBody = brand.fontBody || brand.fontFamily || 'Arial, sans-serif';
  const base = {
    name: brand.name,
    fontTitle,
    fontBody,
    titleWeight: brand.titleWeight ?? 500,
    titleCase: brand.titleCase || 'none',
    orange: ORANGE,
    // Accent split: `accent` inks small marks (labels, rules, icons) while
    // `accentMass` fills large areas and `onAccentMass` is the text on them.
    // Brands without a `video` block keep the shared orange on both.
    accent: v.accent || ORANGE,
    accentMass: v.accentMass || ORANGE,
    onAccentMass: v.onAccentMass || '#FFFFFF',
    // Background for the solid (non-photo) slides, and the pattern ink drawn
    // over every brand-coloured surface.
    solidBg: v.bg || null,
    pattern: v.pattern ? rgba(v.accent || '#000000', 0.14) : null,
    ctaFont: v.ctaSans ? fontBody : fontTitle,
    ctaShadow: v.ctaShadow !== false,
    couponStyle: v.couponStyle || 'ticket',
    // Optional per-brand overrides for the cupones slide (see BRANDS colors).
    couponBg: c.videoCouponBg,
    couponAccent: c.videoCouponAccent,
  };
  switch (brand.style) {
    case 'panel':
      return { ...base, bg: c.panel, fg: c.text, muted: c.subtext, titleCharRatio: 0.56 };
    case 'tags':
      // Match the banner look: title in blue tag boxes (Sora ExtraBold uppercase),
      // orange CTA. Sora bold uppercase is wide, so a higher char ratio.
      return {
        ...base, bg: '#0E1A2B', fg: '#FFFFFF', muted: 'rgba(255,255,255,0.85)',
        tagStyle: true, tagBg: c.tagBg || '#2C8FE3', titleCharRatio: 0.63,
      };
    case 'editorial':
      return { ...base, bg: c.panel, fg: c.title, muted: c.body, titleCharRatio: 0.5 };
    case 'fashion':
      return { ...base, bg: c.panelBg, fg: c.title, muted: c.subtitle, titleCharRatio: 0.5 };
    default:
      return { ...base, bg: '#0F2A47', fg: '#FFFFFF', muted: 'rgba(255,255,255,0.82)', titleCharRatio: 0.58 };
  }
}

// Is the panel text light (i.e. panel bg is dark)? Used to tint muted lines.
function isDarkBg(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return true;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
}

// Logo lockup: uploaded image → inline SVG (Nuria Cobo) → typographic wordmark.
// `fontSizePx` (when given) auto-fits the wordmark to its container width, and
// `fitWidthPx` is the hard pixel budget the browser enforces after the font
// loads (see __fit in animate.js) — the char-ratio estimate alone underfits
// wide brand names like "SOLOMAMPARAS".
//
// `wrapWidthPx` switches the wordmark to a multi-line lockup capped at that
// width: a long name ("Todo Muebles de Baño") kept on one line can only be as
// big as the canvas is wide, so the closing frame sets it in two lines instead
// and lets the browser break it (see `cierre`). `fitWidthPx` still applies —
// a one-word name like "SOLOMAMPARAS" has nowhere to break, so __fit remains
// the thing that stops it running off both edges.
function logoMarkup({ brandId, palette, logoUrl, color, heightRem = 6, fontSizePx, fitWidthPx, wrapWidthPx, delay = 0 }) {
  const style = `height:${heightRem}rem;${anim('fadeDown', { dur: 650, delay })}`;
  if (logoUrl) {
    return `<img class="a logo logo-img" src="${escapeHtml(logoUrl)}" alt="" style="${style};width:auto;object-fit:contain">`;
  }
  if (brandId === 'nuria-cobo') {
    return `<span class="a logo logo-svg" style="${style};color:${color};display:inline-block">${logoSvg()}</span>`;
  }
  const size = fontSizePx ? `font-size:${Math.round(fontSizePx)}px;` : '';
  const flow = wrapWidthPx
    ? `white-space:normal;max-width:${Math.round(wrapWidthPx)}px;text-align:center;line-height:1;`
    : 'white-space:nowrap;';
  const fit = fitWidthPx ? ` data-fit="${Math.round(fitWidthPx)}"` : '';
  return `<span class="a logo wordmark"${fit} style="${anim('fadeDown', { dur: 650, delay })};color:${color};${size}` +
    `display:inline-block;${flow}">${escapeHtml(palette.name)}</span>`;
}

// Parse a price-ish string ("1.299,00", "19,99", "1299") into a Number.
function parseNum(v) {
  if (v == null) return NaN;
  let s = String(v).replace(/[^\d.,]/g, '');
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  return parseFloat(s);
}

// Savings percentage from before/after prices, or NaN if not computable.
function savingsPct(precioAntes, precioActual) {
  const a = parseNum(precioAntes);
  const b = parseNum(precioActual);
  if (isFinite(a) && isFinite(b) && a > 0 && b < a) return Math.round((1 - b / a) * 100);
  return NaN;
}

// Parse a coupon line "DB5 · 5% Dto. en pedidos superiores a 295€" into its
// structured parts: { code: 'DB5', pct: '5%', cond: 'en pedidos superiores…' }.
function parseCoupon(raw) {
  const parts = String(raw || '').split(/\s*[·•|]\s*/);
  const code = (parts[0] || '').trim();
  const rest = parts.slice(1).join(' · ').trim();
  const m = rest.match(/(\d+\s*%)\s*(?:dto\.?|descuento)?\.?/i);
  const pct = m ? m[1].replace(/\s+/g, '') : '';
  let cond = m ? rest.slice(m.index + m[0].length).trim() : rest;
  cond = cond.replace(/^[.,;:\s]+/, '');
  return { code, pct, cond };
}

// Image that fits its container without cropping (object-fit: contain) with a
// selectable motion preset. 'auto' rotates through presets by slide index so
// the same effect isn't repeated on every slide.
const IMAGE_MOTIONS = ['zoom-out', 'pan', 'static', 'zoom-in'];
function motionImage(imageUrl, durationMs, bg, motion = 'auto', index = 0) {
  // background-color (not the shorthand) so the class's pattern layer survives.
  if (!imageUrl) return `<div class="img-fill" style="background-color:${bg}"></div>`;
  const m = motion === 'auto' ? IMAGE_MOTIONS[index % IMAGE_MOTIONS.length] : motion;
  const NAME = {
    'zoom-in': 'zoomIn',
    'zoom-out': 'zoomOut',
    'pan': index % 2 ? 'driftRL' : 'driftLR',
    'static': '',
  };
  const kf = NAME[m] != null ? NAME[m] : 'zoomOut';
  const style = kf
    ? `animation-name:${kf};animation-duration:${Math.round(durationMs + 700)}ms;animation-timing-function:linear;animation-fill-mode:both;`
    : '';
  return `<img class="bg-img" src="${escapeHtml(imageUrl)}" alt="" style="${style}">`;
}

// CSS shared by the two split slides. The panel takes one third and the image
// the other two thirds — stacked (panel on top) in portrait/TikTok, side by side
// (panel on the left) in landscape/YouTube. Images are full-bleed (cover): they
// fill the whole image area, cropping as needed.
function splitCss({ w, h, palette, imageArea = true }) {
  const dark = isDarkBg(palette.bg);
  const portrait = h > w;
  const rem = Math.min(w, h) / 100;
  const pattern = patternBg(palette.pattern, rem);
  return `
    .stage { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: ${palette.fontBody};
      background: ${imageArea ? palette.bg : 'transparent'}; display: flex; flex-direction: ${portrait ? 'column' : 'row'}; }
    .panel { ${portrait ? `height: ${Math.round(PANEL_FRAC * 100)}%;` : `width: ${Math.round(PANEL_FRAC * 100)}%;`}
      flex-shrink: 0; background-color: ${palette.bg}; ${pattern} display: flex; flex-direction: column; justify-content: center;
      padding: ${portrait ? '5rem 5.5rem' : '5rem 4.5rem'}; gap: 1.6rem; }
    .image-area { flex: 1 1 auto; position: relative; overflow: hidden; min-height: 0; min-width: 0; background: ${imageArea ? palette.bg : 'transparent'}; }
    .bg-img { width: 100%; height: 100%; object-fit: cover; }
    .img-fill { width: 100%; height: 100%; ${pattern} }
    .logo-svg svg, .logo-img { height: 100%; width: auto; display: block; }
    .wordmark { font-family: ${palette.fontTitle}; font-weight: 600; letter-spacing: 0.02em; text-transform: ${palette.titleCase}; }
    .title { color: ${palette.fg}; font-family: ${palette.fontTitle}; font-weight: ${palette.titleWeight};
      text-transform: ${palette.titleCase}; line-height: 1.05; letter-spacing: -0.01em; }
    .muted { color: ${dark ? 'rgba(255,255,255,0.85)' : palette.muted}; }
  `;
}

// Title CSS. For tag brands (Solomamparas) each wrapped line gets a blue box
// like the banner; riseY rides on the wrapper so it composes with the inline
// box-decoration. Returns { css, lineHeight }.
function titleTreatment(p, titlePx, delay) {
  if (p.tagStyle) {
    // Line-height in whole px = painted bar height (barEm × titlePx) so cloned
    // blue bars tile edge-to-edge with no gap and no overlap seam.
    const pitchPx = Math.round(TAG_BAR_EM * titlePx);
    return {
      lineHeight: TAG_BAR_EM,
      css: `
        .title-box { ${anim('riseY', { dur: 700, delay })} }
        .title { display: inline; background: ${p.tagBg}; color: #fff; font-size: ${titlePx}px;
          font-weight: ${p.titleWeight}; text-transform: ${p.titleCase}; line-height: ${pitchPx}px;
          letter-spacing: -0.005em; padding: ${TAG_PAD_V_EM}em 1.3rem;
          box-decoration-break: clone; -webkit-box-decoration-break: clone;
          white-space: normal; overflow-wrap: normal; word-break: normal; }
      `,
    };
  }
  return { lineHeight: 1.05, css: `.title-box { ${anim('riseY', { dur: 700, delay })} } .title { font-size: ${titlePx}px; }` };
}

// Orange CTA with the brand swoosh (Solomamparas banner button).
// `maxWidthPx` (when given) is the pill's width budget: the label carries the
// leftover as a data-fit so a long CTA shrinks its text instead of widening the
// button past the slide — the height loop that sizes the pill bottoms out.
function swooshCtaHtml(cta, p, { heightPx, delay = 980, maxWidthPx }) {
  const textPx = Math.round(heightPx * 0.42);
  const radiusPx = Math.max(4, Math.round(heightPx * 0.06));
  const swH = Math.round(heightPx * 0.92);
  const swW = Math.round(swH * SWOOSH_ASPECT);
  const chrome = Math.round(heightPx * (0.5 + 0.32 + 0.22)) + swW;
  const textFit = maxWidthPx ? ` data-fit="${Math.max(40, Math.round(maxWidthPx - chrome))}"` : '';
  const css = `
    .cta { display: inline-flex; align-items: center; align-self: center; background: ${p.accentMass}; color: ${p.onAccentMass};
      height: ${heightPx}px; border-radius: ${radiusPx}px; padding: 0 ${Math.round(heightPx * 0.32)}px 0 ${Math.round(heightPx * 0.5)}px;
      gap: ${Math.round(heightPx * 0.22)}px; ${p.ctaShadow ? 'box-shadow: 0 1.2rem 3rem rgba(0,0,0,0.22);' : ''} ${anim('scaleIn', { dur: 700, delay })} }
    .cta-text { font-family: ${p.ctaFont}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em;
      font-size: ${textPx}px; line-height: 1; white-space: nowrap; }
    .cta-swoosh { width: ${swW}px; height: ${swH}px; flex-shrink: 0; display: block; }
  `;
  const html = `<a class="cta"><span class="cta-text"${textFit}>${escapeHtml(cta)}</span>` +
    `<svg class="cta-swoosh" viewBox="${SWOOSH_VIEWBOX}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${SWOOSH_PATH}" fill="currentColor"/></svg></a>`;
  return { css, html };
}

// Full-bleed layout for tag brands (Solomamparas): the photo is the whole
// canvas and everything sits on top of it — no colored panel. Shared bg/scrim.
function tagsBleedCss({ p, portrait, transparent }) {
  return `
    .stage { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: ${p.fontBody};
      background: ${transparent ? 'transparent' : '#2a2a2a'}; }
    .bg-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .img-fill { position: absolute; inset: 0; background: ${p.bg}; }
    .scrim { position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.14) 40%, rgba(0,0,0,0) 68%); }
    .layer { position: absolute; inset: 0; padding: ${portrait ? '8rem 5rem' : '6rem 6rem'};
      display: flex; flex-direction: column; justify-content: flex-start; }
    .group { display: flex; flex-direction: column; gap: 2.2rem; align-items: flex-start; ${anim('fadeIn', { dur: 450, delay: 80 })} }
    .title-wrap { max-width: ${portrait ? 90 : 60}%; }
  `;
}

function tagsPortada({ format, data, baseUrl, capture, durationMs, imageMotion, imageIndex, p }) {
  const { w, h } = format;
  const portrait = h > w;
  const rem = Math.min(w, h) / 100;
  const padX = (portrait ? 5 : 6) * rem;
  const titleText = normalizeCopyKeepingBreaks(data.titulo || '');
  const titlePx = fitFontExact({
    text: titleText, W: w * (portrait ? 0.9 : 0.6) - 2 * padX, H: h * (portrait ? 0.4 : 0.62),
    charRatio: p.titleCharRatio, lineHeight: TAG_BAR_EM, maxPx: portrait ? 82 : 64, minPx: 28,
  });
  const t = titleTreatment(p, titlePx, 460);
  const parrafo = copyToHtml(normalizeCopyKeepingBreaks(data.parrafo || ''));
  const bodyCss = `
    ${tagsBleedCss({ p, portrait, transparent: false })}
    ${t.css}
    .parrafo { font-size: ${portrait ? '3.2rem' : '2.6rem'}; line-height: 1.3; color: #fff;
      text-shadow: 0 2px 6px rgba(0,0,0,0.5); max-width: ${portrait ? 82 : 54}%; ${anim('riseY', { dur: 700, delay: 640 })} }
  `;
  const body = `
    <div class="stage">
      ${motionImage(data.imageUrl, durationMs, p.bg, imageMotion, imageIndex)}
      <div class="scrim"></div>
      <div class="layer"><div class="group">
        <div class="title-box title-wrap"><span class="title">${copyToHtml(titleText)}</span></div>
        ${parrafo ? `<p class="parrafo">${parrafo}</p>` : ''}
      </div></div>
    </div>
  `;
  return slideDocument({ w, h, bodyCss, body, baseUrl, durationMs, capture });
}

function tagsProducto({ format, data, baseUrl, capture, durationMs, overlayOnly, imageMotion, imageIndex, p }) {
  const { w, h } = format;
  const portrait = h > w;
  const rem = Math.min(w, h) / 100;
  const padX = (portrait ? 5 : 6) * rem;
  const isVideo = data.mediaType === 'video' || overlayOnly;
  const titleText = normalizeCopyKeepingBreaks(data.titulo || '');
  const titlePx = fitFontExact({
    text: titleText, W: w * (portrait ? 0.9 : 0.6) - 2 * padX, H: h * (portrait ? 0.3 : 0.5),
    charRatio: p.titleCharRatio, lineHeight: TAG_BAR_EM, maxPx: portrait ? 72 : 56, minPx: 26,
  });
  const t = titleTreatment(p, titlePx, 460);
  const pct = savingsPct(data.precioAntes, data.precioActual);
  const antes = data.precioAntes != null ? String(data.precioAntes).trim() : '';
  const ahora = data.precioActual != null ? String(data.precioActual).trim() : '';
  const shadow = 'text-shadow: 0 2px 6px rgba(0,0,0,0.55);';
  const bodyCss = `
    ${tagsBleedCss({ p, portrait, transparent: isVideo })}
    ${t.css}
    .badge { background: ${p.accentMass}; color: ${p.onAccentMass}; font-family: ${p.fontTitle}; font-weight: 800; font-size: 3.4rem;
      line-height: 1; padding: 1.1rem 1.8rem; border-radius: 1rem; ${anim('popIn', { dur: 650, delay: 900 })} }
    .prices { display: flex; align-items: flex-end; gap: 2.6rem; flex-wrap: wrap; margin-top: 0.4rem; }
    .pcol { display: flex; flex-direction: column; gap: 0.2rem; }
    .antes { ${anim('riseY', { dur: 650, delay: 630 })} }
    .ahora { ${anim('riseY', { dur: 650, delay: 760 })} }
    .plabel { font-size: 2rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #fff; ${shadow} }
    .antes .pval { font-size: 3.4rem; font-weight: 600; color: #fff; text-decoration: line-through; ${shadow} }
    .ahora .pval { font-family: ${p.fontTitle}; font-weight: 800; font-size: ${portrait ? '7.5rem' : '6rem'}; line-height: 0.95; color: #fff; ${shadow} }
  `;
  const body = `
    <div class="stage">
      ${isVideo ? '' : motionImage(data.mediaUrl, durationMs, p.bg, imageMotion, imageIndex)}
      <div class="scrim"></div>
      <div class="layer"><div class="group">
        <div class="title-box title-wrap"><span class="title">${copyToHtml(titleText)}</span></div>
        <div class="prices">
          ${antes ? `<div class="pcol antes"><span class="plabel">Antes</span><span class="pval">${escapeHtml(antes)}</span></div>` : ''}
          ${ahora ? `<div class="pcol ahora"><span class="plabel" style="color:${p.accentMass};${shadow}">Ahora</span><span class="pval">${escapeHtml(ahora)}</span></div>` : ''}
          ${isFinite(pct) ? `<span class="badge">-${pct}%</span>` : ''}
        </div>
      </div></div>
    </div>
  `;
  return slideDocument({ w, h, bodyCss, body, baseUrl, durationMs, capture, transparent: isVideo });
}

// ---------------------------------------------------------------------------
// Slide: PORTADA — panel (logo + título + párrafo) arriba, imagen debajo.
// ---------------------------------------------------------------------------
function portada({ brandId, format, data, logoUrl, baseUrl, capture, durationMs, imageMotion, imageIndex = 0 }) {
  const { w, h } = format;
  const p = brandPalette(brandId);
  if (p.tagStyle) return tagsPortada({ format, data, baseUrl, capture, durationMs, imageMotion, imageIndex, p });
  const portrait = h > w;
  const rem = Math.min(w, h) / 100;
  const padX = (portrait ? 5.5 : 4.5) * rem;
  const panelW = portrait ? w : w * PANEL_FRAC;
  const titleText = normalizeCopyKeepingBreaks(data.titulo || '');
  const fitW = (panelW - 2 * padX) * (p.tagStyle ? 0.86 : 1);
  const titlePx = fitFontExact({
    text: titleText, W: fitW, H: (portrait ? h * PANEL_FRAC * (p.tagStyle ? 0.52 : 0.58) : h * (p.tagStyle ? 0.72 : 0.42)),
    charRatio: p.titleCharRatio, lineHeight: p.tagStyle ? 1.5 : 1.05,
    maxPx: portrait ? (p.tagStyle ? 92 : 124) : (p.tagStyle ? 72 : 86), minPx: 34,
  });
  const t = titleTreatment(p, titlePx, 460);
  const parrafo = copyToHtml(normalizeCopyKeepingBreaks(data.parrafo || ''));

  const bodyCss = `
    ${splitCss({ w, h, palette: p })}
    .group { display: flex; flex-direction: column; gap: ${p.tagStyle ? '2.2rem' : '1.6rem'}; ${anim('fadeIn', { dur: 450, delay: 80 })} }
    ${t.css}
    .parrafo { font-size: ${portrait ? '3.8rem' : '3.2rem'}; line-height: 1.3; max-width: 94%; ${anim('riseY', { dur: 700, delay: 640 })} }
  `;

  const body = `
    <div class="stage">
      <div class="panel">
        <div class="group">
          <div class="title-box"><h1 class="title">${copyToHtml(titleText)}</h1></div>
          ${parrafo ? `<p class="parrafo muted">${parrafo}</p>` : ''}
        </div>
      </div>
      <div class="image-area">${motionImage(data.imageUrl, durationMs, p.bg, imageMotion, imageIndex)}</div>
    </div>
  `;
  return slideDocument({ w, h, bodyCss, body, baseUrl, durationMs, capture });
}

// ---------------------------------------------------------------------------
// Slide: PRODUCTO — panel (título + precios antes/ahora + ahorro%) arriba,
// media (foto o vídeo) debajo. Video media renders as a transparent overlay
// (panel opaque, image area clear) which ffmpeg composites over the clip.
// ---------------------------------------------------------------------------
function producto({ brandId, format, data, baseUrl, capture, durationMs, overlayOnly = false, imageMotion, imageIndex = 0 }) {
  const { w, h } = format;
  const p = brandPalette(brandId);
  if (p.tagStyle) return tagsProducto({ format, data, baseUrl, capture, durationMs, overlayOnly, imageMotion, imageIndex, p });
  const portrait = h > w;
  const rem = Math.min(w, h) / 100;
  const padX = (portrait ? 5.5 : 4.5) * rem;
  const panelW = portrait ? w : w * PANEL_FRAC;
  const isVideo = data.mediaType === 'video' || overlayOnly;

  const titleText = normalizeCopyKeepingBreaks(data.titulo || '');
  const fitW = (panelW - 2 * padX) * (p.tagStyle ? 0.86 : 1);
  const titlePx = fitFontExact({
    text: titleText, W: fitW, H: (portrait ? h * PANEL_FRAC * (p.tagStyle ? 0.34 : 0.42) : h * (p.tagStyle ? 0.42 : 0.30)),
    charRatio: p.titleCharRatio, lineHeight: p.tagStyle ? 1.5 : 1.03,
    maxPx: portrait ? (p.tagStyle ? 74 : 98) : (p.tagStyle ? 56 : 66), minPx: 28,
  });
  const t = titleTreatment(p, titlePx, 460);
  const pct = savingsPct(data.precioAntes, data.precioActual);
  const antes = data.precioAntes != null ? String(data.precioAntes).trim() : '';
  const ahora = data.precioActual != null ? String(data.precioActual).trim() : '';

  const bodyCss = `
    ${splitCss({ w, h, palette: p, imageArea: !isVideo })}
    .group { display: flex; flex-direction: column; gap: ${p.tagStyle ? '2rem' : '1.6rem'}; ${anim('fadeIn', { dur: 450, delay: 80 })} }
    .badge { background: ${p.accentMass}; color: ${p.onAccentMass}; font-family: ${p.fontTitle}; font-weight: 800; font-size: 3.6rem;
      line-height: 1; padding: 1.2rem 2rem; border-radius: 1.2rem; ${anim('popIn', { dur: 650, delay: 900 })} }
    ${t.css}
    .prices { display: flex; align-items: flex-end; gap: ${portrait ? '3rem' : '2.2rem'}; margin-top: 0.6rem; flex-wrap: wrap; }
    .pcol { display: flex; flex-direction: column; gap: 0.2rem; }
    .antes { ${anim('riseY', { dur: 650, delay: 630 })} }
    .ahora { ${anim('riseY', { dur: 650, delay: 760 })} }
    .plabel { font-size: 2rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
    .antes .pval { font-size: 3.4rem; font-weight: 500; text-decoration: line-through; text-decoration-thickness: 0.22rem; }
    .ahora .pval { font-family: ${p.fontTitle}; font-weight: 800; font-size: ${portrait ? '8rem' : '6rem'}; line-height: 0.95; color: ${p.fg}; }
  `;

  const body = `
    <div class="stage">
      <div class="panel">
        <div class="group">
          <div class="title-box"><h2 class="title">${copyToHtml(titleText)}</h2></div>
          <div class="prices">
            ${antes ? `<div class="pcol antes"><span class="plabel muted">Antes</span><span class="pval muted">${escapeHtml(antes)}</span></div>` : ''}
            ${ahora ? `<div class="pcol ahora"><span class="plabel" style="color:${p.accent}">Ahora</span><span class="pval">${escapeHtml(ahora)}</span></div>` : ''}
            ${isFinite(pct) ? `<span class="badge">-${pct}%</span>` : ''}
          </div>
        </div>
      </div>
      <div class="image-area">${isVideo ? '' : motionImage(data.mediaUrl, durationMs, p.bg, imageMotion, imageIndex)}</div>
    </div>
  `;
  return slideDocument({ w, h, bodyCss, body, baseUrl, durationMs, capture, transparent: isVideo });
}

// ---------------------------------------------------------------------------
// Slide: CUPONES — "stub" variant (brands with video.couponStyle === 'stub').
//
// A white coupon card per code, laid out LANDSCAPE: a butter-yellow stub on the
// left carries the discount, a vertical perforation (dashed line bitten by a
// notch top and bottom) splits it from the code and its condition on the right.
// The other brands' ticket is stacked vertically with a coloured stamp at the
// bottom, so the two never read as the same object. All card type is set in the
// brand sans — the serif is reserved for the headline. The mark is a rotated
// square holding a percent sign, echoing the 45° lines of the brand pattern
// rather than reusing the generic price tag.
// ---------------------------------------------------------------------------
function couponsStubMark(color) {
  return `<svg class="mark" viewBox="0 0 48 48" fill="none" stroke="${color}" stroke-width="2.4"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="10" y="10" width="28" height="28" rx="3" transform="rotate(45 24 24)"/>
    <line x1="17.5" y1="30.5" x2="30.5" y2="17.5"/>
    <circle cx="19.6" cy="19.2" r="2.6"/>
    <circle cx="28.4" cy="28.8" r="2.6"/>
  </svg>`;
}

function cuponesStub({ format, data, baseUrl, capture, durationMs, p }) {
  const { w, h } = format;
  const portrait = h > w;
  const rem = Math.min(w, h) / 100;
  const bg = p.solidBg || p.bg;
  const ink = p.accent;
  const items = (data.codigos || []).filter(Boolean).map(parseCoupon);

  const padX = (portrait ? 7 : 14) * rem;
  const availW = w - 2 * padX;
  const titleText = normalizeCopyKeepingBreaks(data.titulo || 'Aprovecha estos cupones descuento');
  const markW = (portrait ? 7 : 6) * rem;
  const titlePx = fitFontExact({
    text: titleText, W: availW - markW - 2.4 * rem, H: h * 0.2,
    charRatio: p.titleCharRatio, lineHeight: 1.08,
    maxPx: portrait ? 78 : 66, minPx: 30,
  });
  const disclaimer = escapeHtml(data.disclaimer || '');

  // The perforation and its two notches sit on the stub's edge, so both are
  // positioned off the same measurement.
  const stubW = (portrait ? 23 : 22) * rem;
  // Keep the diameter under the gap between cards, or the bites of two stacked
  // cards merge into one blob across the gap.
  const notchR = 1.2 * rem;

  const rows = items.map((c, i) => `
    <li class="cup a" style="${anim('riseY', { dur: 620, delay: 640 + i * 180 })}">
      <span class="cup-stub">
        <span class="cup-pct">${escapeHtml(c.pct || '%')}</span>
        <span class="cup-dto">Dto.</span>
      </span>
      <span class="cup-body">
        <span class="cup-label">Código</span>
        <span class="cup-code">${escapeHtml(c.code)}</span>
        ${c.cond ? `<span class="cup-cond">${escapeHtml(c.cond)}</span>` : ''}
      </span>
      <span class="perf"></span>
      <span class="notch nt"></span>
      <span class="notch nb"></span>
    </li>`).join('');

  const bodyCss = `
    .stage { position: relative; width: 100%; height: 100%; overflow: hidden; background-color: ${bg};
      ${patternBg(p.pattern, rem)}
      font-family: ${p.fontBody}; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: ${portrait ? '9rem' : '6rem'} ${Math.round(padX)}px; }
    /* One centred block — mark, title, cards and disclaimer all share the same
       axis, and the stack sits in the middle of the frame in both formats. */
    .wrap { width: 100%; max-width: ${Math.round(availW)}px; height: 100%; text-align: center;
      display: flex; flex-direction: column; align-items: center; justify-content: center; }
    /* Portrait stacks the mark above the title: beside a wrapped two-line title
       it would hang off to one side. Landscape's title fits on one line. */
    .head { display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      ${portrait ? 'flex-direction: column; gap: 2rem;' : 'gap: 2.4rem;'}
      ${anim('fadeUp', { dur: 650, delay: 100 })} }
    .mark { width: ${Math.round(markW)}px; height: ${Math.round(markW)}px; flex-shrink: 0; }
    .ttl { color: ${p.fg}; font-family: ${p.fontTitle}; font-weight: ${p.titleWeight}; text-transform: ${p.titleCase};
      font-size: ${titlePx}px; line-height: 1.08; letter-spacing: -0.01em; }
    /* max-content, so the white half ends just past the longest condition line
       instead of running on empty to the edge of the stage. The cards stretch to
       the list, so all three share the widest one's width and stay flush; a very
       long condition hits max-width and wraps instead of overflowing. */
    .list { list-style: none; flex: 0 0 auto; display: flex; flex-direction: column;
      gap: ${portrait ? '2.8rem' : '2.4rem'}; width: max-content; max-width: ${portrait ? '100%' : '72%'};
      margin: ${portrait ? '4rem' : '3.4rem'} 0 ${portrait ? '4rem' : '3.4rem'};
      ${anim('fadeIn', { dur: 450, delay: 400 })} }
    /* Height comes from the content: stretching the cards to fill the frame just
       moves the emptiness inside them.
       overflow:hidden clips the notch circles to half-moon bites on the edges. */
    .cup { position: relative; display: flex; align-items: stretch; background: #FFFFFF;
      border-radius: 1.8rem; overflow: hidden; }
    .cup-stub { width: ${Math.round(stubW)}px; flex-shrink: 0; background: ${p.accentMass}; color: ${p.onAccentMass};
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.4rem;
      padding: ${portrait ? '3rem 1rem' : '2.4rem 1rem'}; }
    .cup-pct { font-weight: 800; font-size: ${portrait ? '8.4rem' : '7rem'}; line-height: 0.95; letter-spacing: -0.03em; }
    .cup-dto { font-weight: 700; font-size: ${portrait ? '2.4rem' : '2.1rem'}; letter-spacing: 0.18em; text-transform: uppercase; }
    .cup-body { display: flex; flex-direction: column; justify-content: center; gap: 0.5rem; min-width: 0;
      text-align: left; padding: ${portrait ? '3rem 3.4rem' : '2.4rem 3rem'}; }
    .cup-label { color: ${rgba(ink, 0.55)}; font-weight: 600; font-size: ${portrait ? '2.1rem' : '1.9rem'};
      letter-spacing: 0.22em; text-transform: uppercase; }
    .cup-code { color: ${ink}; font-weight: 800; font-size: ${portrait ? '6.2rem' : '5.2rem'};
      letter-spacing: 0.14em; line-height: 1.1; }
    .cup-cond { color: ${rgba(ink, 0.72)}; font-size: ${portrait ? '2.9rem' : '2.5rem'}; line-height: 1.3; }
    .perf { position: absolute; left: ${Math.round(stubW)}px; top: ${Math.round(notchR)}px; bottom: ${Math.round(notchR)}px;
      border-left: 0.3rem dashed ${rgba(ink, 0.3)}; }
    .notch { position: absolute; left: ${Math.round(stubW - notchR)}px; width: ${Math.round(2 * notchR)}px;
      height: ${Math.round(2 * notchR)}px; border-radius: 50%; background: ${bg}; }
    .notch.nt { top: ${Math.round(-notchR)}px; }
    .notch.nb { bottom: ${Math.round(-notchR)}px; }
    .disclaimer { color: ${rgba(p.fg, 0.62)}; font-size: 2rem; line-height: 1.35;
      ${anim('fadeIn', { dur: 700, delay: 1100 })} }
  `;

  const body = `
    <div class="stage">
      <div class="wrap">
        <div class="head">${couponsStubMark(p.fg)}<h2 class="ttl">${copyToHtml(titleText)}</h2></div>
        <ul class="list">${rows}</ul>
        ${disclaimer ? `<p class="disclaimer">${disclaimer}</p>` : ''}
      </div>
    </div>
  `;
  return slideDocument({ w, h, bodyCss, body, baseUrl, durationMs, capture });
}

// ---------------------------------------------------------------------------
// Slide: CUPONES (opcional) — navy background with orange notes.
// ---------------------------------------------------------------------------
function cupones({ brandId, format, data, baseUrl, capture, durationMs }) {
  const { w, h } = format;
  const p = brandPalette(brandId);
  if (p.couponStyle === 'stub') return cuponesStub({ format, data, baseUrl, capture, durationMs, p });
  const bg = p.couponBg || (isDarkBg(p.bg) ? p.bg : '#0F2A47'); // navy base unless the brand overrides it
  const accent = p.couponAccent || p.orange;
  const portrait = h > w;
  const cupones = (data.codigos || []).filter(Boolean).map(parseCoupon);
  const title = copyToHtml(normalizeCopyKeepingBreaks(data.titulo || 'Aprovecha estos cupones descuento'));
  const disclaimer = escapeHtml(data.disclaimer || '');

  const TAG = `<svg class="tag" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;

  const cardEls = cupones.map((c, i) => `
    <div class="coupon a" style="${anim('riseY', { dur: 600, delay: 650 + i * 190 })}">
      <div class="c-top">
        ${c.pct ? `<div class="c-head">CUPÓN ${escapeHtml(c.pct)} DTO</div>` : `<div class="c-head">CUPÓN</div>`}
        ${c.cond ? `<div class="c-cond">${escapeHtml(c.cond)}</div>` : ''}
      </div>
      <div class="c-perf"><span class="notch nl"></span><span class="notch nr"></span></div>
      <div class="c-stamp"><span class="c-code">${escapeHtml(c.code)}</span></div>
    </div>`).join('');

  const bodyCss = `
    .stage { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${bg};
      font-family: ${p.fontBody}; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: ${portrait ? '6rem 5.5rem' : '5rem 8rem'}; text-align: center; }
    .title-row { display: flex; align-items: center; justify-content: center; gap: 1.8rem; max-width: 96%;
      ${anim('fadeUp', { dur: 650, delay: 100 })} }
    .tag { width: ${portrait ? '4.6rem' : '4rem'}; height: ${portrait ? '4.6rem' : '4rem'}; flex-shrink: 0; }
    .ttl { color: #fff; font-family: ${p.fontTitle}; font-weight: ${p.titleWeight}; text-transform: ${p.titleCase};
      font-size: ${portrait ? '5.8rem' : '5rem'}; line-height: 1.05; letter-spacing: -0.01em; }
    .cards { display: flex; flex-direction: ${portrait ? 'column' : 'row'}; gap: ${portrait ? '3rem' : '2.4rem'};
      margin-top: ${portrait ? '5rem' : '4rem'}; width: 100%; justify-content: center; align-items: ${portrait ? 'center' : 'stretch'};
      ${anim('fadeIn', { dur: 450, delay: 400 })} }
    .coupon { position: relative; display: flex; flex-direction: column; overflow: visible;
      ${portrait ? 'width: 80%;' : 'flex: 1 1 0;'} }
    .c-top { background: #FFFFFF; border-radius: 2.4rem 2.4rem 0 0; padding: ${portrait ? '3.4rem 3rem 2.4rem' : '3rem 2rem 2.2rem'}; }
    .c-head { display: inline-block; background: #ECEAE6; color: ${p.bg}; font-family: ${p.fontTitle}; font-weight: 800;
      font-size: ${portrait ? '4rem' : '3.2rem'}; letter-spacing: 0.02em; padding: 1rem 2.2rem; border-radius: 1rem; }
    .c-cond { color: #5B5B64; font-size: ${portrait ? '2.7rem' : '2.3rem'}; line-height: 1.28; margin-top: 1.8rem; padding: 0 0.5rem; }
    .c-perf { position: relative; height: 3rem; background: #FFFFFF; }
    .c-perf::before { content: ''; position: absolute; left: 2.6rem; right: 2.6rem; top: 50%;
      border-top: 0.3rem dashed rgba(15,42,71,0.28); }
    .notch { position: absolute; top: 50%; transform: translateY(-50%); width: 3.4rem; height: 3.4rem;
      border-radius: 50%; background: ${bg}; }
    .notch.nl { left: -1.7rem; }
    .notch.nr { right: -1.7rem; }
    .c-stamp { display: flex; align-items: center; justify-content: center; background: ${accent}; color: #fff;
      border-radius: 0 0 2.4rem 2.4rem; padding: ${portrait ? '2.6rem 2rem' : '2.2rem 1.6rem'}; }
    .c-code { font-family: ${p.fontTitle}; font-weight: 900; font-size: ${portrait ? '4.4rem' : '3.8rem'}; letter-spacing: 0.14em; }
    .disclaimer { position: absolute; left: 0; right: 0; bottom: ${portrait ? '4rem' : '3rem'}; padding: 0 7rem;
      color: rgba(255,255,255,0.66); font-size: 2rem; line-height: 1.35; ${anim('fadeIn', { dur: 700, delay: 1100 })} }
  `;

  const body = `
    <div class="stage">
      <div class="title-row">${TAG}<h2 class="ttl">${title}</h2></div>
      <div class="cards">${cardEls}</div>
      ${disclaimer ? `<p class="disclaimer">${disclaimer}</p>` : ''}
    </div>
  `;
  return slideDocument({ w, h, bodyCss, body, baseUrl, durationMs, capture });
}

// ---------------------------------------------------------------------------
// Slide: CIERRE — logo, título grande, párrafo de refuerzo grande, CTA naranja.
// ---------------------------------------------------------------------------
function cierre({ brandId, format, data, logoUrl, baseUrl, capture, durationMs }) {
  const { w, h } = format;
  const p = brandPalette(brandId);
  const portrait = h > w;
  const rem = Math.min(w, h) / 100;
  const titleText = normalizeCopyKeepingBreaks(data.titulo || '');
  const title = copyToHtml(titleText);
  const refuerzo = escapeHtml(data.refuerzo || '');
  const ctaRaw = data.cta || '';
  const cta = escapeHtml(ctaRaw);

  // Fit the wordmark (logo) and title to width so nothing overflows the screen.
  const padX = (portrait ? 6 : 10) * rem;
  const availW = w - 2 * padX;
  // The logo anchors the closing frame, so it gets a wider budget than the copy
  // — it can sit closer to the edges than a line of text — and the wordmark is
  // fitted over two lines (see logoMarkup) so a long brand name is not pinned
  // to whatever size fits the canvas width on one line.
  const logoW = w - 2 * (portrait ? 2 : 5) * rem;
  const logoRem = 27;
  const wordmarkPx = fitFontExact({
    text: p.name, W: logoW, H: (portrait ? 34 : 26) * rem,
    charRatio: p.titleCharRatio, lineHeight: 1.06,
    maxPx: portrait ? 200 : 170, minPx: 40,
  });
  // The tag brands set the closing title smaller — Sora ExtraBold uppercase at
  // the shared cap dominates the screen next to the wordmark.
  const titleMaxPx = portrait ? (p.tagStyle ? 88 : 118) : (p.tagStyle ? 74 : 96);
  const titlePx = fitFontExact({
    text: titleText, W: availW, H: h * (portrait ? 0.28 : 0.34),
    charRatio: p.titleCharRatio, lineHeight: 1.05, maxPx: titleMaxPx, minPx: 34,
  });

  const hasImageLogo = !!logoUrl || brandId === 'nuria-cobo';

  // The image/SVG logo scales by height, so it needs a fixed-height box; the
  // wordmark scales by font-size (and may be shrunk further by __fit), so it
  // sizes its own line box — a fixed height would leave a gap after fitting.
  const logoBlock = (color) => {
    const mark = logoMarkup({
      brandId, palette: p, logoUrl, color, heightRem: logoRem, delay: 450,
      fontSizePx: hasImageLogo ? undefined : wordmarkPx,
      // The same budget the fit above aims for.
      wrapWidthPx: hasImageLogo ? undefined : logoW,
      fitWidthPx: hasImageLogo ? undefined : logoW,
    });
    return hasImageLogo ? `<div class="logo-box" style="height:${logoRem}rem">${mark}</div>` : mark;
  };

  // A wide logo (Nuria Cobo's is 6.9:1 — 1490px wide at 20rem) must also be
  // capped by width, or it runs off both sides of a 1080-wide canvas.
  const logoBoxCss = `
    .logo-box { width: 100%; display: flex; align-items: center; justify-content: center; }
    .logo-svg svg, .logo-img { height: 100%; width: auto; max-width: 100%; display: block; }`;

  // Keep the stack inside the stage padding. Without this the wordmark's
  // `white-space: nowrap` min-content width pushes `.group` wider than the
  // stage (flex items default to `min-width: auto`), and every child sized in
  // `%` of the group inherits that overflow. The cap is the logo's budget (the
  // widest element); the copy is fitted to `availW` on its own.
  const groupCss = `.group { display: flex; flex-direction: column; align-items: center; gap: 4rem;
      width: 100%; max-width: ${Math.round(logoW)}px; min-width: 0; ${anim('fadeIn', { dur: 450, delay: 80 })} }`;
  // Height budget for __fit: very long copy makes the stack outgrow the stage,
  // and a column flex box centred with `justify-content` overflows both ends.
  const padY = (portrait ? 9 : 5) * rem;
  const groupAttrs = ` class="group" data-fit-h="${Math.round(h - 2 * padY)}"`;

  // Solomamparas closing screen: LIGHT GREY background, dark text, brand-blue
  // logo, orange swoosh CTA. Every element is fitted so nothing can overflow.
  if (p.tagStyle) {
    const navy = '#0E1A2B';
    const lightGrey = '#EEF1F4';
    let ctaH = portrait ? 116 : 98;
    const estCta = (hh) => ctaRaw.length * (hh * 0.42) * 0.6 + hh * 0.92 * SWOOSH_ASPECT + hh * 1.04;
    while (ctaH > 56 && estCta(ctaH) > availW * 0.92) ctaH -= 4;
    const sc = swooshCtaHtml(ctaRaw, p, { heightPx: ctaH, delay: 980, maxWidthPx: availW });
    const bodyCss = `
      .stage { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${lightGrey};
        font-family: ${p.fontBody}; display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: ${portrait ? '9rem 6rem' : '5rem 10rem'}; text-align: center; }
      ${groupCss}
      ${logoBoxCss}
      .wordmark { font-family: ${p.fontTitle}; font-weight: 800; letter-spacing: 0.01em; text-transform: ${p.titleCase}; }
      .ttl { color: ${navy}; font-family: ${p.fontTitle}; font-weight: ${p.titleWeight}; text-transform: ${p.titleCase};
        font-size: ${titlePx}px; line-height: 1.05; letter-spacing: -0.015em; max-width: 100%; ${anim('riseY', { dur: 700, delay: 620 })} }
      .refuerzo { color: #5B5B64; font-size: ${portrait ? '5.2rem' : '4.6rem'}; line-height: 1.25; max-width: 92%;
        ${anim('riseY', { dur: 700, delay: 780 })} }
      ${sc.css}
    `;
    const body = `
      <div class="stage">
        <div${groupAttrs}>
          ${logoBlock(hasImageLogo ? '#fff' : p.tagBg)}
          <h2 class="ttl">${title}</h2>
          ${refuerzo ? `<p class="refuerzo">${refuerzo}</p>` : ''}
          ${ctaRaw ? sc.html : ''}
        </div>
      </div>
    `;
    return slideDocument({ w, h, bodyCss, body, baseUrl, durationMs, capture });
  }

  // Brands with a video background use it here too, so the closing frame stays
  // in the brand colour instead of the navy fallback; text then has to flip to
  // the brand ink because the light background swallows white.
  const bg = p.solidBg || (isDarkBg(p.bg) ? p.bg : '#0F2A47');
  const onBg = isDarkBg(bg) ? '#FFFFFF' : p.fg;
  const onBgMuted = isDarkBg(bg) ? 'rgba(255,255,255,0.9)' : rgba(p.fg, 0.78);
  const bodyCss = `
    .stage { position: relative; width: 100%; height: 100%; overflow: hidden; background-color: ${bg};
      ${patternBg(p.pattern, rem)}
      font-family: ${p.fontBody}; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: ${portrait ? '9rem 6rem' : '5rem 10rem'}; text-align: center; }
    ${groupCss}
    ${logoBoxCss}
    .wordmark { font-family: ${p.fontTitle}; font-weight: 600; letter-spacing: 0.02em; text-transform: ${p.titleCase}; color: ${onBg}; }
    .ttl { color: ${onBg}; font-family: ${p.fontTitle}; font-weight: ${p.titleWeight}; text-transform: ${p.titleCase};
      font-size: ${titlePx}px; line-height: 1.05; letter-spacing: -0.015em; max-width: 100%;
      ${anim('riseY', { dur: 700, delay: 620 })} }
    .refuerzo { color: ${onBgMuted}; font-size: ${portrait ? '5.2rem' : '4.6rem'}; line-height: 1.25; max-width: 92%;
      ${anim('riseY', { dur: 700, delay: 780 })} }
    .cta { background: ${p.accentMass}; color: ${p.onAccentMass}; font-family: ${p.ctaFont}; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.04em; font-size: ${portrait ? '5rem' : '4.4rem'}; padding: 2.8rem 5.6rem; border-radius: 999px; margin-top: 1rem;
      ${p.ctaShadow ? 'box-shadow: 0 1.4rem 3.4rem rgba(0,0,0,0.3);' : ''} ${anim('scaleIn', { dur: 700, delay: 980 })} }
  `;
  const body = `
    <div class="stage">
      <div${groupAttrs}>
        ${logoBlock(onBg)}
        <h2 class="ttl">${title}</h2>
        ${refuerzo ? `<p class="refuerzo">${refuerzo}</p>` : ''}
        ${cta ? `<div class="cta">${cta}</div>` : ''}
      </div>
    </div>
  `;
  return slideDocument({ w, h, bodyCss, body, baseUrl, durationMs, capture });
}

// Dispatch by slide type.
function renderSlide(slide, { format, baseUrl, capture, logoUrl, imageMotion, imageIndex = 0 }) {
  const common = {
    brandId: slide.brandId, format, data: slide.data, baseUrl, capture,
    durationMs: slide.durationMs, logoUrl, imageMotion, imageIndex,
  };
  switch (slide.type) {
    case 'portada':  return portada(common);
    case 'producto': return producto({ ...common, overlayOnly: slide.overlayOnly });
    case 'cupones':  return cupones(common);
    case 'cierre':   return cierre(common);
    default: throw new Error(`Unknown slide type: ${slide.type}`);
  }
}

module.exports = { renderSlide, brandPalette, motionImage, PANEL_FRAC, IMAGE_MOTIONS, portada, producto, cupones, cierre };
