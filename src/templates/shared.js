// Helpers shared across all brand templates.

function layoutCategory(w, h) {
  const ratio = w / h;
  if (ratio >= 1.5) return 'wide';        // 1200x628, 1640x856, 1500x500, 1024x512, 800x450
  if (ratio >= 0.9 && ratio < 1.5) return 'square'; // 1200x1200, 1080x1080
  return 'portrait';                       // 960x1200, 1080x1920, 1080x1350, 1000x1500
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Convert newlines to <br>; preserve other text safely.
function copyToHtml(str) {
  return escapeHtml(str).replace(/\r?\n/g, '<br>');
}

// Splits copy by newlines for tag-style rendering where each line is its own tag.
function copyToLines(str) {
  if (!str) return [];
  return String(str).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

// Normalize copy as a single continuous string — collapses any whitespace
// (including Enter-newlines from the textarea) into single spaces. Line breaks
// in the rendered banner happen based on container width, not on user input.
function normalizeCopy(str) {
  return String(str ?? '').replace(/\s+/g, ' ').trim();
}

// Same as normalizeCopy but preserves the user's explicit \n as hard breaks.
// Intra-line spaces are collapsed; empty lines are removed.
function normalizeCopyKeepingBreaks(str) {
  return String(str ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

// Compute the font-size that fits a piece of text inside an area W × H,
// allowing natural word wrap. Returns the size in px.
//   textLen    — total character count of the text
//   W, H       — container width and height in px (text area, excluding padding)
//   charRatio  — average char width / font-size (e.g. 0.55 for sans-serif)
//   lineHeight — relative line-height factor (e.g. 1.1)
// Apply a 0.9 safety factor so the `ceil()` on actual line count doesn't push
// the layout past the bottom edge.
function fitFontByArea({ textLen, W, H, charRatio, lineHeight }) {
  if (!textLen || W <= 0 || H <= 0) return 0;
  const raw = Math.sqrt((W * H) / (textLen * charRatio * lineHeight));
  return raw * 0.92;
}

// Returns the length of the longest word in a string (used to cap font size
// so the longest word never has to break mid-letter).
function longestWordLen(str) {
  if (!str) return 1;
  return String(str).split(/\s+/).reduce((m, w) => Math.max(m, w.length), 1);
}

// Find the largest font-size (px) at which the text — wrapped naturally at
// word boundaries — fits inside the W × H container. Iterates from maxPx
// down to minPx and accounts for ceil() rounding of the line count, which
// the closed-form area formula misses.
//
// Honors explicit \n in `text` as hard line breaks (each \n always starts a
// new visual line) while still auto-wrapping each segment that overflows W.
function fitFontExact({ text, W, H, charRatio, lineHeight, maxPx = 200, minPx = 14 }) {
  if (!text || W <= 0 || H <= 0) return minPx;
  const segments = String(text).split('\n').filter((s) => s.length > 0);
  if (segments.length === 0) return minPx;
  const longestWord = Math.max(
    1,
    ...segments.map((seg) => longestWordLen(seg)),
  );
  for (let px = maxPx; px >= minPx; px--) {
    const charsPerLine = Math.floor(W / (px * charRatio));
    // Refuse this font size if it can't even fit the longest word on one line.
    if (charsPerLine < longestWord) continue;
    // For each user-provided segment, count how many visual lines it takes
    // after word wrap. Small 1.05 safety factor for word-boundary inefficiency.
    let totalLines = 0;
    for (const seg of segments) {
      totalLines += Math.max(1, Math.ceil((seg.length * 1.05) / charsPerLine));
    }
    const textHeight = totalLines * lineHeight * px;
    if (textHeight <= H) return px;
  }
  return minPx;
}

// Count how many visual lines `text` occupies at a given font size, using the
// same wrap model as fitFontExact (honors \n, 1.05 word-boundary slack). Lets a
// caller reserve the exact height a wrapped block will take before laying out.
function measureLines({ text, W, px, charRatio }) {
  if (!text || W <= 0 || px <= 0) return 0;
  const segments = String(text).split('\n').filter((s) => s.length > 0);
  const charsPerLine = Math.max(1, Math.floor(W / (px * charRatio)));
  let lines = 0;
  for (const seg of segments) {
    lines += Math.max(1, Math.ceil((seg.length * 1.05) / charsPerLine));
  }
  return lines;
}

// Campaign badge ("BLACK FRIDAY · HASTA -40%") drawn above the title. The look
// comes from the brand's campaign config (src/brands.js → campaigns.<id>.badge):
//   bg     → filled box        border → outlined box
//   rule   → bare tracked label flanked by hairlines (one side when left-aligned)
// The font size is fitted so the label never overflows `W`. Returns the markup,
// its CSS, and the height it takes so templates can reserve it before fitting
// the title. Empty strings / 0 when there's no active campaign.
function campaignBadge({
  campaign, fontFamily, fontWeight = 700, W, maxPx, minPx = 11,
  charRatio = 0.62, tracking = 0.14, align = 'start', radius = 0,
}) {
  if (!campaign?.text) return { html: '', css: '', heightPx: 0, px: 0 };
  if (campaign.line) return lineBadge({ campaign, fontFamily, fontWeight, W, maxPx, minPx });
  const text = String(campaign.text).toUpperCase();
  const boxed = !!(campaign.bg || campaign.border);
  const padVEm = boxed ? 0.55 : 0;
  const padHEm = boxed ? 0.9 : 0;
  const rules = campaign.rule ? (align === 'center' ? 2 : 1) : 0;
  const ruleEm = 1.8;   // hairline length
  const ruleGapEm = 0.8;
  const emPerPx = text.length * (charRatio + tracking) + 2 * padHEm
    + rules * (ruleEm + ruleGapEm);
  const px = Math.round(Math.max(minPx, Math.min(maxPx, W / emPerPx)));
  const borderPx = campaign.border ? Math.max(1, Math.round(px * 0.08)) : 0;
  const heightPx = px * (1 + 2 * padVEm) + 2 * borderPx;
  const rule = '<span class="campaign-rule"></span>';

  const css = `
    .campaign {
      display: inline-flex;
      align-items: center;
      gap: ${ruleGapEm}em;
      align-self: ${align === 'center' ? 'center' : 'flex-start'};
      font-family: ${fontFamily};
      font-size: ${px}px;
      font-weight: ${fontWeight};
      line-height: 1;
      letter-spacing: ${tracking}em;
      text-transform: uppercase;
      white-space: nowrap;
      color: ${campaign.fg || 'currentColor'};
      background: ${campaign.bg || 'transparent'};
      border: ${borderPx ? `${borderPx}px solid ${campaign.border}` : '0'};
      border-radius: ${typeof radius === 'number' ? `${radius}px` : radius};
      padding: ${padVEm}em ${padHEm}em;
      flex-shrink: 0;
    }
    /* Trailing letter-spacing would push the label off-centre. */
    .campaign-text { margin-right: -${tracking}em; }
    .campaign-rule {
      width: ${ruleEm}em;
      height: ${Math.max(1, Math.round(px * 0.07))}px;
      background: currentColor;
    }
  `;
  const html = `<div class="campaign">${rules === 2 ? rule : ''}<span class="campaign-text">${escapeHtml(text)}</span>${rules ? rule : ''}</div>`;
  return { html, css, heightPx, px };
}

// Editorial header lockup: "Black Friday ———————— Hasta −40%". Sentence case,
// the hairline stretches to fill the column so the label reads as a section
// header rather than a sticker. `extraFg` colors the discount.
function lineBadge({ campaign, fontFamily, fontWeight, W, maxPx, minPx }) {
  const label = String(campaign.label || '');
  const extra = String(campaign.discount || '').replace(/-(?=\d)/, '−');
  const chars = label.length + extra.length;
  const px = Math.round(Math.max(minPx, Math.min(maxPx, W / (chars * 0.56 + 4))));
  const css = `
    .campaign {
      display: flex;
      align-items: center;
      gap: 0.6em;
      align-self: stretch;
      font-family: ${fontFamily};
      font-size: ${px}px;
      font-weight: ${fontWeight};
      line-height: 1.2;
      letter-spacing: 0.005em;
      white-space: nowrap;
      color: ${campaign.fg || 'currentColor'};
      flex-shrink: 0;
    }
    .campaign-fill {
      flex: 1 1 auto;
      min-width: 1.5em;
      height: ${Math.max(1, Math.round(px * 0.06))}px;
      background: currentColor;
      opacity: 0.55;
    }
    .campaign-extra { color: ${campaign.extraFg || campaign.fg || 'currentColor'}; }
  `;
  // `fill: false` drops the hairline; label and discount then sit at the two
  // ends of the column.
  const fill = campaign.fill === false ? '' : '<span class="campaign-fill"></span>';
  const html = `<div class="campaign"${fill ? '' : ' style="justify-content:space-between"'}>${label ? `<span>${escapeHtml(label)}</span>` : ''}${label && extra ? fill : ''}${extra ? `<span class="campaign-extra">${escapeHtml(extra)}</span>` : ''}</div>`;
  return { html, css, heightPx: px * 1.2, px };
}

// Build the @font-face block. Filenames match exactly what's in /fonts/<family>/.
function fontFaceCss() {
  return `
    /* Lausanne — Decorabaño & Decora Salle de Bain */
    @font-face { font-family: 'Lausanne'; src: url('/fonts/lausanne/Lausanne-300.ttf') format('truetype'); font-weight: 300; font-style: normal; font-display: block; }
    @font-face { font-family: 'Lausanne'; src: url('/fonts/lausanne/Lausanne-300Italic.ttf') format('truetype'); font-weight: 300; font-style: italic; font-display: block; }
    @font-face { font-family: 'Lausanne'; src: url('/fonts/lausanne/Lausanne-400.ttf') format('truetype'); font-weight: 400; font-style: normal; font-display: block; }
    @font-face { font-family: 'Lausanne'; src: url('/fonts/lausanne/Lausanne-400Italic.ttf') format('truetype'); font-weight: 400; font-style: italic; font-display: block; }
    @font-face { font-family: 'Lausanne'; src: url('/fonts/lausanne/Lausanne-500.ttf') format('truetype'); font-weight: 500; font-style: normal; font-display: block; }
    @font-face { font-family: 'Lausanne'; src: url('/fonts/lausanne/Lausanne-500Italic.ttf') format('truetype'); font-weight: 500; font-style: italic; font-display: block; }
    @font-face { font-family: 'Lausanne'; src: url('/fonts/lausanne/Lausanne-600Italic.ttf') format('truetype'); font-weight: 600; font-style: italic; font-display: block; }
    @font-face { font-family: 'Lausanne'; src: url('/fonts/lausanne/Lausanne-700.ttf') format('truetype'); font-weight: 700; font-style: normal; font-display: block; }
    @font-face { font-family: 'Lausanne'; src: url('/fonts/lausanne/Lausanne-800.ttf') format('truetype'); font-weight: 800; font-style: normal; font-display: block; }

    /* Sora — Solomamparas & Douche Elite */
    @font-face { font-family: 'Sora'; src: url('/fonts/sora/Sora-Thin.ttf') format('truetype'); font-weight: 100; font-display: block; }
    @font-face { font-family: 'Sora'; src: url('/fonts/sora/Sora-ExtraLight.ttf') format('truetype'); font-weight: 200; font-display: block; }
    @font-face { font-family: 'Sora'; src: url('/fonts/sora/Sora-Light.ttf') format('truetype'); font-weight: 300; font-display: block; }
    @font-face { font-family: 'Sora'; src: url('/fonts/sora/Sora-Regular.ttf') format('truetype'); font-weight: 400; font-display: block; }
    @font-face { font-family: 'Sora'; src: url('/fonts/sora/Sora-Medium.ttf') format('truetype'); font-weight: 500; font-display: block; }
    @font-face { font-family: 'Sora'; src: url('/fonts/sora/Sora-SemiBold.ttf') format('truetype'); font-weight: 600; font-display: block; }
    @font-face { font-family: 'Sora'; src: url('/fonts/sora/Sora-Bold.ttf') format('truetype'); font-weight: 700; font-display: block; }
    @font-face { font-family: 'Sora'; src: url('/fonts/sora/Sora-ExtraBold.ttf') format('truetype'); font-weight: 800; font-display: block; }

    /* Ogg — Todo Muebles de Baño (titles) */
    @font-face { font-family: 'Ogg'; src: url('/fonts/ogg/Ogg-Roman.ttf') format('truetype'); font-weight: 400; font-style: normal; font-display: block; }
    @font-face { font-family: 'Ogg'; src: url('/fonts/ogg/Ogg-Italic.ttf') format('truetype'); font-weight: 400; font-style: italic; font-display: block; }

    /* Suisse Intl — Todo Muebles de Baño (body) */
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-Thin.ttf') format('truetype'); font-weight: 100; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-ThinItalic.ttf') format('truetype'); font-weight: 100; font-style: italic; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-LightItalic.ttf') format('truetype'); font-weight: 300; font-style: italic; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-Book.ttf') format('truetype'); font-weight: 350; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-BookItalic.ttf') format('truetype'); font-weight: 350; font-style: italic; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-Regular.ttf') format('truetype'); font-weight: 400; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-RegularItalic.ttf') format('truetype'); font-weight: 400; font-style: italic; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-MediumItalic.ttf') format('truetype'); font-weight: 500; font-style: italic; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-SemiBold.ttf') format('truetype'); font-weight: 600; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-SemiBoldItalic.ttf') format('truetype'); font-weight: 600; font-style: italic; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-Bold.ttf') format('truetype'); font-weight: 700; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-BoldItalic.ttf') format('truetype'); font-weight: 700; font-style: italic; font-display: block; }
    @font-face { font-family: 'Suisse Intl'; src: url('/fonts/suisse-intl/SuisseIntl-BlackItalic.ttf') format('truetype'); font-weight: 900; font-style: italic; font-display: block; }
  `;
}

// Wrap the body content in a complete HTML document with reset + font-face.
function htmlDocument({ w, h, bodyCss, body, baseUrl = '' }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  ${baseUrl ? `<base href="${baseUrl}">` : ''}
  <title>banner ${w}x${h}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html {
      width: 100%; height: 100%; overflow: hidden;
      font-size: ${Math.min(w, h) / 100}px;
    }
    body {
      width: ${w}px;
      height: ${h}px;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    img { display: block; max-width: none; }
    ${fontFaceCss()}
    ${bodyCss}
  </style>
</head>
<body>${body}</body>
</html>`;
}

module.exports = {
  layoutCategory,
  escapeHtml,
  copyToHtml,
  copyToLines,
  normalizeCopy,
  normalizeCopyKeepingBreaks,
  fitFontByArea,
  fitFontExact,
  measureLines,
  longestWordLen,
  campaignBadge,
  fontFaceCss,
  htmlDocument,
};
