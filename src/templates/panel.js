// "panel" style: solid colored panel with text on one side, image on the other.
// Used by Decorabaño and Decora Salle de Bain.

const {
  layoutCategory, escapeHtml, copyToHtml, htmlDocument,
  normalizeCopyKeepingBreaks, measureLines, longestWordLen, campaignBadge,
} = require('./shared');
const decor = require('./decor');

function render({ brand, copy, subcopy, cta, imageUrl, focal, veil, zoom, format, baseUrl, part = 'full' }) {
  const { w, h } = format;
  const layout = layoutCategory(w, h);
  const focalX = Math.max(0, Math.min(100, focal?.x ?? 50));
  const focalY = Math.max(0, Math.min(100, focal?.y ?? 50));
  const zoomScale = Math.max(1, Math.min(4, Number(zoom) || 1));

  const colors = brand.colors;

  // Campaign decoration (SVG). The sticker always lands on the photo, never on
  // the text panel; the seam texture grows out of the panel edge.
  const deco = brand.campaign ? (brand.decor || {}) : {};
  const stickerCfg = deco.sticker && { ...deco.sticker, font: deco.sticker.font || brand.fontFamily };

  // Image-only deliverable: full-bleed photo, no text panel.
  if (part === 'image') {
    const stickerPx = Math.min(w, h) * 0.34;
    const decorHtml = [
      decor.pattern({ cfg: deco.seam && { ...deco.seam, from: 'left', depth: 0.3 }, w, h, id: 'seam' }),
      decor.tape({ cfg: deco.tape, campaign: brand.campaign, w, h, font: brand.fontFamily }),
      decor.sticker({ cfg: stickerCfg, campaign: brand.campaign, size: stickerPx, top: h * 0.07, right: h * 0.07 }),
    ].join('');
    const bodyCss = `
      .root {
        width: 100%; height: 100%;
        position: relative; overflow: hidden;
        background: ${colors.panel};
      }
      .bg-image {
        width: 100%; height: 100%;
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
        ${imageUrl ? `<img class="bg-image" src="${escapeHtml(imageUrl)}" alt="">` : ''}
        ${veil ? `<div class="veil"></div>` : ''}
        ${decorHtml}
      </div>
    `;
    return htmlDocument({ w, h, bodyCss, body, baseUrl });
  }

  // Text-only deliverable: the blue panel fills the whole canvas.
  const textOnly = part === 'text';

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

  // The text-only website piece sits beside a separate photo: generous left
  // margin, the block kept to the left half, and everything a size up.
  const ctaRem    = textOnly ? 4.2 : 3.4;
  const padRem    = layout === 'portrait' ? 4 : 5;
  const padLeftRem = textOnly ? 9 : padRem;
  // Extra top padding for Instagram Story so the IG avatar doesn't overlap.
  const padTopRem = isInstagramStory ? 10 : padRem;
  const ctaGapRem = layout === 'portrait' ? 3.5 : 4;

  // Auto-size title and CTA so they always fit the panel width.
  const remPx = Math.min(w, h) / 100;
  const padTopPx = padTopRem * remPx;
  const padBotPx = padRem * remPx;
  const layerPadPx = padRem * remPx;
  const crossFraction = parseInt(panelStyles.cross, 10) / 100;
  // Text-only fills the whole canvas; otherwise the panel is a fraction of it.
  const panelWidthPx = textOnly ? w : (panelStyles.dim === 'w' ? w * crossFraction : w);
  const panelHeightPx = textOnly ? h : (panelStyles.dim === 'h' ? h * crossFraction : h);
  const availableTextWidth = panelWidthPx - 2 * layerPadPx;
  // Constrain text container: in stacked layouts (square/portrait) the panel
  // spans the full canvas, so let the text occupy at most 80% of that width.
  // Wide layouts already have a narrow panel — full width is fine there.
  const textWidthFraction = layout === 'wide' ? 1.0 : 0.80;
  const titleContainerWidth = textOnly
    ? w * 0.5 - padLeftRem * remPx
    : availableTextWidth * textWidthFraction;
  // Continuous text with optional explicit \n preserved as hard breaks.
  const titleText = normalizeCopyKeepingBreaks(copy);
  const subText = normalizeCopyKeepingBreaks(subcopy);
  // Lausanne sans-serif effective char width ≈ 0.58 × font-size.
  const titleCharRatio = 0.58;
  const subCharRatio = 0.55;
  const tagLineH = 1.15;
  const subLineH = 1.35;
  // The subtitle is sized *relative to the title* so the two always keep a
  // readable hierarchy — a fixed rem size made short titles tower over it.
  // The text-only website piece runs a large title, so its subtitle steps
  // down further to keep the pair from reading as two headlines.
  const subRatio  = textOnly ? 0.62 : 0.77; // title : subtitle ≈ 1.3 : 1
  const subMinPx  = 2.8 * remPx;
  const subMaxPx  = (textOnly ? 4.4 : 5.6) * remPx;
  // Gap grows with the title so the two never crowd each other.
  const gapFor    = (px) => Math.max(1.2 * remPx, px * 0.42);
  const subWidthPx = titleContainerWidth * 0.9; // .sub max-width: 90%

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

  // Height the CTA actually takes away from the text block (button + its gap).
  const hasCta = showCta && !!cta;
  const ctaBlockPx = hasCta
    ? ctaPx * (1 + 2 * ctaPadVRatio) + ctaGapRem * remPx
    : 0;
  // Campaign badge sits above the title; its height comes out of the text budget.
  const badge = campaignBadge({
    campaign: brand.campaign,
    fontFamily: brand.fontFamily,
    fontWeight: 700,
    W: titleContainerWidth,
    maxPx: Math.max(14, Math.min(remPx * (textOnly ? 3.4 : 2.8), textOnly ? 40 : 34)),
    charRatio: 0.66,
    tracking: 0.14,
    radius: 999,
  });
  // Close to the title (kicker), even if the text-block gap is larger: the
  // margin below goes negative to pull the title up.
  const badgeGapPx = badge.px * 0.9;
  const badgeBlockPx = badge.heightPx ? badge.heightPx + badgeGapPx : 0;
  const availableTextHeight = panelHeightPx - padTopPx - padBotPx - ctaBlockPx - badgeBlockPx;

  // Largest title size at which title + subtitle together still fit. Both are
  // measured with the real wrap model, so the pair is fitted as one block
  // instead of the title hogging space against a fixed reserve.
  const maxTitlePx = textOnly
    ? Math.round(remPx * 7.5)
    : layout === 'wide' ? 54 : layout === 'square' ? 68 : 64;
  const minTitlePx = 24;
  const longestTitleWord = longestWordLen(titleText);
  // The floor never overtakes the title: on very long copy the title shrinks,
  // and the subtitle has to shrink with it rather than outgrow it.
  const subSizeFor = (px) => (subText
    ? Math.min(subMaxPx, Math.max(Math.min(subMinPx, px * 0.75), px * subRatio))
    : 0);

  let titlePx = minTitlePx;
  let subPx = subSizeFor(minTitlePx);
  let blockGapPx = gapFor(minTitlePx);
  for (let px = maxTitlePx; px >= minTitlePx; px--) {
    const charsPerLine = Math.floor(titleContainerWidth / (px * titleCharRatio));
    // Refuse this size if the longest word can't fit on one line.
    if (charsPerLine < longestTitleWord) continue;
    const candSubPx = subSizeFor(px);
    const titleH = measureLines({
      text: titleText, W: titleContainerWidth, px, charRatio: titleCharRatio,
    }) * tagLineH * px;
    const subH = subText
      ? measureLines({
          text: subText, W: subWidthPx, px: candSubPx, charRatio: subCharRatio,
        }) * subLineH * candSubPx + gapFor(px)
      : 0;
    if (titleH + subH <= availableTextHeight) {
      titlePx = px;
      subPx = candSubPx;
      blockGapPx = gapFor(px);
      break;
    }
  }

  const veilCss = veil
    ? `<div class="veil"></div>`
    : '';

  // Decoration geometry: the photo is whatever the panel leaves.
  const rowAxis = panelStyles.axis === 'row';
  const imgW = rowAxis ? w - panelWidthPx : w;
  const imgH = rowAxis ? h : h - panelHeightPx;
  const panelPattern = deco.pattern && {
    ...deco.pattern,
    fade: deco.pattern.fade === 'seam' ? (rowAxis ? 'right' : 'bottom') : deco.pattern.fade,
  };
  const panelDecorHtml = decor.pattern({
    cfg: panelPattern, w: Math.round(panelWidthPx), h: Math.round(panelHeightPx), id: 'panel-pat',
  });
  const stickerPx = Math.min(imgW, imgH) * (rowAxis ? 0.42 : 0.40);
  const stickerGap = Math.min(imgW, imgH) * 0.08;
  const imageDecorHtml = textOnly ? '' : [
    decor.pattern({
      cfg: deco.seam && { ...deco.seam, from: rowAxis ? 'left' : 'top', depth: 0.32 },
      w: Math.round(imgW), h: Math.round(imgH), id: 'seam',
    }),
    decor.tape({
      cfg: deco.tape, campaign: brand.campaign, w: Math.round(imgW), h: Math.round(imgH), font: brand.fontFamily,
    }),
    // Wide: top-right of the photo. Stacked: bottom-right, away from the band.
    decor.sticker({
      cfg: stickerCfg, campaign: brand.campaign, size: stickerPx, right: stickerGap,
      ...(rowAxis ? { top: stickerGap } : { bottom: stickerGap }),
    }),
  ].join('');

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
      ${textOnly
        ? 'width: 100%; height: 100%;'
        : (panelStyles.axis === 'row' ? `width: ${panelStyles.cross};` : `height: ${panelStyles.cross};`)}
      background: ${colors.panel};
      padding: ${padTopRem}rem ${padRem}rem ${padRem}rem ${padLeftRem}rem;
      display: flex;
      flex-direction: column;
      justify-content: ${panelJustify};
      gap: ${verticalAnchor ? 0 : 1.5}rem;
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
    }
    .text-block, .cta { position: relative; z-index: 1; }
    .text-block {
      display: flex;
      flex-direction: column;
      gap: ${blockGapPx}px;
      max-width: ${textOnly ? `${Math.round(titleContainerWidth)}px` : `${textWidthFraction * 100}%`};
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
    .campaign { margin-bottom: ${badgeGapPx - blockGapPx}px; }
    .sub {
      font-size: ${subPx}px;
      font-weight: 400;
      line-height: ${subLineH};
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
    ${badge.css}
  `;

  const body = textOnly ? `
    <div class="root">
      <div class="panel">
        ${panelDecorHtml}
        <div class="text-block">
          ${badge.html}
          ${titleText ? `<h1 class="title">${copyToHtml(titleText)}</h1>` : ''}
          ${subHtml}
        </div>
        ${showCta && cta ? `<a class="cta">${escapeHtml(cta)}</a>` : ''}
      </div>
    </div>
  ` : `
    <div class="root">
      <div class="panel">
        ${panelDecorHtml}
        <div class="text-block">
          ${badge.html}
          ${titleText ? `<h1 class="title">${copyToHtml(titleText)}</h1>` : ''}
          ${subHtml}
        </div>
        ${showCta && cta ? `<a class="cta">${escapeHtml(cta)}</a>` : ''}
      </div>
      <div class="image-area">
        ${imageUrl ? `<img class="bg-image" src="${escapeHtml(imageUrl)}" alt="">` : ''}
        ${veilCss}
        ${imageDecorHtml}
      </div>
    </div>
  `;

  return htmlDocument({ w, h, bodyCss, body, baseUrl });
}

module.exports = { render };
