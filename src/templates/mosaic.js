// "mosaic" campaign layout: multiproduct editorial grid (Decorabaño).
//
// A text zone in the brand navy (header lockup, title, subtitle, CTA) next to
// a mosaic of 2–5 product photos separated by thin navy gutters — the
// catalogue-page look, rather than one hero photo. A bold tape crosses the
// mosaic's corner.
//
// Falls back to the classic panel template when there's only one image, and
// for the text-only website deliverable. The image-only deliverable is the
// mosaic alone.

const {
  layoutCategory, escapeHtml, copyToHtml, htmlDocument,
  normalizeCopyKeepingBreaks, fitFontExact, measureLines, campaignBadge,
} = require('./shared');
const decor = require('./decor');
const panel = require('./panel');

const MAX_IMAGES = 5;

// Grid recipe for n tiles in a zone of the given aspect. Areas are letters;
// 'a' is always the hero tile (the main image).
function gridFor(n, zoneAspect) {
  const wideZone = zoneAspect > 1.15;
  if (n === 2) {
    return wideZone
      ? { areas: ['a b'], cols: '1.25fr 1fr', rows: '1fr' }
      : { areas: ['a', 'b'], cols: '1fr', rows: '1.25fr 1fr' };
  }
  if (n === 3) {
    return wideZone || zoneAspect > 0.85
      ? { areas: ['a b', 'a c'], cols: '1.6fr 1fr', rows: '1fr 1fr' }
      : { areas: ['a a', 'b c'], cols: '1fr 1fr', rows: '1.6fr 1fr' };
  }
  if (n === 4) {
    return wideZone
      ? { areas: ['a b c', 'a d c'], cols: '1.5fr 1fr 1fr', rows: '1fr 1fr' }
      : { areas: ['b c d', 'a a a'], cols: '1fr 1fr 1fr', rows: '1fr 1.9fr' };
  }
  return wideZone
    ? { areas: ['a b c', 'a d e'], cols: '1.5fr 1fr 1fr', rows: '1fr 1fr' }
    : { areas: ['b c d', 'a a e'], cols: '1fr 1fr 1fr', rows: '1fr 1.7fr' };
}

function mosaicHtml({ images, focalX, focalY, zoomScale, zoneW, zoneH, gap }) {
  const grid = gridFor(images.length, zoneW / zoneH);
  const letters = 'abcde';
  const tiles = images.map((url, i) => {
    // The per-format focal point and zoom steer the hero; the rest stay centred.
    const hero = i === 0;
    const pos = hero ? `${focalX}% ${focalY}%` : '50% 50%';
    const zoom = hero ? zoomScale : 1;
    return `<div class="tile" style="grid-area:${letters[i]}">
      <img src="${escapeHtml(url)}" alt="" style="object-position:${pos};transform:scale(${zoom});transform-origin:${pos}">
    </div>`;
  }).join('');
  const css = `
    .mosaic {
      position: absolute;
      display: grid;
      gap: ${gap}px;
      grid-template-areas: ${grid.areas.map((r) => `"${r}"`).join(' ')};
      grid-template-columns: ${grid.cols};
      grid-template-rows: ${grid.rows};
    }
    .tile { position: relative; overflow: hidden; min-width: 0; min-height: 0; background: rgba(255,255,255,0.06); }
    .tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `;
  return { html: tiles, css };
}

