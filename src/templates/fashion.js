// "fashion" style: editorial Vogue/Telva look-and-feel for Nuria Cobo.
//
// Two layouts, picked by format shape:
//   - wide formats     → PANEL mode: a cream text panel beside the photo,
//                        blue serif (Ogg Roman) title, rose-pink pill CTA.
//   - square/portrait  → OVERLAY mode: full-bleed photo with white serif text
//                        anchored to the bottom-left and a soft scrim for legibility.
//
// The logo lockup (monogram + "Nuria Cobo") is shown ONLY on Google formats:
// blue on the panel, white over the photo. Never italic.

const {
  layoutCategory, escapeHtml, copyToHtml, htmlDocument,
  normalizeCopyKeepingBreaks, fitFontExact, measureLines, campaignBadge,
} = require('./shared');
const { logoSvg } = require('../logo');
const decor = require('./decor');

function render({ brand, copy, subcopy, cta, imageUrl, focal, veil, zoom, format, baseUrl }) {
  const { w, h } = format;
  const layout = layoutCategory(w, h);
  const focalX = Math.max(0, Math.min(100, focal?.x ?? 50));
  const focalY = Math.max(0, Math.min(100, focal?.y ?? 50));
  const zoomScale = Math.max(1, Math.min(4, Number(zoom) || 1));
  const colors = brand.colors;

  const mode = layout === 'wide' ? 'panel' : 'overlay';

  // Logo only on Google formats.
  const showLogo = format.platform === 'google';

  // Format-specific CTA suppression (banners that are too short / are headers).
  const isInstagramStory = w === 1080 && h === 1920;
  const isTwitterHeader  = w === 1500 && h === 500;
  const isFacebookCover  = w === 1650 && h === 671;
  const showCta = cta && !(isInstagramStory || isTwitterHeader || isFacebookCover);

  const canvasMin = Math.min(w, h);
  const remPx = canvasMin / 100;

  // Typography baselines. Panels get a noticeably larger title than overlays;
  // the subtitle is an editorial caption — always meaningfully smaller than the
  // title (its final size is fit to the space below, further down).
  let titlePx    = mode === 'panel'
    ? Math.max(34, Math.min(canvasMin * 0.145, 150))
    : Math.max(32, Math.min(canvasMin * 0.094, 92));
  let subtitlePx = 0; // resolved by fitting, once the title box is known.
  let ctaPx      = Math.max(18, Math.min(canvasMin * 0.046, 40));
  const logoHeightPx = Math.max(26, Math.min(canvasMin * 0.05, 56));

  const titleLineH = 1.12;
  const subLineH   = 1.4;

  const titleText    = normalizeCopyKeepingBreaks(copy);
  const subtitleText = subcopy ? normalizeCopyKeepingBreaks(subcopy) : '';

  // --- Geometry: where the text lives, so we can fit the title to it. --------
  let contentWidth, availableTitleHeight, padTopPx, padBottomPx, padSidePx;
  const padRem = layout === 'portrait' ? 5 : 6;

  if (mode === 'panel') {
    // 50/50 split: text panel on the left, photo on the right.
    const panelWidthPx = w * 0.5;
    padTopPx = padRem * remPx;
    padBottomPx = padRem * remPx;
    padSidePx = padRem * remPx;
    contentWidth = panelWidthPx - padSidePx * 2;
    availableTitleHeight = h - padTopPx - padBottomPx;
  } else {
    // Full-bleed photo. Text sits in a column lifted off the bottom edge.
    // IG Story gets extra top padding so a profile avatar won't clash.
    padTopPx = isInstagramStory ? 180 : padRem * remPx;
    // Lift the text block up from the bottom (bigger bottom margin).
    padBottomPx = (isInstagramStory ? padRem * 2.4 : padRem * 1.6) * remPx;
    padSidePx = padRem * remPx;
    contentWidth = w - padSidePx * 2;
    availableTitleHeight = h - padTopPx - padBottomPx;
  }

  // Reserve fixed chrome (logo + CTA) first; title and subtitle share the rest.
  const reservedForLogo = showLogo ? logoHeightPx + 28 : 0;
  const reservedForCta  = showCta ? ctaPx * 2.6 + 24 : 0;
  // Campaign eyebrow above the title: tracked Suisse caps, left-aligned.
  const badge = campaignBadge({
    // A brand may give the badge a different look over photos (badge.overlay).
    campaign: mode === 'overlay' && brand.campaign?.overlay
      ? { ...brand.campaign, ...brand.campaign.overlay }
      : brand.campaign,
    fontFamily: brand.fontBody,
    fontWeight: 600,
    W: contentWidth,
    maxPx: Math.max(13, Math.min(canvasMin * 0.034, 30)),
    charRatio: 0.6,
    tracking: 0.22,
    radius: 999,
  });
  const badgeGapPx = Math.round(badge.px * 1.2);
  const reservedForBadge = badge.heightPx ? badge.heightPx + badgeGapPx : 0;
  const stackH = Math.max(
    60,
    availableTitleHeight - reservedForLogo - reservedForCta - reservedForBadge,
  );

  // Title width: panels use the full content width; overlays cap to keep
  // measured editorial line lengths. The subtitle body wraps to the same width.
  const titleWidth = mode === 'panel' ? contentWidth : contentWidth * 0.92;

  // Subtitle: fit an editorial caption into at most ~45% of the stack, capped
  // so it stays well below the title. Then reserve the exact height it wraps to.
  let reservedForSub = 0;
  if (subtitleText) {
    const subMaxPx = Math.max(18, Math.min(titlePx * 0.6, canvasMin * 0.06, 58));
    subtitlePx = fitFontExact({
      text: subtitleText,
      W: titleWidth,
      H: stackH * 0.5,
      charRatio: 0.5, // Suisse Intl
      lineHeight: subLineH,
      maxPx: subMaxPx,
      minPx: 13,
    });
    const subLines = measureLines({
      text: subtitleText, W: titleWidth, px: subtitlePx, charRatio: 0.5,
    });
    reservedForSub = subLines * subLineH * subtitlePx + Math.max(12, subtitlePx * 0.6);
  }

  const titleBoxH = Math.max(60, stackH - reservedForSub);

  titlePx = fitFontExact({
    text: titleText,
    W: titleWidth,
    H: titleBoxH,
    charRatio: 0.5, // Ogg Roman
    lineHeight: titleLineH,
    maxPx: titlePx,
    minPx: 18,
  });

  // CTA pill must fit the content width. The label is uppercase with 0.12em
  // letter-spacing (~0.12 extra per glyph) inside 1.7em horizontal padding each
  // side, so budget ~0.74 per char plus the 3.4em of padding.
  const ctaTextLen = (cta || '').length;
  const maxCtaByWidth = ctaTextLen > 0
    ? contentWidth / (ctaTextLen * 0.74 + 3.4)
    : Infinity;
  ctaPx = Math.max(13, Math.min(ctaPx, maxCtaByWidth));
  const ctaPadVPx = ctaPx * 0.85;
  const ctaPadHPx = ctaPx * 1.7;

  // --- HTML fragments -------------------------------------------------------
  const subHtml = subtitleText
    ? `<p class="sub">${copyToHtml(subtitleText)}</p>`
    : '';
  const ctaHtml = showCta ? `<a class="cta">${escapeHtml(cta)}</a>` : '';
  const logoHtml = showLogo ? `<div class="logo">${logoSvg()}</div>` : '';

  const titleColor    = mode === 'panel' ? colors.title : colors.titleOverlay;
  const subtitleColor = mode === 'panel' ? colors.subtitle : colors.subtitleOverlay;
  const logoColor     = mode === 'panel' ? colors.logo : colors.logoOverlay;

  // --- Shared CSS for type ---------------------------------------------------
  const typeCss = `
    .logo { color: ${logoColor}; line-height: 0; }
    .logo svg { height: ${logoHeightPx}px; width: auto; display: block; }
    .text-block {
      display: flex;
      flex-direction: column;
      gap: ${Math.max(10, Math.round(subtitlePx * 0.55))}px;
    }
    .title {
      font-family: ${brand.fontTitle};
      font-size: ${titlePx}px;
      font-weight: ${brand.titleWeight ?? 400};
      font-style: normal;
      line-height: ${titleLineH};
      letter-spacing: -0.005em;
      color: ${titleColor};
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
      font-style: normal;
      line-height: ${subLineH};
      color: ${subtitleColor};
      margin: 0;
    }
    .campaign { margin-bottom: ${Math.max(0, badgeGapPx - Math.max(10, Math.round(subtitlePx * 0.55)))}px; }
    ${badge.css}
    .cta {
      align-self: flex-start;
      background: ${colors.cta};
      color: ${colors.ctaText};
      font-family: ${brand.fontBody};
      font-size: ${ctaPx}px;
      font-weight: 600;
      font-style: normal;
      padding: ${ctaPadVPx}px ${ctaPadHPx}px;
      border-radius: 999px;
      text-decoration: none;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      line-height: 1;
      white-space: nowrap;
    }
  `;

  // Campaign decoration. Panel mode: texture on the panel, sticker on the
  // photo. Overlay mode: sticker in the top-right corner (copy is bottom-left,
  // logo top-left).
  const deco = brand.campaign ? (brand.decor || {}) : {};
  const stickerCfg = deco.sticker && { ...deco.sticker, font: deco.sticker.font || brand.fontBody };
  const stickerPx = mode === 'panel'
    ? Math.min(w * 0.5, h) * 0.42
    : canvasMin * 0.30;
  const stickerHtml = decor.sticker({
    cfg: stickerCfg, campaign: brand.campaign, size: stickerPx,
    right: padSidePx, top: mode === 'panel' ? padSidePx : padTopPx,
  });
  const panelDecorHtml = mode === 'panel'
    ? decor.pattern({ cfg: deco.pattern, w: Math.round(w * 0.5), h, id: 'fa-pat' })
    : '';

  let bodyCss, body;

  if (mode === 'panel') {
    bodyCss = `
      .root {
        width: 100%; height: 100%;
        display: flex; flex-direction: row;
        font-family: ${brand.fontBody};
        background: ${colors.panelBg};
      }
      .panel {
        position: relative;
        width: 50%;
        flex-shrink: 0;
        background: ${colors.panelBg};
        padding: ${padTopPx}px ${padSidePx}px ${padBottomPx}px ${padSidePx}px;
        display: flex;
        flex-direction: column;
        justify-content: ${showLogo ? 'space-between' : 'center'};
        gap: ${Math.round(subtitlePx * 0.8)}px;
        overflow: hidden;
      }
      .panel > .logo, .panel > .text-block, .panel > .cta { position: relative; z-index: 1; }
      .image-area {
        flex: 1 1 auto;
        position: relative;
        overflow: hidden;
        min-width: 0; min-height: 0;
      }
      .bg-image {
        width: 100%; height: 100%;
        object-fit: cover;
        object-position: ${focalX}% ${focalY}%;
        transform: scale(${zoomScale});
        transform-origin: ${focalX}% ${focalY}%;
      }
      .veil { position: absolute; inset: 0; background: rgba(0,0,0,0.18); pointer-events: none; }
      ${typeCss}
    `;
    body = `
      <div class="root">
        <div class="panel">
          ${panelDecorHtml}
          ${logoHtml}
          <div class="text-block">
            ${badge.html}
            <h1 class="title">${copyToHtml(titleText)}</h1>
            ${subHtml}
          </div>
          ${ctaHtml}
        </div>
        <div class="image-area">
          ${imageUrl ? `<img class="bg-image" src="${escapeHtml(imageUrl)}" alt="">` : ''}
          ${veil ? `<div class="veil"></div>` : ''}
          ${stickerHtml}
        </div>
      </div>
    `;
  } else {
    // OVERLAY: photo fills the canvas; text is anchored bottom-left.
    bodyCss = `
      .root {
        width: 100%; height: 100%;
        position: relative;
        font-family: ${brand.fontBody};
        background: #000;
        overflow: hidden;
      }
      .bg-image {
        position: absolute; inset: 0;
        width: 100%; height: 100%;
        object-fit: cover;
        object-position: ${focalX}% ${focalY}%;
        transform: scale(${zoomScale});
        transform-origin: ${focalX}% ${focalY}%;
      }
      .scrim {
        position: absolute; inset: 0;
        background: linear-gradient(to top,
          ${colors.overlayScrim || 'rgba(0,0,0,0.50)'} 0%,
          rgba(0,0,0,0.18) 38%,
          rgba(0,0,0,0.00) 70%);
        pointer-events: none;
      }
      .veil { position: absolute; inset: 0; background: rgba(0,0,0,0.22); pointer-events: none; }
      .content {
        position: absolute; inset: 0;
        padding: ${padTopPx}px ${padSidePx}px ${padBottomPx}px ${padSidePx}px;
        display: flex;
        flex-direction: column;
        z-index: 4;
      }
      .bottom {
        margin-top: auto;
        display: flex;
        flex-direction: column;
        gap: ${Math.round(subtitlePx * 0.8)}px;
        max-width: 92%;
      }
      ${typeCss}
    `;
    body = `
      <div class="root">
        ${imageUrl ? `<img class="bg-image" src="${escapeHtml(imageUrl)}" alt="">` : ''}
        <div class="scrim"></div>
        ${veil ? `<div class="veil"></div>` : ''}
        ${stickerHtml}
        <div class="content">
          ${logoHtml}
          <div class="bottom">
            <div class="text-block">
              ${badge.html}
              <h1 class="title">${copyToHtml(titleText)}</h1>
              ${subHtml}
            </div>
            ${ctaHtml}
          </div>
        </div>
      </div>
    `;
  }

  return htmlDocument({ w, h, bodyCss, body, baseUrl });
}

module.exports = { render };
