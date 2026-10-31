// "inspire" campaign layout: luminous lifestyle banner (Todo Muebles de Baño).
//
// The photo stays bright: only a soft shade at the top, where a short centred
// stack sits — campaign eyebrow, headline and subtitle in Suisse Intl in a
// soft yellow, and a yellow pill CTA. The discount lives in the campaign
// line; a brand may add a seal pinned to the top-right corner (the stack
// drops below it when they'd collide). Optional legal copy runs vertically up
// the right edge.

const {
  layoutCategory, escapeHtml, copyToHtml, htmlDocument,
  normalizeCopyKeepingBreaks, fitFontExact, measureLines, campaignBadge,
} = require('./shared');
const decor = require('./decor');

function render({ brand, copy, subcopy, cta, imageUrl, legal, focal, veil, zoom, format, baseUrl }) {
  const { w, h } = format;
  const layout = layoutCategory(w, h);
  const colors = brand.colors;
  const deco = brand.decor || {};
  const focalX = Math.max(0, Math.min(100, focal?.x ?? 50));
  const focalY = Math.max(0, Math.min(100, focal?.y ?? 50));
  const zoomScale = Math.max(1, Math.min(4, Number(zoom) || 1));
  const canvasMin = Math.min(w, h);
  const remPx = canvasMin / 100;

  const isInstagramStory = w === 1080 && h === 1920;
  const isTwitterHeader = w === 1500 && h === 500;
  const isFacebookCover = w === 1650 && h === 671;
  const showCta = !!cta && !(isInstagramStory || isTwitterHeader || isFacebookCover);

  const ink = colors.inspireInk || '#FFFDF6';
  const ctaBg = colors.inspireCta || ink;
  const ctaInk = colors.inspireCtaText || '#2C403F';
  const padPx = Math.round(remPx * (layout === 'portrait' ? 6 : 6.5));
  let columnW = Math.min(w - padPx * 2, w * (layout === 'wide' ? 0.62 : w < 800 ? 0.88 : 0.8));

  // Seal: pinned top-right (below the Story's avatar strip). When the centred
  // column would run under it, the stack starts below the seal instead.
  const sealPx = canvasMin * (layout === 'portrait' ? 0.3 : 0.27);
  const sealInset = padPx * 0.7;
  const sealTop = isInstagramStory ? Math.round(h * 0.1) : sealInset;
  const hasSeal = !!deco.sticker;
  // Wide formats have room to narrow the centred column so it clears the
  // seal on both sides; elsewhere the stack moves down instead.
  const sealGap = padPx * 1.6;
  const clearW = 2 * (w - sealInset - sealPx - sealGap) - w;
  if (hasSeal && layout === 'wide' && clearW >= w * 0.45) columnW = Math.min(columnW, clearW);
  const columnRight = (w + columnW) / 2;
  const sealClash = hasSeal && columnRight > w - sealInset - sealPx - sealGap;
  const baseTop = isInstagramStory ? Math.round(h * 0.11) : padPx;
  const padTopPx = sealClash ? Math.round(sealTop + sealPx + padPx * 0.5) : baseTop;

  // The whole stack lives in the upper part of the frame; the rest is photo.
  const stackBudget = Math.max(
    h * ({ wide: 0.78, square: 0.56, portrait: 0.42 }[layout]) - baseTop,
    h * ({ wide: 0.9, square: 0.86, portrait: 0.62 }[layout]) - padTopPx,
  );
  const badge = campaignBadge({
    campaign: brand.campaign, fontFamily: brand.fontBody, fontWeight: 500,
    W: columnW, maxPx: Math.max(13, Math.min(remPx * 2.6, 25)),
    charRatio: 0.6, tracking: 0.28, align: 'center', radius: 999,
  });
  const badgeGap = Math.round(badge.px * 1.5);

  const ctaPx = Math.max(13, Math.min(remPx * 2.9, 27));
  const ctaGap = Math.round(remPx * 4);
  const reservedCta = showCta ? ctaPx * 2.7 + ctaGap : 0;

  const titleText = normalizeCopyKeepingBreaks(copy);
  const subText = normalizeCopyKeepingBreaks(subcopy);
  const titleLineH = 1.14;
  const titleCharRatio = 0.52; // Suisse Intl Book
  const subLineH = 1.45;

  const stackH = Math.max(50, stackBudget - badge.heightPx - badgeGap - reservedCta);
  let subPx = 0;
  let reservedSub = 0;
  // On horizontal formats the subtitle keeps a readable line length instead of
  // spanning the whole headline column.
  const subW = layout === 'wide' ? Math.min(columnW, w * 0.42) : columnW;
  if (subText) {
    subPx = fitFontExact({
      text: subText, W: subW, H: stackH * 0.36, charRatio: 0.5, lineHeight: subLineH,
      maxPx: Math.max(17, Math.min(remPx * 3.4, 36)), minPx: 14,
    });
    reservedSub = measureLines({ text: subText, W: subW, px: subPx, charRatio: 0.5 }) * subLineH * subPx
      + subPx;
  }
  let titlePx = fitFontExact({
    text: titleText, W: columnW, H: Math.max(40, stackH - reservedSub), charRatio: titleCharRatio,
    lineHeight: titleLineH, maxPx: Math.round(Math.min(canvasMin * 0.085, 100)), minPx: 16,
  });
  // Keep the author's lines intact when it costs little (no one-word orphans).
  const segs = titleText.split('\n').filter(Boolean);
  if (segs.length) {
    const noWrap = Math.floor(Math.min(...segs.map((s) => columnW / (s.length * 1.05 * titleCharRatio))));
    if (noWrap >= titlePx * 0.7) titlePx = Math.min(titlePx, noWrap);
  }
  const titleLines = measureLines({ text: titleText, W: columnW, px: titlePx, charRatio: titleCharRatio });
  const stackTotal = padTopPx + badge.heightPx + badgeGap
    + titleLines * titleLineH * titlePx + reservedSub + reservedCta;
  // Shade reaches just past the copy, then the photo is untouched.
  const shadeEnd = Math.min(92, (stackTotal / h) * 100 + 18);

  const sealHtml = decor.sticker({
    cfg: deco.sticker && { ...deco.sticker, font: deco.sticker.font || brand.fontBody },
    campaign: brand.campaign, size: sealPx, right: sealInset, top: sealTop,
  });

  const legalText = String(legal || '').replace(/\s+/g, ' ').trim();
  const legalPx = Math.max(9, Math.round(canvasMin * 0.0145));

  const bodyCss = `
    .root { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${colors.overlayBg}; font-family: ${brand.fontBody}; }
    .bg-image {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
      object-position: ${focalX}% ${focalY}%;
      transform: scale(${zoomScale}); transform-origin: ${focalX}% ${focalY}%;
    }
    .shade {
      position: absolute; inset: 0;
      background: linear-gradient(180deg,
        rgba(24,26,24,0.48) 0%,
        rgba(24,26,24,0.28) ${(shadeEnd * 0.55).toFixed(1)}%,
        rgba(24,26,24,0) ${shadeEnd.toFixed(1)}%);
    }
    .veil { position: absolute; inset: 0; background: rgba(24,26,24,0.15); }
    .content {
      position: absolute; inset: 0; z-index: 4;
      padding: ${padTopPx}px ${padPx}px ${padPx}px;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      color: ${ink};
    }
    .campaign { margin-bottom: ${badgeGap}px; }
    .title {
      font-family: ${brand.fontBody};
      font-weight: 350;
      font-size: ${titlePx}px; line-height: ${titleLineH};
      letter-spacing: -0.012em;
      max-width: ${Math.round(columnW)}px;
      text-shadow: 0 ${remPx * 0.15}px ${remPx * 1.4}px rgba(0,0,0,0.34);
    }
    .sub {
      margin-top: ${subPx}px;
      font-size: ${subPx}px; font-weight: 350; line-height: ${subLineH};
      max-width: ${Math.round(subW)}px;
      text-shadow: 0 1px ${remPx * 0.8}px rgba(0,0,0,0.25);
    }
    .cta {
      margin-top: ${ctaGap}px;
      background: ${ctaBg}; color: ${ctaInk};
      border-radius: 999px;
      font-size: ${ctaPx}px; font-weight: 600; letter-spacing: 0.02em;
      padding: ${ctaPx * 0.85}px ${ctaPx * 1.8}px; line-height: 1; white-space: nowrap;
    }
    .legal {
      position: absolute; z-index: 4;
      right: ${Math.round(padPx * 0.32)}px; top: 50%;
      transform: translate(50%, -50%) rotate(-90deg);
      transform-origin: center;
      width: ${Math.round(h * 0.62)}px;
      font-size: ${legalPx}px; line-height: 1.3; letter-spacing: 0.02em;
      color: ${ink}; opacity: 0.78; text-align: center;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    ${badge.css}
  `;

  const body = `
    <div class="root">
      ${imageUrl ? `<img class="bg-image" src="${escapeHtml(imageUrl)}" alt="">` : ''}
      <div class="shade"></div>
      ${veil ? '<div class="veil"></div>' : ''}
      ${decor.pattern({ cfg: deco.pattern, w, h, id: 'insp-pat' })}
      ${sealHtml}
      <div class="content">
        ${badge.html}
        ${titleText ? `<h1 class="title">${copyToHtml(titleText)}</h1>` : ''}
        ${subText ? `<p class="sub">${copyToHtml(subText)}</p>` : ''}
        ${showCta ? `<a class="cta">${escapeHtml(cta)}</a>` : ''}
      </div>
      ${legalText ? `<div class="legal">${escapeHtml(legalText)}</div>` : ''}
    </div>
  `;
  return htmlDocument({ w, h, bodyCss, body, baseUrl });
}

module.exports = { render };
