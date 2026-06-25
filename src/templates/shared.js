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
  longestWordLen,
  htmlDocument,
};
