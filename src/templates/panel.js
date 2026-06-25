// "panel" style: solid colored panel with text on one side, image on the other.
// Used by Decorabaño and Decora Salle de Bain.

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

  // Format-specific behavior
  const isInstagramStory = w === 1080 && h === 1920;
  const showCta = !isInstagramStory;
  // For wide landscapes, separate title and CTA top/bottom for breathing room.
  const verticalAnchor = layout === 'wide';

  // Panel proportions. Square stacks vertically with the navy band on top (40% h)
  // and the image filling the bottom 60%.
  const panelStyles = {
    wide:     { axis: 'row',    cross: '46%', dim: 'w' },
    square:   { axis: 'column', cross: '40%', dim: 'h' },
    portrait: { axis: 'column', cross: '42%', dim: 'h' },
  }[layout];

  const subRem    = 2.8;
  const ctaRem    = 3.4;
  const padRem    = layout === 'portrait' ? 4 : 5;
  // Extra top padding for Instagram Story so the IG avatar doesn't overlap.
  const padTopRem = isInstagramStory ? 10 : padRem;
  const ctaGapRem = layout === 'portrait' ? 3.5 : 4;

  // Auto-size title and CTA so they always fit the panel width.
  const remPx = Math.min(w, h) / 100;
  const layerPadPx = padRem * remPx;
  const crossFraction = parseInt(panelStyles.cross, 10) / 100;
  const panelWidthPx = panelStyles.dim === 'w' ? w * crossFraction : w;
  const panelHeightPx = panelStyles.dim === 'h' ? h * crossFraction : h;
  const availableTextWidth = panelWidthPx - 2 * layerPadPx;
  // Constrain text container: in stacked layouts (square/portrait) the panel
  // spans the full canvas, so let the text occupy at most 80% of that width.
  // Wide layouts already have a narrow panel — full width is fine there.
  const textWidthFraction = layout === 'wide' ? 1.0 : 0.80;
  const titleContainerWidth = availableTextWidth * textWidthFraction;
  // Continuous text with optional explicit \n preserved as hard breaks.
  const titleText = normalizeCopyKeepingBreaks(copy);
  // Lausanne sans-serif effective char width ≈ 0.58 × font-size.
  const titleCharRatio = 0.58;
  const tagLineH = 1.15;
  const maxTitlePx = layout === 'wide' ? 70 : layout === 'square' ? 90 : 85;
  const reservedPx = (subcopy ? 110 : 0) + (showCta ? 160 : 0); // sub + CTA + gaps
  const availableTextHeight = panelHeightPx - 2 * layerPadPx - reservedPx;
  const titlePx = Math.max(24, fitFontExact({
    text: titleText,
    W: titleContainerWidth,
    H: availableTextHeight,
    charRatio: titleCharRatio,
    lineHeight: tagLineH,
    maxPx: maxTitlePx,
    minPx: 24,
  }));

  // CTA sizing. Font scales with the panel (its real container, not the
  // canvas's min dimension which is the height for wide landscapes).
  // Padding is proportional to the font so the button keeps a consistent
  // text-to-button ratio.
  const ctaCharRatio = 0.55;
  const ctaPadVRatio = 0.50; // vertical padding = 0.50 × font-size
  const ctaPadHRatio = 1.10; // horizontal padding = 1.10 × font-size
  const ctaTextLen   = (cta || '').length;
  const maxCtaByWidth = ctaTextLen > 0
    ? availableTextWidth / (ctaTextLen * ctaCharRatio + 2 * ctaPadHRatio)
    : Infinity;
  const ctaTargetPx = layout === 'wide'
    ? Math.min(panelWidthPx * 0.06, 42)
    : ctaRem * remPx;
  const ctaPx     = Math.max(18, Math.min(ctaTargetPx, maxCtaByWidth));
  const ctaPadVPx = ctaPx * ctaPadVRatio;
  const ctaPadHPx = ctaPx * ctaPadHRatio;

  const veilCss = veil
    ? `<div class="veil"></div>`
    : '';

  const subHtml = subcopy
    ? `<p class="sub">${copyToHtml(normalizeCopyKeepingBreaks(subcopy))}</p>`
    : '';

  // Justify-content on the panel:
  //   wide landscape  → space-between (title top, CTA bottom)
  //   square/portrait → center (vertically centered block)
  const panelJustify = verticalAnchor ? 'space-between' : 'center';

  const bodyCss = `
    .root {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: ${panelStyles.axis};
      font-family: ${brand.fontFamily};
      color: ${colors.text};
      background: ${colors.panel};
    }
    .panel {
      ${panelStyles.axis === 'row' ? `width: ${panelStyles.cross};` : `height: ${panelStyles.cross};`}
      background: ${colors.panel};
      padding: ${padTopRem}rem ${padRem}rem ${padRem}rem ${padRem}rem;
      display: flex;
      flex-direction: column;
      justify-content: ${panelJustify};
      gap: ${verticalAnchor ? 0 : 1.5}rem;
      flex-shrink: 0;
    }
    .text-block {
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
      max-width: ${textWidthFraction * 100}%;
    }
    .title {
      font-family: ${brand.fontFamily};
      font-size: ${titlePx}px;
      font-weight: ${brand.titleWeight ?? 500};
      line-height: ${tagLineH};
      letter-spacing: -0.01em;
      color: ${colors.text};
      text-transform: ${brand.titleCase ?? 'none'};
      white-space: normal;
      overflow-wrap: normal;
      word-break: normal;
    }
    .sub {
      font-size: ${subRem}rem;
      font-weight: 400;
      line-height: 1.3;
      color: ${colors.subtext};
      max-width: 90%;
    }
    .cta {
      align-self: flex-start;
      background: ${colors.cta};
      color: ${colors.ctaText};
      font-family: ${brand.fontFamily};
      font-size: ${ctaPx}px;
      font-weight: 500;
      padding: ${ctaPadVPx}px ${ctaPadHPx}px;
      border-radius: 999px;
      text-decoration: none;
      display: inline-block;
      ${verticalAnchor ? '' : `margin-top: ${ctaGapRem}rem;`}
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
      background: linear-gradient(to right, rgba(15,42,71,0.35), rgba(15,42,71,0));
      pointer-events: none;
    }
  `;

  const body = `
    <div class="root">
      <div class="panel">
        <div class="text-block">
          <h1 class="title">${copyToHtml(titleText)}</h1>
          ${subHtml}
        </div>
        ${showCta && cta ? `<a class="cta">${escapeHtml(cta)}</a>` : ''}
      </div>
      <div class="image-area">
        ${imageUrl ? `<img class="bg-image" src="${escapeHtml(imageUrl)}" alt="">` : ''}
        ${veilCss}
      </div>
    </div>
  `;

  return htmlDocument({ w, h, bodyCss, body, baseUrl });
}

module.exports = { render };
