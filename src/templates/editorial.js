// "editorial" style: photographic banner — the image fills 100% of the canvas
// and the text sits centered on top of it, in brand yellow, over a dark green
// tinted scrim that keeps the copy readable on any photo.
// Used by Todo Muebles de Baño.

const {
  layoutCategory, escapeHtml, copyToHtml, htmlDocument,
  normalizeCopyKeepingBreaks, fitFontExact, measureLines, campaignBadge,
} = require('./shared');
const decor = require('./decor');

function render({ brand, copy, subcopy, cta, imageUrl, focal, veil, zoom, format, baseUrl }) {
  const { w, h } = format;
  const layout = layoutCategory(w, h);
  const focalX = Math.max(0, Math.min(100, focal?.x ?? 50));
  const focalY = Math.max(0, Math.min(100, focal?.y ?? 50));
  const zoomScale = Math.max(1, Math.min(4, Number(zoom) || 1));

  const colors = brand.colors;

  // Formats that never carry a CTA.
  //   1080×1920 (Instagram Story) — the story's own sticker/swipe-up is the CTA
  //   1500×500  (Twitter header)  — the strip is too short for a button
  //   1650×671  (Facebook cover)  — idem
  const isInstagramStory = w === 1080 && h === 1920;
  const isTwitterHeader = w === 1500 && h === 500;
  const isFacebookCover = w === 1650 && h === 671;
  const showCta = cta && !(isInstagramStory || isTwitterHeader || isFacebookCover);

  const canvasMin = Math.min(w, h);
  const remPx = canvasMin / 100;

  // The text column is centered on the canvas; it never reaches the edges so
  // the photo keeps breathing around the copy.
  const padRem = layout === 'portrait' ? 6 : 7;
  const padPx = padRem * remPx;
  // Small deliverables (the mobile web banner, small ad units) are viewed small,
  // so the copy needs proportionally more of the frame — at the desktop ratio it
  // comes out unreadable on a phone. The column is what limits the type here:
  // the size ceiling never binds at these dimensions, the line width does.
  const columnBase = { wide: 0.70, square: 0.74, portrait: 0.78 }[layout];
  const columnFraction = w < 800 ? Math.min(0.90, columnBase + 0.14) : columnBase;
  const contentWidth = Math.min(w - padPx * 2, w * columnFraction);

  // The copy sits low in the frame rather than dead centre: in interior shots
  // the subject is almost always mid-frame, and centred type lands right on it.
  // The Instagram Story is lifted further still — its bottom strip is covered
  // by the app's own reply bar.
  const padBottomPx = isInstagramStory ? h * 0.17 : padPx * 1.7;
  const availableHeight = h - padPx - padBottomPx;

  // Typography baselines. These are ceilings, not targets: the real size comes
  // from fitting the copy to the column, so the cap only has to be generous
  // enough not to bind. Measured on the reference layouts, the headline runs at
  // ~17% of the canvas's short side and fills about half its width.
  let titlePx = Math.max(24, Math.min(canvasMin * 0.17, 220));
  let subtitlePx = 0; // resolved by fitting, once the CTA space is reserved.
  let ctaPx = Math.max(14, Math.min(canvasMin * 0.032, 26));

  // Wide tracking is what gives the look its air. The fit helpers measure in
  // "average char widths", so the tracking has to be folded into charRatio or
  // the text overflows its column.
  const titleTracking = 0.025; // em
  const titleWordGap = 0.06;   // em, on top of the normal word space
  const titleCharRatio = 0.5 + titleTracking + 0.03;
  const subTracking = 0.01;    // em
  const subCharRatio = 0.5 + subTracking;
  const ctaTracking = 0.045;   // em
  const ctaCharRatio = 0.5 + ctaTracking;

  const titleLineH = 1.25;
  const subLineH = 1.5;

  const titleText = normalizeCopyKeepingBreaks(copy);
  const subtitleText = subcopy ? normalizeCopyKeepingBreaks(subcopy) : '';

  // CTA must fit the text column — pad + tracked text + pad ≤ available.
  const ctaPadVRatio = 0.95;
  const ctaPadHRatio = 2.0;
  const ctaTextLen = (cta || '').length;
  const maxCtaByWidth = ctaTextLen > 0
    ? contentWidth / (ctaTextLen * ctaCharRatio + 2 * ctaPadHRatio)
    : Infinity;
  ctaPx = Math.max(11, Math.min(ctaPx, maxCtaByWidth));
  const ctaPadVPx = ctaPx * ctaPadVRatio;
  const ctaPadHPx = ctaPx * ctaPadHRatio;

  // The gap above the button is generous — that breathing room is part of the
  // look. It is sized off the canvas, not off the title: the title's ceiling is
  // deliberately loose, so keying the gap to it would reserve a huge void and
  // then squeeze the type that was supposed to grow into it.
  const ctaGapPx = Math.round(canvasMin * 0.055);
  const reservedForCta = showCta ? ctaPx * (1 + ctaPadVRatio * 2) + ctaGapPx : 0;

  // Cap how much of the frame the whole stack may occupy. Without this the type
  // grows until it fills the canvas edge to edge and the photo stops reading as
  // the hero — the copy has to sit IN the image, not cover it.
  // Same optical-sizing exception as the column: on a small canvas the copy may
  // claim more of the height, or the height budget — not the size ceiling — ends
  // up being what keeps the type too small to read on a phone.
  const stackBase = { wide: 0.62, square: 0.56, portrait: 0.46 }[layout];
  const stackFraction = w < 800 ? stackBase + 0.12 : stackBase;
  const stackBudget = Math.min(availableHeight, h * stackFraction);
  // Campaign eyebrow, centred above the title in tracked Suisse caps.
  const badge = campaignBadge({
    campaign: brand.campaign,
    fontFamily: brand.fontBody,
    fontWeight: 600,
    W: contentWidth,
    maxPx: Math.max(12, Math.min(canvasMin * 0.032, 28)),
    charRatio: 0.6,
    tracking: 0.28,
    align: 'center',
    radius: 999,
  });
  const badgeGapPx = Math.round(badge.px * 1.4);
  const reservedForBadge = badge.heightPx ? badge.heightPx + badgeGapPx : 0;
  const stackH = Math.max(60, stackBudget - reservedForCta - reservedForBadge);

  // Subtitle: fit into at most ~40% of the stack, capped so it stays clearly
  // below the title, then reserve the exact height it wraps to.
  let reservedForSub = 0;
  if (subtitleText) {
    const subMaxPx = Math.max(16, Math.min(titlePx * 0.45, canvasMin * 0.05, 48));
    subtitlePx = fitFontExact({
      text: subtitleText,
      W: contentWidth,
      H: stackH * 0.4,
      charRatio: subCharRatio, // Suisse Intl
      lineHeight: subLineH,
      maxPx: subMaxPx,
      minPx: 11,
    });
    const subLines = measureLines({
      text: subtitleText, W: contentWidth, px: subtitlePx, charRatio: subCharRatio,
    });
    reservedForSub = subLines * subLineH * subtitlePx + Math.max(10, subtitlePx * 1.1);
  }

  titlePx = fitFontExact({
    text: titleText,
    W: contentWidth,
    H: Math.max(60, stackH - reservedForSub),
    charRatio: titleCharRatio, // Ogg serif, widely tracked
    lineHeight: titleLineH,
    maxPx: titlePx,
    minPx: 14,
  });

  // Centered display type reads badly when one of the author's lines wraps into
  // a one-word orphan. If keeping every \n-segment on its own line costs only a
  // modest size reduction, take it; otherwise let the title wrap naturally.
  const titleSegments = titleText.split('\n').filter(Boolean);
  if (titleSegments.length > 0) {
    const noWrapPx = Math.floor(Math.min(
      ...titleSegments.map((seg) => contentWidth / (seg.length * 1.05 * titleCharRatio)),
    ));
    if (noWrapPx >= titlePx * 0.62) titlePx = Math.min(titlePx, noWrapPx);
  }

  // The stack is bottom-anchored, so its centre — and therefore the part of
  // the photo that has to stay readable — is well below the middle of the
  // canvas. Measure it so the scrim can be aimed at the copy instead of at the
  // geometric centre.
  const titleLines = measureLines({
    text: titleText, W: contentWidth, px: titlePx, charRatio: titleCharRatio,
  });
  const stackTotalH = titleLines * titleLineH * titlePx + reservedForSub + reservedForCta
    + reservedForBadge;
  const scrimY = Math.max(30, Math.min(85,
    ((h - padBottomPx - stackTotalH / 2) / h) * 100));
  // Size the scrim to the copy. A default (farthest-corner) ellipse has already
  // faded toward its soft edge by the time it reaches the ends of a long line,
  // which is exactly where bright photos wash the type out.
  const scrimW = 82;
  const scrimH = Math.max(30, Math.min(75, (stackTotalH / h) * 100 * 1.15 + 12));

  const subHtml = subtitleText
    ? `<p class="sub">${copyToHtml(subtitleText)}</p>`
    : '';
  const ctaHtml = showCta ? `<a class="cta">${escapeHtml(cta)}</a>` : '';

  // Scrim: dark green tinted, strongest over the copy (not the canvas centre),
  // so the yellow type reads without flattening the photo at the edges.
  const scrim = colors.overlayScrim || 'rgba(27,38,37,0.55)';
  const scrimSoft = colors.overlayScrimSoft || 'rgba(27,38,37,0.20)';

  // Campaign decoration: frame / corner texture over the photo, and a seal in
  // the top-right corner — the copy is centred low, so that corner is free.
  const deco = brand.campaign ? (brand.decor || {}) : {};
  const frameInset = padPx * 0.42;
  // The seal must clear the copy stack: when the column reaches under the
  // seal's corner, shrink it to the gap above the stack, or drop it if that
  // gap is too small to carry a legible seal.
  const sealInset = frameInset + padPx * 0.5;
  let sealPx = canvasMin * (layout === 'portrait' ? 0.3 : 0.24);
  const stackTop = h - padBottomPx - stackTotalH;
  const columnRight = (w + contentWidth) / 2;
  if (w - sealInset - sealPx < columnRight) {
    sealPx = Math.min(sealPx, stackTop - sealInset - padPx * 0.4);
    if (sealPx < canvasMin * 0.15) sealPx = 0;
  }
  const decorHtml = [
    decor.pattern({ cfg: deco.pattern, w, h, id: 'ed-pat' }),
    decor.frame({ cfg: deco.frame, w, h, inset: frameInset }),
    decor.sticker({
      cfg: deco.sticker && { ...deco.sticker, font: deco.sticker.font || brand.fontBody },
      campaign: brand.campaign, size: sealPx,
      right: sealInset, top: sealInset,
    }),
  ].join('');

  const bodyCss = `
    .root {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      font-family: ${brand.fontBody};
      background: ${colors.overlayBg || colors.panel};
      /* Hairline frame so the banner reads as a piece against light pages.
         box-sizing is border-box, so it's drawn inside the canvas and the
         photo (inset: 0 → padding box) sits flush against it. */
      border: 1px solid ${colors.frame || '#E1E1E1'};
    }
    .bg-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: ${focalX}% ${focalY}%;
      transform: scale(${zoomScale});
      transform-origin: ${focalX}% ${focalY}%;
    }
    .scrim {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse ${scrimW}% ${scrimH}% at 50% ${scrimY.toFixed(1)}%,
        ${scrim} 0%,
        ${scrim} 58%,
        ${scrimSoft} 100%);
      pointer-events: none;
    }
    .veil {
      position: absolute; inset: 0;
      background: rgba(27,38,37,0.22);
      pointer-events: none;
    }
    .content {
      position: absolute;
      inset: 0;
      padding: ${padPx}px ${padPx}px ${padBottomPx}px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: ${ctaGapPx}px;
      text-align: center;
      z-index: 4;
    }
    .text-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: ${Math.max(10, Math.round(subtitlePx * 1.1))}px;
      max-width: ${contentWidth}px;
    }
    .title {
      font-family: ${brand.fontTitle};
      font-size: ${titlePx}px;
      font-weight: ${brand.titleWeight ?? 400};
      line-height: ${titleLineH};
      letter-spacing: ${titleTracking}em;
      word-spacing: ${titleWordGap}em;
      color: ${colors.overlayTitle};
      text-transform: ${brand.titleCase ?? 'none'};
      text-shadow: 0 ${Math.round(remPx * 0.15)}px ${Math.round(remPx * 1.0)}px rgba(0,0,0,0.28);
      white-space: normal;
      overflow-wrap: normal;
      word-break: normal;
      margin: 0;
    }
    .sub {
      font-family: ${brand.fontBody};
      font-size: ${subtitlePx}px;
      font-weight: 400;
      line-height: ${subLineH};
      letter-spacing: ${subTracking}em;
      color: ${colors.overlayBody};
      text-shadow: 0 ${Math.round(remPx * 0.12)}px ${Math.round(remPx * 0.9)}px rgba(0,0,0,0.28);
      margin: 0;
    }
    /* Ghost button: no fill, hairline outline, tracked-out label — editorial
       rather than e-commerce. Sits on the photo without punching a hole in it.
       Campaigns (Black Friday…) set colors.ctaFill to turn it into a solid button. */
    .cta {
      background: ${colors.ctaFill || 'transparent'};
      color: ${colors.ctaFillText || colors.cta};
      border: 1px solid ${colors.ctaFill || colors.cta};
      font-family: ${brand.fontBody};
      font-size: ${ctaPx}px;
      font-weight: 500;
      letter-spacing: ${ctaTracking}em;
      padding: ${ctaPadVPx}px ${ctaPadHPx}px;
      border-radius: 0;
      text-decoration: none;
      display: inline-block;
      line-height: 1;
      white-space: nowrap;
      ${colors.ctaFill ? 'text-shadow: none;' : `text-shadow: 0 ${Math.round(remPx * 0.12)}px ${Math.round(remPx * 0.9)}px rgba(0,0,0,0.28);`}
    }
    .campaign { margin-bottom: ${Math.max(0, badgeGapPx - Math.max(10, Math.round(subtitlePx * 1.1)))}px; }
    ${badge.css}
  `;

  const body = `
    <div class="root">
      ${imageUrl ? `<img class="bg-image" src="${escapeHtml(imageUrl)}" alt="">` : ''}
      <div class="scrim"></div>
      ${veil ? `<div class="veil"></div>` : ''}
      ${decorHtml}
      <div class="content">
        <div class="text-block">
          ${badge.html}
          <h1 class="title">${copyToHtml(titleText)}</h1>
          ${subHtml}
        </div>
        ${ctaHtml}
      </div>
    </div>
  `;

  return htmlDocument({ w, h, bodyCss, body, baseUrl });
}

module.exports = { render };
