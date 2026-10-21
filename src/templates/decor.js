// SVG decoration for campaign banners (Black Friday / Cyber Monday).
// Every generator returns a self-contained, absolutely positioned <svg> string;
// the template decides where it goes (always in an area free of copy). What a
// brand gets — and in which colors — comes from `campaigns.<id>.decor` in
// src/brands.js.

const { escapeHtml } = require('./shared');

const r2 = (n) => Math.round(n * 100) / 100;

// Deterministic PRNG so a given banner always renders the same pixels.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// "Hasta -40%" → { pre: 'HASTA', lines: ['-40%'] }. Without a number the
// sticker falls back to the campaign name stacked ("BLACK" / "FRIDAY").
function stickerCopy(campaign) {
  const discount = String(campaign.discount || '');
  const m = discount.match(/[-–]?\s*\d+\s*%/);
  if (m) {
    return {
      pre: discount.replace(m[0], '').trim().toUpperCase(),
      lines: [m[0].replace(/\s+/g, '').replace('–', '-')],
    };
  }
  return { pre: '', lines: String(campaign.label).toUpperCase().split(/\s+/) };
}

// Outline of the sticker in a -100..100 box.
function shapePath(shape) {
  if (shape === 'burst') {
    const n = 20;
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI * i) / n - Math.PI / 2;
      const r = i % 2 ? 84 : 99;
      pts.push(`${r2(Math.cos(a) * r)},${r2(Math.sin(a) * r)}`);
    }
    return `<polygon points="${pts.join(' ')}"/>`;
  }
  if (shape === 'scallop') {
    const n = 14;
    const pts = [];
    for (let i = 0; i < 360; i++) {
      const a = (Math.PI * 2 * i) / 360;
      const r = 88 + 11 * Math.abs(Math.cos((n * a) / 2));
      pts.push(`${r2(Math.cos(a) * r)},${r2(Math.sin(a) * r)}`);
    }
    return `<polygon points="${pts.join(' ')}"/>`;
  }
  if (shape === 'tag') {
    // Price tag pointing left, with its string hole punched out.
    return `<path fill-rule="evenodd" d="M -100,0 L -60,-60 L 96,-60 Q 100,-60 100,-56 L 100,56 Q 100,60 96,60 L -60,60 Z
      M -58,0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0 Z"/>`;
  }
  if (shape === 'pixel') {
    // A circle rasterised on a coarse grid: reads as "digital" at a glance.
    const cells = 11;
    const step = 200 / cells;
    const rects = [];
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const cx = -100 + (x + 0.5) * step;
        const cy = -100 + (y + 0.5) * step;
        if (Math.hypot(cx, cy) <= 100) {
          rects.push(`<rect x="${r2(-100 + x * step)}" y="${r2(-100 + y * step)}" width="${r2(step + 0.4)}" height="${r2(step + 0.4)}"/>`);
        }
      }
    }
    return rects.join('');
  }
  return '<circle r="98"/>';
}