function render(args) {
  const { brand, copy, subcopy, cta, imageUrl, images = [], focal, zoom, format, baseUrl, part = 'full' } = args;
  const all = [imageUrl, ...images].filter(Boolean).slice(0, MAX_IMAGES);
  if (part === 'text' || all.length < 2) return panel.render(args);

  const { w, h } = format;
  const layout = layoutCategory(w, h);
  const colors = brand.colors;
  const deco = brand.decor || {};
  const focalX = Math.max(0, Math.min(100, focal?.x ?? 50));
  const focalY = Math.max(0, Math.min(100, focal?.y ?? 50));
  const zoomScale = Math.max(1, Math.min(4, Number(zoom) || 1));
  const canvasMin = Math.min(w, h);
  const remPx = canvasMin / 100;
  const margin = Math.round(canvasMin * 0.035);
  const gap = Math.max(4, Math.round(canvasMin * 0.014));

  // Image-only website deliverable: the mosaic fills the canvas.
  if (part === 'image') {
    const m = mosaicHtml({ images: all, focalX, focalY, zoomScale, zoneW: w, zoneH: h, gap });
    const bodyCss = `
      .root { width: 100%; height: 100%; position: relative; overflow: hidden; background: ${colors.panel}; }
      ${m.css}
      .mosaic { inset: 0; }
    `;
    const body = `<div class="root"><div class="mosaic">${m.html}</div>
      ${decor.tape({ cfg: deco.tape, campaign: brand.campaign, w, h, font: brand.fontFamily })}</div>`;
    return htmlDocument({ w, h, bodyCss, body, baseUrl });
  }

  const isInstagramStory = w === 1080 && h === 1920;
  const showCta = !!cta && !isInstagramStory;

  // --- Zones -----------------------------------------------------------------
  // Wide/square: text column on the left, mosaic on the right.
  // Portrait: text band on top, mosaic below (Story leaves room for the app's
  // avatar strip at the top).
  const rowAxis = layout !== 'portrait';
  // Portrait feeds (4:5, 2:3) are short for a stacked band — give the copy more
  // room there; the Story is tall enough at a third.
  const textFrac = layout === 'wide' ? 0.4 : layout === 'square' ? 0.43 : isInstagramStory ? 0.33 : 0.42;
  const padPx = Math.round(remPx * (layout === 'portrait' ? 5 : 5.5));
  const padTopPx = isInstagramStory ? Math.round(remPx * 13) : padPx;
  const textZone = rowAxis
    ? { x: 0, y: 0, w: Math.round(w * textFrac), h }
    : { x: 0, y: 0, w, h: Math.round(h * textFrac) + (isInstagramStory ? padTopPx - padPx : 0) };
  const mosaicZone = rowAxis
    ? { x: textZone.w, y: margin, w: w - textZone.w - margin, h: h - margin * 2 }
    : { x: margin, y: textZone.h, w: w - margin * 2, h: h - textZone.h - margin };

  // --- Typography --------------------------------------------------------------
  const textW = textZone.w - padPx * 2;
  const textH = textZone.h - padTopPx - padPx;

  const badge = campaignBadge({
    campaign: brand.campaign,
    fontFamily: brand.fontFamily,
    fontWeight: 500,
    W: textW,
    maxPx: Math.max(14, Math.min(remPx * 3.2, 38)),
  });
  const badgeGapPx = Math.round(badge.px * 1.3);

  const ctaPx = Math.max(18, Math.min(remPx * 3.7, 40));
  const ctaH = ctaPx * 2;
  const ctaGapPx = Math.round(remPx * 3);
  const reservedCta = showCta ? ctaH + ctaGapPx : 0;

  const titleText = normalizeCopyKeepingBreaks(copy);
  const subText = normalizeCopyKeepingBreaks(subcopy);
  const titleCharRatio = 0.56;
  const titleLineH = 1.08;
  const subLineH = 1.35;

  const stackH = Math.max(40, textH - badge.heightPx - badgeGapPx - reservedCta);
  let subPx = 0;
  let reservedSub = 0;
  if (subText) {
    subPx = fitFontExact({
      text: subText, W: textW, H: stackH * 0.32, charRatio: 0.5, lineHeight: subLineH,
      maxPx: Math.max(14, Math.min(remPx * 3.4, 34)), minPx: 11,
    });
    reservedSub = measureLines({ text: subText, W: textW, px: subPx, charRatio: 0.5 }) * subLineH * subPx
      + subPx * 0.8;
  }
  const titlePx = fitFontExact({
    text: titleText, W: textW, H: Math.max(30, stackH - reservedSub), charRatio: titleCharRatio,
    lineHeight: titleLineH, maxPx: Math.round(Math.min(remPx * 9, 110)), minPx: 16,
  });

  const m = mosaicHtml({
    images: all, focalX, focalY, zoomScale, zoneW: mosaicZone.w, zoneH: mosaicZone.h, gap,
  });

  // Cyber Monday: the text zone dissolves into the mosaic in navy pixels.
  const seamHtml = decor.pattern({
    cfg: deco.seam && { ...deco.seam, from: rowAxis ? 'left' : 'top', depth: 0.22 },
    w: mosaicZone.w, h: mosaicZone.h, id: 'seam',
  });

  const bodyCss = `
    .root {
      width: 100%; height: 100%;
      position: relative; overflow: hidden;
      background: ${colors.panel};
      font-family: ${brand.fontFamily};
      color: ${colors.text};
    }
    ${m.css}
    .mosaic { left: ${mosaicZone.x}px; top: ${mosaicZone.y}px; width: ${mosaicZone.w}px; height: ${mosaicZone.h}px; }
    .seam { position: absolute; left: ${mosaicZone.x}px; top: ${mosaicZone.y}px; width: ${mosaicZone.w}px; height: ${mosaicZone.h}px; z-index: 1; }
    .text {
      position: absolute;
      left: ${textZone.x}px; top: ${textZone.y}px;
      width: ${textZone.w}px; height: ${textZone.h}px;
      padding: ${padTopPx}px ${padPx}px ${padPx}px;
      display: flex;
      flex-direction: column;
      justify-content: ${rowAxis ? 'space-between' : 'flex-start'};
      z-index: 4;
    }
    .copy { display: flex; flex-direction: column; }
    .campaign { margin-bottom: ${badgeGapPx}px; }
    .title {
      font-size: ${titlePx}px;
      font-weight: ${brand.titleWeight ?? 500};
      line-height: ${titleLineH};
      letter-spacing: -0.015em;
      color: ${colors.text};
    }
    /* Light italic for the secondary line — the contrast pairing of the
       reference (bold sans headline, quiet second voice). */
    .sub {
      margin-top: ${Math.round(subPx * 0.8)}px;
      font-size: ${subPx}px;
      font-weight: 300;
      font-style: italic;
      line-height: ${subLineH};
      color: ${colors.subtext};
    }
    .cta {
      align-self: flex-start;
      margin-top: ${rowAxis ? 0 : ctaGapPx}px;
      background: ${colors.cta};
      color: ${colors.ctaText};
      font-size: ${ctaPx}px;
      font-weight: 500;
      line-height: 1;
      padding: ${ctaPx * 0.5}px ${ctaPx * 1.1}px;
      border-radius: 999px;
      white-space: nowrap;
    }
    ${badge.css}
  `;

  const body = `
    <div class="root">
      <div class="mosaic">${m.html}</div>
      ${seamHtml ? `<div class="seam">${seamHtml}</div>` : ''}
      ${decor.tape({ cfg: deco.tape, campaign: brand.campaign, w, h, font: brand.fontFamily })}
      <div class="text">
        <div class="copy">
          ${badge.html}
          <h1 class="title">${copyToHtml(titleText)}</h1>
          ${subText ? `<p class="sub">${copyToHtml(subText)}</p>` : ''}
        </div>
        ${showCta ? `<a class="cta">${escapeHtml(cta)}</a>` : ''}
      </div>
    </div>
  `;
  return htmlDocument({ w, h, bodyCss, body, baseUrl });
}

module.exports = { render };
