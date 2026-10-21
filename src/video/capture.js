// Deterministic frame capture. Loads a slide document, waits for fonts/images,
// then for each frame sets window.__seek(t) and screenshots a PNG. Frames are
// written to disk as zero-padded PNGs (frame-000001.png ...) for ffmpeg.

const fs = require('fs');
const path = require('path');

function pad(n, width = 6) {
  return String(n).padStart(width, '0');
}

// Capture `html` into `outDir` at the given size. Returns { frames, fps, pattern }.
async function captureSlideFrames({ browser, html, w, h, durationMs, fps = 30, outDir, transparent = false }) {
  fs.mkdirSync(outDir, { recursive: true });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45000 });
    await page.evaluate(() => (window.__ready ? window.__ready() : Promise.resolve()));

    const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));
    for (let i = 0; i < totalFrames; i++) {
      const t = (i / fps) * 1000;
      await page.evaluate((ms) => window.__seek(ms), t);
      await page.screenshot({
        path: path.join(outDir, `frame-${pad(i + 1)}.png`),
        type: 'png',
        omitBackground: transparent,
        clip: { x: 0, y: 0, width: w, height: h },
      });
    }
    return { frames: totalFrames, fps, pattern: path.join(outDir, 'frame-%06d.png') };
  } finally {
    await page.close();
  }
}

module.exports = { captureSlideFrames };
