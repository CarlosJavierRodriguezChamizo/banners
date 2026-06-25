// "tags" style: image full-background, title text in colored inline boxes,
// CTA pill in accent color with a curved "swoosh" mark. Used by Solomamparas and Douche Elite.

const {
  escapeHtml, layoutCategory, copyToHtml, htmlDocument,
  normalizeCopyKeepingBreaks, fitFontExact,
} = require('./shared');

// Brand swoosh path extracted from the official button SVG (Solomamparas).
// Bounding box ≈ x:[-2.5, 59.6], y:[-2.6, 94.7]  →  viewBox -3 -3 66 100
const SWOOSH_PATH =
  'M9.652,94.443-2.5,94.632V88.568c0-20.7,10.21-38.7,27.311-48.159' +
  'A45.142,45.142,0,0,0,41.337,24.868a40.549,40.549,0,0,0,4.514-10.079' +
  'A39.825,39.825,0,0,0,47.426,3.661V-2.4l12.152-.189V3.472' +
  'a54.6,54.6,0,0,1-8.17,28.872A55.092,55.092,0,0,1,31.309,51.4' +
  'A41.387,41.387,0,0,0,9.652,88.379Z';
const SWOOSH_VIEWBOX = '-3 -3 66 100';
const SWOOSH_ASPECT = 66 / 100; // width / height

