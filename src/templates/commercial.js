// "commercial" campaign layout: retail promo look (Solomamparas, Douche Elite).
//
// Full-bleed photo, big white headline where any *word* between asterisks is
// boxed in the campaign accent, the campaign label as a solid tab above it,
// and — when a product is filled in — a white price card with a round label,
// product name, struck-through old price and a huge price with superscript
// cents. The warning tape crosses the bottom-right corner; without a product
// card a price-tag sticker carries the discount instead.

const {
  layoutCategory, escapeHtml, htmlDocument,
  normalizeCopyKeepingBreaks, fitFontExact, measureLines, campaignBadge,
} = require('./shared');
const decor = require('./decor');
const { SWOOSH_PATH, SWOOSH_VIEWBOX, SWOOSH_ASPECT } = require('./tags');

// "59,99 €" / "59.99" / "59" → { int: '59', dec: '99', cur: '€' }
function parsePrice(str) {
  const s = String(str || '').trim();
  if (!s) return null;
  const m = s.match(/(\d[\d.\s]*?)(?:[,.](\d{1,2}))?\s*(€|\$|£)?\s*$/);
  if (!m) return { int: s, dec: '', cur: '' };
  return { int: m[1].replace(/\s/g, ''), dec: m[2] || '', cur: m[3] || '€' };
}

// Escape, keep \n as <br>, and turn *word* into an accent box.
function headlineHtml(text) {
  return escapeHtml(text)
    .replace(/\*([^*]+)\*/g, '<span class="hl">$1</span>')
    .replace(/\n/g, '<br>');
}