// Round promo sticker: shape + optional text ring + discount in the centre.
//   cfg: { shape, bg, fg, ring, ringFg, stroke, rotate, font, numFont, weight }
function sticker({ cfg, campaign, size, left, top, right, bottom, id = 'stk' }) {
  if (!cfg || size <= 0) return '';
  const { pre, lines } = stickerCopy(campaign);
  const fg = cfg.fg || '#fff';
  const ring = cfg.ring !== false && cfg.shape !== 'pixel';
  const innerR = ring ? 60 : 68;
  // The tag's text sits right of the hole, in a shorter, wider box.
  const isTag = cfg.shape === 'tag';
  const textX = isTag ? 30 : 0;
  const textW = isTag ? 116 : innerR * 1.75;

  // Centre copy: fit the longest line into the inner circle's width.
  const longest = Math.max(...lines.map((l) => l.length));
  const numTracking = cfg.numFont ? '0.01em' : '-0.02em';
  const mainPx = Math.min(lines.length > 1 ? (isTag ? 30 : 34) : (isTag ? 56 : 64), textW / (longest * 0.62));
  const prePx = pre ? Math.min(15, mainPx * 0.34) : 0;
  const blockH = lines.length * mainPx * 0.95 + (pre ? prePx * 1.6 : 0);
  let y = -blockH / 2;
  let centre = '';
  if (pre) {
    centre += `<text y="${r2(y + prePx * 0.8)}" font-size="${r2(prePx)}" font-family="${escapeHtml(cfg.font)}" font-weight="700" letter-spacing="0.18em">${escapeHtml(pre)}</text>`;
    y += prePx * 1.6;
  }
  for (const line of lines) {
    // With a display serif the leading minus is set in the sans at a lighter
    // size, so it reads as a sign and not as a rule through the digits.
    const sign = cfg.numFont && /^-/.test(line)
      ? `<tspan font-family="${escapeHtml(cfg.font)}" font-weight="600" font-size="${r2(mainPx * 0.8)}">−</tspan><tspan dx="0.06em">`
      : '';
    const body = sign ? `${sign}${escapeHtml(line.slice(1))}</tspan>` : escapeHtml(line);
    centre += `<text y="${r2(y + mainPx * 0.78)}" font-size="${r2(mainPx)}" font-family="${escapeHtml(cfg.numFont || cfg.font)}" font-weight="${cfg.weight || 800}" letter-spacing="${numTracking}">${body}</text>`;
    y += mainPx * 0.95;
  }

  // Text ring: the campaign name repeated, stretched to close the circle.
  let ringSvg = '';
  if (ring) {
    const rr = 79;
    const circ = 2 * Math.PI * rr;
    const unit = `${String(campaign.label).toUpperCase()} • `;
    const reps = Math.max(1, Math.round(circ / (unit.length * 13 * 0.78)));
    ringSvg = `
      <path id="${id}-ring" d="M ${-rr},0 a ${rr},${rr} 0 1,1 ${rr * 2},0 a ${rr},${rr} 0 1,1 ${-rr * 2},0" fill="none"/>
      <text font-size="13" font-family="${escapeHtml(cfg.font)}" font-weight="700" fill="${cfg.ringFg || fg}" text-anchor="start" dominant-baseline="middle">
        <textPath href="#${id}-ring" textLength="${r2(circ - 2)}" lengthAdjust="spacing">${escapeHtml(unit.repeat(reps))}</textPath>
      </text>
      <circle r="${innerR + 6}" fill="none" stroke="${cfg.ringFg || fg}" stroke-width="1.2" opacity="0.7"/>`;
  }
  const stroke = cfg.stroke
    ? `<circle r="93" fill="none" stroke="${cfg.stroke}" stroke-width="1.6"/>`
    : '';

  const pos = [
    left != null ? `left:${Math.round(left)}px` : '',
    top != null ? `top:${Math.round(top)}px` : '',
    right != null ? `right:${Math.round(right)}px` : '',
    bottom != null ? `bottom:${Math.round(bottom)}px` : '',
  ].filter(Boolean).join(';');

  return `<svg class="decor decor-sticker" viewBox="-100 -100 200 200" width="${Math.round(size)}" height="${Math.round(size)}"
    style="position:absolute;${pos};overflow:visible;z-index:3;filter:drop-shadow(0 ${r2(size * 0.02)}px ${r2(size * 0.05)}px rgba(0,0,0,0.25))">
    <g transform="rotate(${cfg.rotate ?? -12})">
      <g fill="${cfg.bg}">${shapePath(cfg.shape)}</g>
      ${stroke}
      ${ringSvg}
      <g fill="${fg}" text-anchor="middle" transform="translate(${textX},0)">${centre}</g>
    </g>
  </svg>`;
}

