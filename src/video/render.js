// Orchestrates a full video render:
//   payload -> timeline -> per-slide frame capture -> segment encode
//           -> xfade concat -> audio mux -> final MP4.
// Returns { file, workDir, totalMs, format }. The caller is responsible for
// deleting workDir after streaming/reading the file.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { Renderer } = require('../renderer');
const { buildTimeline, enforceMinDuration } = require('./timeline');
const { renderSlide, brandPalette, PANEL_FRAC } = require('./slides');

// The image region (in px) where a product video is composited. Tag brands
// (Solomamparas) are full-bleed — the whole frame. Split brands use the image
// two thirds: bottom in portrait, right in landscape.
function imageRect(format, fullFrame) {
  const { w, h } = format;
  if (fullFrame) return { x: 0, y: 0, w, h };
  const portrait = h > w;
  if (portrait) {
    const py = Math.round(h * PANEL_FRAC);
    return { x: 0, y: py, w, h: h - py };
  }
  const px = Math.round(w * PANEL_FRAC);
  return { x: px, y: 0, w: w - px, h };
}
const { captureSlideFrames } = require('./capture');
const {
  framesToSegment, overlayOnVideo, concatWithTransitions, muxAudio, finalize,
} = require('./encode');

// Build a rhythmic per-boundary transition list — varied types and durations so
// the cut isn't always the same symmetric crossfade (snappier between products,
// smoother into cupones/cierre).
function buildTransitions(slides) {
  const TYPES = ['fade', 'slideleft', 'wipeup', 'slideright', 'dissolve'];
  const out = [];
  for (let i = 0; i < slides.length - 1; i++) {
    const next = slides[i + 1];
    let type, durationMs;
    if (next.type === 'cierre') { type = 'fade'; durationMs = 550; }
    else if (next.type === 'cupones') { type = 'wipeup'; durationMs = 450; }
    else if (next.type === 'producto' && slides[i].type === 'producto') { type = i % 2 ? 'slideright' : 'slideleft'; durationMs = 300; }
    else { type = TYPES[i % TYPES.length]; durationMs = i % 2 ? 350 : 500; }
    out.push({ type, durationMs });
  }
  return out;
}

async function renderVideo(payload, { baseUrl, resolvePath, tmpDir, fps = 30, onProgress } = {}) {
  if (typeof resolvePath !== 'function') throw new Error('resolvePath(url) is required');
  const { slides, transition, format } = buildTimeline(payload);

  // Transitions depend only on slide types, so build them up front and use the
  // total to guarantee the 30s minimum (extends cupones + cierre in place).
  const transitions = buildTransitions(slides);
  const transTotalMs = transitions.reduce((a, t) => a + t.durationMs, 0);
  enforceMinDuration(slides, transTotalMs);

  const workDir = path.join(tmpDir, `vid-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  fs.mkdirSync(workDir, { recursive: true });

  try {
    const renderer = new Renderer();
    await renderer.init();
    const browser = renderer.browser;

    const segments = [];
    try {
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const isVideo = slide.type === 'producto' && slide.overlayOnly && !!slide.mediaUrl;
        if (onProgress) onProgress({ stage: 'slide', index: i, total: slides.length, type: slide.type });

        const framesDir = path.join(workDir, `frames-${i}`);
        const html = renderSlide(slide, {
          format, baseUrl, capture: true, logoUrl: payload.logoUrl,
          imageMotion: payload.imageMotion, imageIndex: i,
        });
        const { pattern } = await captureSlideFrames({
          browser, html, w: format.w, h: format.h,
          durationMs: slide.durationMs, fps, outDir: framesDir, transparent: isVideo,
        });

        const segFile = path.join(workDir, `seg-${i}.mp4`);
        if (isVideo) {
          const pal = brandPalette(payload.brandId);
          await overlayOnVideo({
            videoFile: resolvePath(slide.mediaUrl), pattern, fps,
            durationMs: slide.durationMs, w: format.w, h: format.h,
            rect: imageRect(format, !!pal.tagStyle), bgColor: pal.bg, outFile: segFile,
          });
        } else {
          await framesToSegment({ pattern, fps, outFile: segFile });
        }
        segments.push({ file: segFile, durationMs: slide.durationMs });

        // Free the frame PNGs early — they are large and no longer needed.
        fs.rmSync(framesDir, { recursive: true, force: true });
      }
    } finally {
      await renderer.close();
    }

    if (onProgress) onProgress({ stage: 'concat', total: slides.length });
    const master = path.join(workDir, 'master.mp4');
    const totalMs = await concatWithTransitions({
      segments, transitionMs: transition, transitions, fps, outFile: master,
    });

    const audio = payload.audio || {};
    const loc = audio.locucionUrl ? resolvePath(audio.locucionUrl) : null;
    const mus = audio.musicaUrl ? resolvePath(audio.musicaUrl) : null;
    const finalFile = path.join(workDir, 'final.mp4');
    if (loc || mus) {
      if (onProgress) onProgress({ stage: 'audio' });
      try {
        await muxAudio({ videoFile: master, locucionFile: loc, musicaFile: mus, totalMs, outFile: finalFile });
      } catch (audioErr) {
        // A bad/silent audio track must not throw away the whole render:
        // fall back to the video with no audio instead of failing.
        console.warn('audio mux failed, exporting without audio:', audioErr.message);
        await finalize({ inFile: master, outFile: finalFile });
      }
    } else {
      await finalize({ inFile: master, outFile: finalFile });
    }

    return { file: finalFile, workDir, totalMs, format };
  } catch (err) {
    // Clean our own work dir on hard failure (the caller never sees workDir).
    fs.rmSync(workDir, { recursive: true, force: true });
    throw err;
  }
}

module.exports = { renderVideo };
