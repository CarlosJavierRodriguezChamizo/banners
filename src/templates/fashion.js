// "fashion" style: editorial Vogue/AD look-and-feel. White panel with a small
// brand wordmark at the top, an elegant serif italic title in navy, a clean
// sans subtitle and a rose-pink pill CTA at the bottom. Used by Nuria Cobo.

const {
  layoutCategory, escapeHtml, copyToHtml, htmlDocument,
  normalizeCopyKeepingBreaks, fitFontExact,
} = require('./shared');

function render({ brand, copy, subcopy, cta, imageUrl, focal, veil, zoom, format, baseUrl }) {
  const { w, h } = format;
  const layout = layoutCategory(w, h);
  const focalX = Math.max(0, Math.min(100, focal?.x ?? 50));
  const focalY = Math.max(0, Math.min(100, focal?.y ?? 50));
  const zoomScale = Math.max(1, Math.min(4, Number(zoom) || 1));

  const colors = brand.colors;

  // Panel/image split.
  // Wide:     50/50 (text panel left, image right) — classic editorial layout
  // Square:   stack vertically with text panel ~46% on top
  // Portrait: stack vertically with text panel ~42% on top
  const panelStyles = {
    wide:     { axis: 'row',    cross: '50%', dim: 'w' },
    square:   { axis: 'column', cross: '46%', dim: 'h' },
    portrait: { axis: 'column', cross: '42%', dim: 'h' },
  }[layout];

  // Format-specific behavior.
  const isInstagramStory    = w === 1080 && h === 1920;
  const isTwitterHeader     = w === 1500 && h === 500;
  const isFacebookCover     = w === 1650 && h === 671;
  const showCta = cta && !(isInstagramStory || isTwitterHeader || isFacebookCover);

  const padRem    = layout === 'portrait' ? 4 : 5;
  const remPx     = Math.min(w, h) / 100;
  const crossFraction = parseInt(panelStyles.cross, 10) / 100;
  const panelWidthPx  = panelStyles.dim === 'w' ? w * crossFraction : w;
  const panelHeightPx = panelStyles.dim === 'h' ? h * crossFraction : h;

  // Padding: IG Story → 180 px top so the avatar doesn't overlap the wordmark.
  const padTopPx    = isInstagramStory ? 180 : padRem * remPx;
  const padBottomPx = padRem * remPx;
  const padLeftPx   = padRem * remPx;
  const padRightPx  = padRem * remPx;
  const contentWidth = panelWidthPx - padLeftPx - padRightPx;

  // Text container width: stacked layouts use 90% to leave clear margin.
  const textWidthFraction = layout === 'wide' ? 1.0 : 0.90;
  const titleContainerWidth = contentWidth * textWidthFraction;

  // Typography rules:
  //   subtitlePx — baseline scaling with the canvas
  //   titlePx    = subtitlePx + 18  (serif title is more dramatic than Todo Muebles)
  //   ctaPx      — its own compact scale, capped so the pill stays elegant
  //   wordmarkPx — smaller than subtitle for a discreet brand mark
  const canvasMin = Math.min(w, h);
  let subtitlePx  = Math.max(22, Math.min(canvasMin * 0.065, 64));
  let titlePx     = subtitlePx + 18;
  let ctaPx       = Math.max(16, Math.min(canvasMin * 0.035, 32));
  const wordmarkPx = Math.max(18, Math.min(canvasMin * 0.045, 40));

  // CTA must fit the panel width.
  const ctaCharRatio = 0.55;
  const ctaPadHRatio = 1.30;
  const ctaTextLen   = (cta || '').length;
  const maxCtaByWidth = ctaTextLen > 0
    ? contentWidth / (ctaTextLen * ctaCharRatio + 2 * ctaPadHRatio)
    : Infinity;
  ctaPx = Math.max(14, Math.min(ctaPx, maxCtaByWidth));

  // Title fit check.
  const titleLineH = 1.12;
  const subLineH   = 1.35;
  const reservedForWordmark = wordmarkPx * 1.2 + 24;
  const reservedForSub = subcopy ? subtitlePx * subLineH * 2 + 18 : 0;
  const reservedForCta = showCta ? ctaPx * 2.5 + 24 : 0;
  const availableTitleHeight = panelHeightPx - padTopPx - padBottomPx
                                - reservedForWordmark - reservedForSub - reservedForCta;
  const titleText = normalizeCopyKeepingBreaks(copy);
  const titleFit = fitFontExact({
    text: titleText,
    W: titleContainerWidth,
    H: Math.max(60, availableTitleHeight),
    charRatio: 0.48, // Ogg italic is slightly narrower than Ogg roman
    lineHeight: titleLineH,
    maxPx: titlePx,
    minPx: 18,
  });
  if (titleFit < titlePx) {
    titlePx    = titleFit;
    subtitlePx = Math.max(14, titlePx - 18);
  }

  const subtitleText = subcopy ? normalizeCopyKeepingBreaks(subcopy) : '';
  const subHtml = subtitleText
    ? `<p class="sub">${copyToHtml(subtitleText)}</p>`
    : '';

  // CTA pill padding proportional to font for a balanced shape.
  const ctaPadVPx = ctaPx * 0.85;
  const ctaPadHPx = ctaPx * 1.6;

  const ctaHtml = showCta
    ? `<a class="cta">${escapeHtml(cta)}</a>`
    : '';

  const wordmarkText = brand.wordmark || brand.name || '';
  const wordmarkHtml = wordmarkText
    ? `<div class="wordmark">${escapeHtml(wordmarkText)}</div>`
    : '';

  const bodyCss = `
    .root {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: ${panelStyles.axis};
      font-family: ${brand.fontBody};
      background: ${colors.bg};
    }
    .panel {
      position: relative;
      ${panelStyles.axis === 'row' ? `width: ${panelStyles.cross};` : `height: ${panelStyles.cross};`}
      background: ${colors.bg};
      padding: ${padTopPx}px ${padRightPx}px ${padBottomPx}px ${padLeftPx}px;
      flex-shrink: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0;
    }
    .wordmark {
      font-family: ${brand.fontTitle};
      font-size: ${wordmarkPx}px;
      font-weight: 500;
      font-style: italic;
      color: ${colors.wordmark};
      letter-spacing: 0.005em;
      line-height: 1;
    }
    .text-block {
      display: flex;
      flex-direction: column;
      gap: ${Math.max(10, Math.round(subtitlePx * 0.6))}px;
      max-width: ${textWidthFraction * 100}%;
    }
    .title {
      font-family: ${brand.fontTitle};
      font-size: ${titlePx}px;
      font-weight: ${brand.titleWeight ?? 400};
      font-style: ${brand.titleStyle ?? 'italic'};
      line-height: ${titleLineH};
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
      font-weight: 400;
      line-height: ${subLineH};
      color: ${colors.subtitle};
      margin: 0;
      max-width: 90%;
    }
    .cta {
      align-self: flex-start;
      background: ${colors.cta};
      color: ${colors.ctaText};
      font-family: ${brand.fontBody};
      font-size: ${ctaPx}px;
      font-weight: 600;
      padding: ${ctaPadVPx}px ${ctaPadHPx}px;
      border-radius: 999px;
      text-decoration: none;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.12em;
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
      background: linear-gradient(to right, rgba(255,255,255,0.18), rgba(255,255,255,0));
      pointer-events: none;
    }
  `;

  const body = `
    <div class="root">
      <div class="panel">
        ${wordmarkHtml}
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