// Diagonal tape band across the bottom-right corner with the campaign name on
// repeat, like warning tape. k sets how far into the canvas the band reaches.
function tape({ cfg, campaign, w, h, font }) {
  if (!cfg) return '';
  const k = Math.min(w, h) * (cfg.reach || 0.3);
  const px = w, py = h - k;            // where the band leaves the right edge
  const qx = w - k * 1.7, qy = h;      // where it leaves the bottom edge
  const cx = (px + qx) / 2, cy = (py + qy) / 2;
  const angle = (Math.atan2(py - qy, px - qx) * 180) / Math.PI;
  const t = Math.min(w, h) * 0.085;    // band thickness
  const L = Math.hypot(w, h) * 1.2;
  const fs = t * 0.46;
  const unit = `${String(campaign.label).toUpperCase()}  •  `;
  const reps = Math.ceil(L / (unit.length * fs * 0.72)) + 1;
  const edge = (o) => `<line x1="${-L / 2}" y1="${r2(o)}" x2="${L / 2}" y2="${r2(o)}" stroke="${cfg.fg}" stroke-width="${r2(Math.max(1, t * 0.035))}" opacity="0.6"/>`;
  const second = cfg.double
    ? `<rect x="${-L / 2}" y="${r2(-t * 1.55)}" width="${L}" height="${r2(t * 0.42)}" fill="${cfg.fg}"/>`
    : '';
  return `<svg class="decor decor-tape" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0;z-index:2;pointer-events:none">
    <g transform="translate(${r2(cx)},${r2(cy)}) rotate(${r2(angle)})">
      ${second}
      <rect x="${-L / 2}" y="${r2(-t / 2)}" width="${L}" height="${r2(t)}" fill="${cfg.bg}"/>
      ${edge(-t / 2 + t * 0.12)}${edge(t / 2 - t * 0.12)}
      <text x="${-L / 2}" y="0" dominant-baseline="central" font-family="${escapeHtml(font)}" font-weight="800" font-size="${r2(fs)}" letter-spacing="0.08em" fill="${cfg.fg}" xml:space="preserve">${escapeHtml(unit.repeat(reps))}</text>
    </g>
  </svg>`;
}