function render({ brand, copy, subcopy, cta, imageUrl, focal, veil, zoom, format, baseUrl }) {
  const { w, h } = format;
  const layout = layoutCategory(w, h);
  const focalX = Math.max(0, Math.min(100, focal?.x ?? 50));
  const focalY = Math.max(0, Math.min(100, focal?.y ?? 50));
  const zoomScale = Math.max(1, Math.min(4, Number(zoom) || 1));

  const colors = brand.colors;
  // Continuous text with optional explicit \n preserved as hard breaks.
  const titleText = normalizeCopyKeepingBreaks(copy);

  // Format-specific behavior
  const isGoogleOrFB = w === 1200 && (h === 628 || h === 630);
  const isInstagramStory = w === 1080 && h === 1920;
  const showCta = !isInstagramStory;

  const remPx     = Math.min(w, h) / 100;
  const padRem    = layout === 'portrait' ? 5 : 6;
  // Instagram Story: push the title well down so it clears the IG avatar /
  // profile chrome at the top of the story (≈ top 18% of a 1080×1920 canvas).
  const padTopRem = isInstagramStory ? 18 : padRem;
  // Vertical padding in `em` (font-relative) so the blue bars scale with the
  // title size and never overlap regardless of format. Horizontal stays in rem.
  const tagPadVEm = 0.12;
  const tagPadH   = 1.3;

  // Title size constraints:
  //   - 1200×628 / 1200×630: text-area width ≤ 50% of canvas
  //   - All other formats:   text-area width ≤ 65% of canvas
  //   - Also: ≤ 35% of canvas area
  //   - Always: leaves room for CTA (when shown) and respects hard caps.
  const widthFraction = isGoogleOrFB ? 0.50 : 0.65;
  const charRatio  = 0.63; // Sora-ExtraBold uppercase
  // Each cloned blue bar is painted over the font's content box (Sora's
  // ascent+descent = 1.15em, measured) plus the vertical padding, so the
  // painted bar height is exactly `barEm` per em. Measured by pixel-scanning
  // the rendered bar (278px @ 200px font → 1.39em). Setting the line-height
  // equal to this makes the cloned bars sit perfectly flush: gap = 0, no
  // overlap. The exact px line-height is computed below once titlePx is known.
  const soraContentEm = 1.15;
  const barEm  = soraContentEm + 2 * tagPadVEm; // 1.39 — painted bar height/em
  const tagLineH = barEm; // unitless, used only for the font-fit estimate

  const layerPadXPx = padRem * remPx;
  const tagPadPx   = tagPadH * remPx;

  // Title text area (W × H).
  const titleAreaW = w * widthFraction - 2 * tagPadPx;
  const ctaReservedPx = showCta ? (layout === 'wide' ? 120 : 170) : 0;
  const titleAreaH = Math.min(
    h - 2 * layerPadXPx - ctaReservedPx,
    h * 0.40,  // never more than 40% of canvas height vertically
  );
  // Also clamp by area cap (22% of canvas).
  const areaCap = w * h * 0.22;
  const titleAreaWidthForArea = Math.min(titleAreaW, areaCap / titleAreaH);

  const maxTitlePx = layout === 'wide' ? 58 : layout === 'square' ? 66 : 76;
  const titlePx = Math.max(18, fitFontExact({
    text: titleText,
    W: titleAreaWidthForArea,
    H: titleAreaH,
    charRatio,
    lineHeight: tagLineH,
    maxPx: maxTitlePx,
    minPx: 18,
  }));

  // Exact line pitch in whole pixels so each cloned blue bar tiles edge-to-edge
  // with the next — line boxes are inherently contiguous, so matching the line
  // box height to the painted bar height (both = barEm × titlePx) yields a true
  // 0 gap with no sub-pixel overlap seam.
  const tagLinePitchPx = Math.round(barEm * titlePx);

  // CTA dimensions — replicates the brand SVG (orange rounded rect + white swoosh).
  // Button height scales with canvas; swoosh keeps its native aspect ratio.
  const ctaHeightPx   = Math.max(58, Math.min(116, Math.min(w, h) * 0.115));
  const ctaRadiusPx   = Math.max(3, ctaHeightPx * 0.05);
  const ctaTextPx     = Math.round(ctaHeightPx * 0.42);
  const ctaPadLeftPx  = Math.round(ctaHeightPx * 0.45);
  const ctaGapPx      = Math.round(ctaHeightPx * 0.20);
  const ctaPadRightPx = Math.round(ctaHeightPx * 0.30);
  const swooshHeightPx = Math.round(ctaHeightPx * 0.95);
  const swooshWidthPx  = Math.round(swooshHeightPx * SWOOSH_ASPECT);

  // Single inline span — box-decoration-break: clone gives each wrapped line
  // its own blue background rectangle. \n turn into <br> for hard breaks.
  const titleHtml = titleText
    ? `<span class="tag-line">${copyToHtml(titleText)}</span>`
    : '';

  const subHtml = subcopy
    ? `<p class="sub">${copyToHtml(normalizeCopyKeepingBreaks(subcopy))}</p>`
    : '';

  const ctaHtml = (showCta && cta)
    ? `<a class="cta">
         <span class="cta-text">${escapeHtml(cta)}</span>
         <svg class="cta-swoosh" viewBox="${SWOOSH_VIEWBOX}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
           <path d="${SWOOSH_PATH}" fill="${colors.ctaText}"/>
         </svg>
       </a>`
    : '';

  const bodyCss = `
    .root {
      position: relative;
      width: 100%;
      height: 100%;
      font-family: ${brand.fontFamily};
      color: ${colors.tagText};
      overflow: hidden;
      background: #2a2a2a;
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
    .veil {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0) 100%);
      pointer-events: none;
    }
    .layer {
      position: absolute;
      inset: 0;
      padding: ${padTopRem}rem ${padRem}rem ${padRem}rem ${padRem}rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 2rem;
    }
    .title {
      width: ${widthFraction * 100}%;
      max-width: ${widthFraction * 100}%;
      /* Slight negative padding compensation so the first tag aligns at left edge. */
    }
    .tag-line {
      background: ${colors.tagBgAlpha || colors.tagBg};
      color: ${colors.tagText};
      font-size: ${titlePx}px;
      font-weight: ${brand.titleWeight ?? 800};
      line-height: ${tagLinePitchPx}px;
      text-transform: ${brand.titleCase ?? 'uppercase'};
      letter-spacing: -0.005em;
      padding: ${tagPadVEm}em ${tagPadH}rem;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      white-space: normal;
      overflow-wrap: normal;
      word-break: normal;
      hyphens: none;
    }
    .sub {
      font-size: 2.6rem;
      font-weight: 500;
      margin-top: 1rem;
      max-width: 70%;
      color: #fff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    .cta {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      background: ${colors.cta};
      height: ${ctaHeightPx}px;
      border-radius: ${ctaRadiusPx}px;
      text-decoration: none;
      color: ${colors.ctaText};
      font-family: ${brand.fontFamily};
      line-height: 1;
      overflow: hidden;
      padding: 0 ${ctaPadRightPx}px 0 ${ctaPadLeftPx}px;
      gap: ${ctaGapPx}px;
    }
    .cta-text {
      font-size: ${ctaTextPx}px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .cta-swoosh {
      width: ${swooshWidthPx}px;
      height: ${swooshHeightPx}px;
      flex-shrink: 0;
      display: block;
    }
  `;

  const body = `
    <div class="root">
      ${imageUrl ? `<img class="bg-image" src="${escapeHtml(imageUrl)}" alt="">` : ''}
      ${veil ? `<div class="veil"></div>` : ''}
      <div class="layer">
        <div>
          <div class="title">${titleHtml}</div>
          ${subHtml}
        </div>
        ${ctaHtml}
      </div>
    </div>
  `;

  return htmlDocument({ w, h, bodyCss, body, baseUrl });
}

module.exports = { render };
