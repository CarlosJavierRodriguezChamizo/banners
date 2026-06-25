// "editorial" style: solid color panel with a subtle geometric SVG pattern
// hosting the text; image lives in its own area alongside (65% of canvas).
// Used by Todo Muebles de Baño.

const {
  layoutCategory, escapeHtml, copyToHtml, htmlDocument,
  normalizeCopyKeepingBreaks, fitFontExact,
} = require('./shared');

const PATTERN_URL = '/patterns/todo-muebles.svg';

function render({ brand, copy, subcopy, cta, imageUrl, focal, veil, zoom, format, baseUrl }) {
  const { w, h } = format;
  const layout = layoutCategory(w, h);
  const focalX = Math.max(0, Math.min(100, focal?.x ?? 50));
  const focalY = Math.max(0, Math.min(100, focal?.y ?? 50));
  const zoomScale = Math.max(1, Math.min(4, Number(zoom) || 1));

  const colors = brand.colors;

  // Panel/image split.
  // Wide     → vertical split  (left 35% panel, right 65% image)
  // Square   → horizontal split (top 45% panel, bottom 55% image) — gives the
  //            stacked panel enough room for big title + subtitle + CTA.
  // Portrait → horizontal split (top 35% panel, bottom 65% image)
  const panelStyles = {
    wide:     { axis: 'row',    cross: '35%', dim: 'w' },
    square:   { axis: 'column', cross: '45%', dim: 'h' },
    portrait: { axis: 'column', cross: '35%', dim: 'h' },
  }[layout];

  // Title + subtitle anchored top, CTA anchored bottom (when the panel is
  // tall enough for the gap to read as intentional).
  const verticalAnchor = true;

  // Format-specific behavior.
  //   1080×1920 (Instagram Story) — no CTA + extra top padding so the avatar
  //                                  overlay never covers the title/subtitle.
  //   1500×500  (Twitter header) — no CTA.
  //   1650×671  (Facebook cover) — no CTA.
  //   1000×1500 (Pinterest)      — text must never exceed 90% of canvas width.
  const isInstagramStory    = w === 1080 && h === 1920;
  const isTwitterHeader     = w === 1500 && h === 500;
  const isFacebookCover     = w === 1650 && h === 671;
  const isPinterestPortrait = w === 1000 && h === 1500;
  const showCta = cta && !(isInstagramStory || isTwitterHeader || isFacebookCover);

  const padRem    = layout === 'portrait' ? 4 : 5;
  const remPx     = Math.min(w, h) / 100;
  const layerPadPx = padRem * remPx;
  const crossFraction = parseInt(panelStyles.cross, 10) / 100;
  const panelWidthPx  = panelStyles.dim === 'w' ? w * crossFraction : w;
  const panelHeightPx = panelStyles.dim === 'h' ? h * crossFraction : h;

  // Padding: wide layouts use a tight 20 px right padding so the title sits
  // ~20 px from the image edge. Other sides keep the regular rem-based padding.
  // IG Story: 180 px top padding leaves clear space for the avatar and
  // username overlay that IG renders at the top of the screen.
  const padTopPx    = isInstagramStory ? 180 : padRem * remPx;
  const padBottomPx = padRem * remPx;
  const padLeftPx   = padRem * remPx;
  const padRightPx  = layout === 'wide' ? 20 : padRem * remPx;

  // Text container width.
  //   Wide: uses the full content area (the 20 px right padding IS the margin).
  //   Stacked: 90% of the content area so the text doesn't reach the edge.
  //   Pinterest 1000×1500: hard cap at 90% of canvas width.
  const contentWidth = panelWidthPx - padLeftPx - padRightPx;
  let textWidthFraction = layout === 'wide' ? 1.0 : 0.90;
  if (isPinterestPortrait) {
    const max90Px = w * 0.9 - padLeftPx - padRightPx;
    textWidthFraction = Math.min(textWidthFraction, max90Px / contentWidth);
  }
  const titleContainerWidth = contentWidth * textWidthFraction;

  // Typography rules:
  //   subtitlePx — baseline that scales with the canvas
  //   titlePx    = subtitlePx + 15  (always)
  //   ctaPx      — its own (smaller) baseline so the pill stays compact and
  //                fits the panel width, independent of title/subtitle.
  const canvasMin = Math.min(w, h);
  let subtitlePx = Math.max(24, Math.min(canvasMin * 0.07, 68));
  let titlePx    = subtitlePx + 15;
  let ctaPx      = Math.max(18, Math.min(canvasMin * 0.045, 46));

  // CTA must fit the panel width — pad + text + pad ≤ available.
  const ctaCharRatio = 0.5;
  const ctaPadHRatio = 1.20;
  const ctaTextLen   = (cta || '').length;
  const ctaInner     = contentWidth; // panel content width
  const maxCtaByWidth = ctaTextLen > 0
    ? ctaInner / (ctaTextLen * ctaCharRatio + 2 * ctaPadHRatio)
    : Infinity;
  ctaPx = Math.max(14, Math.min(ctaPx, maxCtaByWidth));

  // Verify the title still fits the text container; if not, scale title+sub
  // down keeping the +15 px relation intact (CTA stays put).
  const tagLineH = 1.1;
  const reservedForSub = subcopy ? subtitlePx * tagLineH + 24 : 0;
  const reservedForCta = showCta ? ctaPx * 2.2 + 28 : 0; // CTA pill + gap
  const availableTitleHeight = panelHeightPx - padTopPx - padBottomPx - reservedForSub - reservedForCta;
  const titleText = normalizeCopyKeepingBreaks(copy);
  const titleFit = fitFontExact({
    text: titleText,
    W: titleContainerWidth,
    H: Math.max(60, availableTitleHeight),
    charRatio: 0.5, // Ogg serif
    lineHeight: tagLineH,
    maxPx: titlePx,
    minPx: 16,
  });
  if (titleFit < titlePx) {
    titlePx    = titleFit;
    subtitlePx = Math.max(14, titlePx - 15);
  }

  const subtitleText = subcopy ? normalizeCopyKeepingBreaks(subcopy) : '';
  const subHtml = subtitleText
    ? `<p class="sub">${copyToHtml(subtitleText)}</p>`
    : '';

  // CTA pill — padding proportional to the CTA font so it scales as a whole.
  const ctaPadVPx = ctaPx * 0.55;
  const ctaPadHPx = ctaPx * 1.20;

  const ctaHtml = showCta
    ? `<a class="cta">${escapeHtml(cta)}</a>`
    : '';

  const bodyCss = `
    .root {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: ${panelStyles.axis};
      font-family: ${brand.fontBody};
      color: ${colors.body};
      background: ${colors.panel};
    }
    .panel {
      position: relative;
      ${panelStyles.axis === 'row' ? `width: ${panelStyles.cross};` : `height: ${panelStyles.cross};`}
      background-color: ${colors.panel};
      padding: ${padTopPx}px ${padRightPx}px ${padBottomPx}px ${padLeftPx}px;
      flex-shrink: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: ${verticalAnchor ? 'space-between' : 'center'};
      gap: ${verticalAnchor ? 0 : 1.5}rem;
    }
    /* Pattern overlay sits between the panel background and the content. */
    .pattern-layer {
      position: absolute;
      inset: 0;
      background-image: url('${PATTERN_URL}');
      background-size: cover;
      background-repeat: no-repeat;
      background-position: center;
      pointer-events: none;
      z-index: 1;
    }
    .text-block {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: ${Math.max(6, Math.round(subtitlePx * 0.25))}px;
      max-width: ${textWidthFraction * 100}%;
    }
    .title {
      font-family: ${brand.fontTitle};
      font-size: ${titlePx}px;
      font-weight: ${brand.titleWeight ?? 400};
      line-height: ${tagLineH};
      letter-spacing: -0.005em;
      color: ${colors.title};
      text-transform: ${brand.titleCase ?? 'none'};
      white-space: normal;
      overflow-wrap: normal;
      word-break: normal;
      margin: 0;
    }
    .sub {
      font-family: ${brand.fontBody};
      font-size: ${subtitlePx}px;
      font-weight: 300;
      line-height: 1.3;
      color: ${colors.body};
      margin: 0;
    }
    .cta {
      position: relative;
      z-index: 2;
      align-self: flex-start;
      background: ${colors.cta};
      color: ${colors.ctaText};
      font-family: ${brand.fontBody};
      font-size: ${ctaPx}px;
      font-weight: 500;
      padding: ${ctaPadVPx}px ${ctaPadHPx}px;
      border-radius: 999px;
      text-decoration: none;
      display: inline-block;
      line-height: 1;
      white-space: nowrap;
    }
    .image-area {
      flex: 1 1 auto;
      position: relative;
      overflow: hidden;
      min-width: 0;
      min-height: 0;
    }
    .bg-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: ${focalX}% ${focalY}%;
      transform: scale(${zoomScale});
      transform-origin: ${focalX}% ${focalY}%;
    }
    .veil {
      position: absolute; inset: 0;
      background: linear-gradient(to right, rgba(0,0,0,0.18), rgba(0,0,0,0));
      pointer-events: none;
    }
  `;

  const body = `
    <div class="root">
      <div class="panel">
        <div class="pattern-layer"></div>
        <div class="text-block">
          <h1 class="title">${copyToHtml(titleText)}</h1>
          ${subHtml}
        </div>
        ${ctaHtml}
      </div>
      <div class="image-area">
        ${imageUrl ? `<img class="bg-image" src="${escapeHtml(imageUrl)}" alt="">` : ''}
        ${veil ? `<div class="veil"></div>` : ''}
      </div>
    </div>
  `;

  return htmlDocument({ w, h, bodyCss, body, baseUrl });
}

module.exports = { render };