function render({ brand, copy, subcopy, cta, imageUrl, product, focal, veil, zoom, format, baseUrl }) {
  const { w, h } = format;
  const layout = layoutCategory(w, h);
  const colors = brand.colors;
  const deco = brand.decor || {};
  const focalX = Math.max(0, Math.min(100, focal?.x ?? 50));
  const focalY = Math.max(0, Math.min(100, focal?.y ?? 50));
  const zoomScale = Math.max(1, Math.min(4, Number(zoom) || 1));
  const canvasMin = Math.min(w, h);
  const remPx = canvasMin / 100;
  const small = w < 800;

  const isInstagramStory = w === 1080 && h === 1920;
  const showCta = !!cta && !isInstagramStory;
  const padPx = Math.round(remPx * (layout === 'portrait' ? 5 : 6));
  const padTopPx = isInstagramStory ? Math.round(remPx * 18) : padPx;

  const portrait = layout === 'portrait';
  const accent = colors.accent || colors.cta;
  const onAccent = colors.onAccent || '#FFFFFF';

  // --- Tape geometry (mirrors decor.tape) so the card can stay clear of it.
  const tapeReach = deco.tape ? canvasMin * (deco.tape.reach || (small ? 0.2 : 0.3)) : 0;
  const tapeThick = deco.tape ? canvasMin * (deco.tape.thick || 0.085) : 0;
  const tapeClearPx = deco.tape ? tapeReach + tapeThick * 1.6 : padPx;

  // --- Product card ------------------------------------------------------------
  const price = parsePrice(product?.price);
  const hasCard = !!(price || product?.name);
  let cardHtml = '';
  let cardCss = '';
  let cardW = 0;
  if (hasCard) {
    const name = String(product.name || '').trim();
    const desc = String(product.desc || '').trim();
    const old = String(product.oldPrice || '').trim();

    // Size the card from a unit u; shrink u until the card fits the free
    // height between its top edge and the tape. Portrait formats stack it
    // under the headline (which then gets the full width) instead of beside.
    cardW = portrait
      ? Math.min(w * 0.5, canvasMin * 0.62)
      : Math.min(w * (small ? 0.38 : 0.3), canvasMin * 0.62);
    const cardMinTop = portrait ? h * 0.5 : padTopPx;
    const availFor = (uu) => h - cardMinTop - tapeClearPx - roundFor(uu) * 0.5;
    // The price is the widest line: cap u so "239,40€" always fits inside.
    const priceEm = price ? price.int.length * 0.66 * 3.1 + (price.dec.length + 2) * 0.66 * 1.2 : 0;
    let u = Math.min(cardW / 9, price ? cardW / (1.6 + priceEm) : Infinity);
    // Round label straddling the card's top edge: half of it sits above the
    // card, so that half comes out of the free height too.
    const hasRound = !!brand.campaign?.discount;
    const roundFor = (uu) => (hasRound ? uu * 3.4 : 0);
    const lines = (txt, px, ratio) => (txt ? measureLines({ text: txt, W: cardW - u * 1.6, px, charRatio: ratio }) : 0);
    const cardHeight = (uu) => {
      const namePx = uu * 0.95, descPx = uu * 0.72, pricePx = uu * 3.1, oldPx = uu * 0.8;
      return uu * 0.8 * 2                                       // padding
        + roundFor(uu) * 0.5                                    // room under the label
        + (name ? lines(name.toUpperCase(), namePx, 0.66) * namePx * 1.1 + uu * 0.2 : 0)
        + (desc ? lines(desc, descPx, 0.55) * descPx * 1.3 : 0)
        + (old ? oldPx * 1.4 : 0)
        + (price ? pricePx * 1.0 : 0);
    };
    while (u > 6 && cardHeight(u) > availFor(u)) u *= 0.92;
    const cardH = cardHeight(u);
    const roundPx = roundFor(u);
    const cardTop = cardMinTop + roundPx * 0.5
      + Math.max(0, (availFor(u) - cardH) * (portrait ? 0.3 : 0.55));
    const roundHtml = decor.sticker({
      cfg: { ...(deco.round || { shape: 'circle', ring: false }), bg: accent, fg: onAccent, font: brand.fontFamily, rotate: -8 },
      campaign: brand.campaign, size: roundPx, right: u * 0.6, top: -roundPx * 0.5,
    });

    const priceHtml = price
      ? `<div class="price"><span class="p-int">${escapeHtml(price.int)}</span>${price.dec ? `<span class="p-dec">,${escapeHtml(price.dec)}${escapeHtml(price.cur)}</span>` : `<span class="p-dec">${escapeHtml(price.cur)}</span>`}</div>`
      : '';
    cardHtml = `<div class="card">
        ${roundHtml}
        ${name ? `<div class="p-name">${escapeHtml(name)}</div>` : ''}
        ${desc ? `<div class="p-desc">${escapeHtml(desc)}</div>` : ''}
        ${old ? `<div class="p-old">${escapeHtml(old)}</div>` : ''}
        ${priceHtml}
      </div>`;
    cardCss = `
      .card {
        position: absolute;
        right: ${padPx}px; top: ${Math.round(cardTop)}px;
        width: ${Math.round(cardW)}px;
        padding: ${u * 0.8}px;
        background: #FFFFFF;
        color: #111111;
        z-index: 5;
        box-shadow: 0 ${u * 0.25}px ${u * 1.2}px rgba(0,0,0,0.22);
        display: flex; flex-direction: column; align-items: flex-start;
      }
      .card > :nth-child(2) { margin-top: ${roundPx * 0.5}px; }
      .p-name { font-weight: 800; font-size: ${u * 0.95}px; line-height: 1.1; text-transform: uppercase; margin-bottom: ${u * 0.2}px; }
      .p-desc { font-weight: 400; font-size: ${u * 0.72}px; line-height: 1.3; color: #333333; }
      .p-old { font-weight: 500; font-size: ${u * 0.8}px; color: #8A8A8A; text-decoration: line-through; margin-top: ${u * 0.4}px; }
      .price { display: flex; align-items: flex-start; font-weight: 800; line-height: 0.9; letter-spacing: -0.03em; margin-top: ${u * 0.15}px; }
      .p-int { font-size: ${u * 3.1}px; }
      .p-dec { font-size: ${u * 1.2}px; margin-top: ${u * 0.25}px; margin-left: ${u * 0.05}px; }
    `;
  }

  // --- Headline ------------------------------------------------------------------
  const titleRaw = normalizeCopyKeepingBreaks(copy);
  const titlePlain = titleRaw.replace(/\*/g, '');
  const colW = hasCard && !portrait ? w - cardW - padPx * 3 : w * (portrait ? 0.84 : small ? 0.62 : 0.6);
  const badge = campaignBadge({
    campaign: brand.campaign, fontFamily: brand.fontFamily, fontWeight: 800,
    W: colW, maxPx: Math.max(16, Math.min(remPx * 3.4, 44)), charRatio: 0.66, tracking: 0.06,
  });
  const badgeGapPx = Math.round(badge.px * 0.7);

  const ctaHeightPx = Math.max(52, Math.min(110, canvasMin * 0.11));
  const reservedCta = showCta ? ctaHeightPx + padPx * 0.6 : 0;
  const subText = normalizeCopyKeepingBreaks(subcopy);
  const subPx = subText ? Math.max(16, Math.min(remPx * 3.9, 44)) : 0;
  // On horizontal formats the subtitle keeps a readable line length instead of
  // running the whole headline column.
  const subW = layout === 'wide' ? Math.min(colW, w * 0.36) : colW;
  const reservedSub = subText
    ? measureLines({ text: subText, W: subW, px: subPx, charRatio: 0.56 }) * subPx * 1.3 + subPx * 0.6
    : 0;
  const titleH = Math.min(
    h - padTopPx - padPx - reservedCta - badge.heightPx - badgeGapPx - reservedSub,
    h * (layout === 'wide' ? 0.42 : portrait && hasCard ? 0.24 : 0.32),
  );
  const titleLineH = 1.06;
  const titlePx = fitFontExact({
    text: titlePlain, W: colW, H: Math.max(30, titleH), charRatio: 0.68,
    lineHeight: titleLineH, maxPx: Math.round(Math.min(remPx * 8, 96)), minPx: 18,
  });

  // --- CTA (brand button with the swoosh) -------------------------------------------
  const ctaTextPx = Math.round(ctaHeightPx * 0.42);
  const swooshH = Math.round(ctaHeightPx * 0.95);
  const ctaHtml = showCta
    ? `<a class="cta"><span class="cta-text">${escapeHtml(cta)}</span>
        <svg class="cta-swoosh" viewBox="${SWOOSH_VIEWBOX}" aria-hidden="true"><path d="${SWOOSH_PATH}" fill="${colors.ctaText}"/></svg></a>`
    : '';

  // Sticker only when there's no card — the card already shows the discount.
  const stickerPx = Math.min(w * 0.36 - padPx * 1.3, canvasMin * (small ? 0.26 : 0.32));
  const stickerHtml = hasCard ? '' : decor.sticker({
    cfg: deco.sticker && { ...deco.sticker, font: deco.sticker.font || brand.fontFamily },
    campaign: brand.campaign, size: stickerPx, right: padPx * (small ? 0.6 : 1), top: padTopPx,
  });

  const bodyCss = `
    .root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #2a2a2a; font-family: ${brand.fontFamily}; }
    .bg-image {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
      object-position: ${focalX}% ${focalY}%;
      transform: scale(${zoomScale}); transform-origin: ${focalX}% ${focalY}%;
    }
    /* Left-weighted shade: white type reads on bright bathroom photos while
       the product side of the frame stays clean. */
    .scrim {
      position: absolute; inset: 0;
      background:
        linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.32) 38%, rgba(0,0,0,0) 66%),
        linear-gradient(0deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%);
    }
    .veil { position: absolute; inset: 0; background: rgba(0,0,0,0.18); }
    .layer {
      position: absolute; inset: 0; z-index: 4;
      padding: ${padTopPx}px ${padPx}px ${padPx}px;
      display: flex; flex-direction: column; justify-content: space-between;
    }
    .head { display: flex; flex-direction: column; max-width: ${Math.round(colW)}px; }
    .campaign { margin-bottom: ${badgeGapPx}px; }
    .title {
      font-size: ${titlePx}px; font-weight: 800; line-height: ${titleLineH};
      letter-spacing: -0.015em; color: #FFFFFF;
      text-transform: ${brand.titleCase ?? 'uppercase'};
      text-shadow: 0 ${remPx * 0.2}px ${remPx * 1.2}px rgba(0,0,0,0.25);
    }
    .hl {
      background: ${accent}; color: ${onAccent};
      padding: 0 0.12em; text-shadow: none;
      box-decoration-break: clone; -webkit-box-decoration-break: clone;
    }
    .sub { margin-top: ${subPx * 0.6}px; max-width: ${Math.round(subW)}px; font-size: ${subPx}px; font-weight: 600; line-height: 1.3; color: #FFFFFF; text-shadow: 0 1px 3px rgba(0,0,0,0.35); }
    .cta {
      align-self: flex-start; display: inline-flex; align-items: center;
      background: ${colors.cta}; color: ${colors.ctaText};
      height: ${ctaHeightPx}px; border-radius: ${Math.max(3, ctaHeightPx * 0.05)}px; overflow: hidden;
      padding: 0 ${Math.round(ctaHeightPx * 0.3)}px 0 ${Math.round(ctaHeightPx * 0.45)}px;
      gap: ${Math.round(ctaHeightPx * 0.2)}px;
    }
    .cta-text { font-size: ${ctaTextPx}px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; white-space: nowrap; }
    .cta-swoosh { width: ${Math.round(swooshH * SWOOSH_ASPECT)}px; height: ${swooshH}px; flex-shrink: 0; }
    ${badge.css}
    ${cardCss}
  `;

  const body = `
    <div class="root">
      ${imageUrl ? `<img class="bg-image" src="${escapeHtml(imageUrl)}" alt="">` : ''}
      <div class="scrim"></div>
      ${veil ? '<div class="veil"></div>' : ''}
      ${decor.tape({ cfg: deco.tape && { reach: small ? 0.2 : 0.3, ...deco.tape }, campaign: brand.campaign, w, h, font: brand.fontFamily })}
      ${stickerHtml}
      ${cardHtml}
      <div class="layer">
        <div class="head">
          ${badge.html}
          ${titleRaw ? `<h1 class="title">${headlineHtml(titleRaw)}</h1>` : ''}
          ${subText ? `<p class="sub">${escapeHtml(subText)}</p>` : ''}
        </div>
        ${ctaHtml}
      </div>
    </div>
  `;
  return htmlDocument({ w, h, bodyCss, body, baseUrl });
}

module.exports = { render };