// Background texture for a box (w × h). Types:
//   stripes — fine diagonal lines          dots   — dot grid
//   pixels  — pixel dissolve from one edge waves  — stacked sine lines
//   arches  — concentric quarter rings from one or two corners
// `fade` (left|right|top|bottom) fades the texture out away from that edge.
function pattern({ cfg, w, h, seed = 7, id = 'pat' }) {
  if (!cfg) return '';
  const color = cfg.color;
  const op = cfg.opacity ?? 0.15;
  const unit = Math.min(w, h);
  let inner = '';

  if (cfg.type === 'stripes') {
    const s = Math.max(8, unit * 0.028);
    inner = `<defs><pattern id="${id}" width="${r2(s)}" height="${r2(s)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <line x1="0" y1="0" x2="0" y2="${r2(s)}" stroke="${color}" stroke-width="${r2(Math.max(1, s * 0.16))}"/></pattern></defs>
      <rect width="${w}" height="${h}" fill="url(#${id})"/>`;
  } else if (cfg.type === 'dots') {
    const s = Math.max(10, unit * 0.035);
    inner = `<defs><pattern id="${id}" width="${r2(s)}" height="${r2(s)}" patternUnits="userSpaceOnUse">
        <circle cx="${r2(s / 2)}" cy="${r2(s / 2)}" r="${r2(s * 0.12)}" fill="${color}"/></pattern></defs>
      <rect width="${w}" height="${h}" fill="url(#${id})"/>`;
  } else if (cfg.type === 'pixels') {
    const cell = Math.max(8, unit * (cfg.cell || 0.04));
    const depth = cfg.depth || 0.45; // fraction of the box the dissolve covers
    const rand = rng(seed);
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
    const rects = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const d = {
          left: (x * cell) / w, right: 1 - ((x + 1) * cell) / w,
          top: (y * cell) / h, bottom: 1 - ((y + 1) * cell) / h,
        }[cfg.from || 'left'] / depth;
        if (d >= 1) continue;
        if (rand() < Math.pow(1 - d, 1.8)) {
          rects.push(`<rect x="${r2(x * cell)}" y="${r2(y * cell)}" width="${r2(cell + 0.5)}" height="${r2(cell + 0.5)}" opacity="${r2(0.55 + rand() * 0.45)}"/>`);
        }
      }
    }
    inner = `<g fill="${color}">${rects.join('')}</g>`;
  } else if (cfg.type === 'waves') {
    const gap = Math.max(14, unit * 0.06);
    const amp = gap * 0.28;
    const len = gap * 2.6;
    const paths = [];
    for (let y = gap / 2; y < h + gap; y += gap) {
      let d = `M ${-len} ${r2(y)}`;
      for (let x = -len; x < w + len; x += len) {
        d += ` q ${r2(len / 4)} ${r2(-amp * 2)} ${r2(len / 2)} 0 t ${r2(len / 2)} 0`;
      }
      paths.push(`<path d="${d}"/>`);
    }
    inner = `<g fill="none" stroke="${color}" stroke-width="${r2(Math.max(1, unit * 0.0025))}">${paths.join('')}</g>`;
  } else if (cfg.type === 'arches') {
    const R = unit * (cfg.radius || 0.42);
    const n = cfg.rings || 7;
    const corners = cfg.corners || ['br'];
    const sw = r2(Math.max(1, unit * 0.0022));
    const groups = corners.map((c) => {
      const cx = c.includes('r') ? w : 0;
      const cy = c.includes('b') ? h : 0;
      const circles = [];
      for (let i = 1; i <= n; i++) circles.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2((R * i) / n)}"/>`);
      return circles.join('');
    });
    inner = `<g fill="none" stroke="${color}" stroke-width="${sw}">${groups.join('')}</g>`;
  }

  let mask = '';
  let maskAttr = '';
  if (cfg.fade) {
    const dir = { left: [0, 0, 1, 0], right: [1, 0, 0, 0], top: [0, 0, 0, 1], bottom: [0, 1, 0, 0] }[cfg.fade];
    mask = `<defs><linearGradient id="${id}-g" x1="${dir[0]}" y1="${dir[1]}" x2="${dir[2]}" y2="${dir[3]}">
        <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="${id}-m"><rect width="${w}" height="${h}" fill="url(#${id}-g)"/></mask></defs>`;
    maskAttr = `mask="url(#${id}-m)"`;
  }

  return `<svg class="decor decor-pattern" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0;z-index:0;pointer-events:none;opacity:${op}">
    ${mask}<g ${maskAttr}>${inner}</g>
  </svg>`;
}

// Art-deco double hairline frame inset from the canvas edge, with diamonds
// at the centre of the top and bottom rules.
function frame({ cfg, w, h, inset }) {
  if (!cfg) return '';
  const g = Math.max(4, Math.min(w, h) * 0.012);
  const sw = r2(Math.max(1, Math.min(w, h) * 0.0018));
  const d = g * 1.6;
  const diamond = (x, y) => `<rect x="${r2(x - d / 2)}" y="${r2(y - d / 2)}" width="${r2(d)}" height="${r2(d)}" transform="rotate(45 ${r2(x)} ${r2(y)})" fill="${cfg.color}"/>`;
  return `<svg class="decor decor-frame" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0;z-index:1;pointer-events:none;opacity:${cfg.opacity ?? 0.85}">
    <g fill="none" stroke="${cfg.color}" stroke-width="${sw}">
      <rect x="${r2(inset)}" y="${r2(inset)}" width="${r2(w - inset * 2)}" height="${r2(h - inset * 2)}"/>
      <rect x="${r2(inset + g)}" y="${r2(inset + g)}" width="${r2(w - (inset + g) * 2)}" height="${r2(h - (inset + g) * 2)}"/>
    </g>
    ${diamond(w / 2, inset + g / 2)}${diamond(w / 2, h - inset - g / 2)}
  </svg>`;
}

module.exports = { sticker, tape, pattern, frame };
