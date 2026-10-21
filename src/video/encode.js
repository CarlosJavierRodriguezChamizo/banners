// ffmpeg wrapper (uses the bundled ffmpeg-static binary; no global install).
// Handles: PNG frame sequence -> segment mp4, transparent overlay over a user
// video clip, xfade concatenation between slides, and audio mux with fades.

const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// Run ffmpeg with the given args; reject with stderr tail on non-zero exit.
function run(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
    let err = '';
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${err.slice(-2000)}`));
    });
  });
}

const sec = (ms) => (ms / 1000).toFixed(4);

// Encode a zero-padded PNG sequence into a silent H.264 segment.
async function framesToSegment({ pattern, fps, outFile }) {
  await run([
    '-framerate', String(fps),
    '-i', pattern,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    outFile,
  ]);
  return outFile;
}

// Convert '#RRGGBB' to ffmpeg's '0xRRGGBB'; fall back to black.
function ffColor(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || ''));
  return m ? `0x${m[1]}` : 'black';
}

// Composite a transparent PNG overlay sequence over a user video clip. The clip
// is full-bleed (cover — fills `rect`, cropping as needed) on a brand-color
// canvas, then the overlay graphic (panel + text) is laid on top. Trimmed to
// durationMs; a short clip freezes on its last frame.
async function overlayOnVideo({ videoFile, pattern, fps, durationMs, w, h, rect, bgColor, outFile }) {
  const d = sec(durationMs);
  const r = rect || { x: 0, y: 0, w, h };
  const bg = ffColor(bgColor);
  const filter =
    `color=c=${bg}:s=${w}x${h}:r=${fps}:d=${d}[canvas];` +
    `[0:v]scale=${r.w}:${r.h}:force_original_aspect_ratio=increase,crop=${r.w}:${r.h},fps=${fps},` +
    `tpad=stop_mode=clone:stop_duration=${d},trim=duration=${d},setpts=PTS-STARTPTS[vid];` +
    `[canvas][vid]overlay=x=${r.x}:y=${r.y}:shortest=1[base];` +
    `[1:v]fps=${fps},setpts=PTS-STARTPTS[ovl];` +
    `[base][ovl]overlay=0:0:format=auto,trim=duration=${d}[v]`;
  await run([
    '-i', videoFile,
    '-framerate', String(fps), '-i', pattern,
    '-filter_complex', filter,
    '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-an',
    outFile,
  ]);
  return outFile;
}

// Concatenate segments with an xfade between each boundary. `transitions` is an
// optional per-boundary list [{ type, durationMs }] (length segments.length-1);
// falls back to a uniform `transitionMs` crossfade. `segments` is
// [{ file, durationMs }] in order. Returns total duration (ms).
async function concatWithTransitions({ segments, transitionMs = 500, transitions, fps, outFile }) {
  if (segments.length === 1) {
    await run(['-i', segments[0].file, '-c', 'copy', outFile]);
    return segments[0].durationMs;
  }
  const boundary = (k) => {
    const t = transitions && transitions[k - 1];
    return {
      type: (t && t.type) || 'fade',
      dur: ((t && t.durationMs != null ? t.durationMs : transitionMs)) / 1000,
    };
  };

  const inputs = [];
  for (const s of segments) inputs.push('-i', s.file);

  const parts = [];
  let prevLabel = '0:v';
  let cumMs = 0;    // sum of durations of segments already merged (pre-overlap)
  let cumTrans = 0; // sum of transition durations applied so far (ms)
  for (let k = 1; k < segments.length; k++) {
    cumMs += segments[k - 1].durationMs;
    const { type, dur } = boundary(k);
    const offset = (cumMs - cumTrans) / 1000 - dur;
    cumTrans += dur * 1000;
    const out = k === segments.length - 1 ? 'vout' : `v${k}`;
    parts.push(
      `[${prevLabel}][${k}:v]xfade=transition=${type}:duration=${dur.toFixed(4)}:offset=${offset.toFixed(4)}[${out}]`
    );
    prevLabel = out;
  }
  await run([
    ...inputs,
    '-filter_complex', parts.join(';'),
    '-map', '[vout]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-r', String(fps),
    outFile,
  ]);

  const totalMs = segments.reduce((a, s) => a + s.durationMs, 0) - cumTrans;
  return totalMs;
}

// Mux optional voiceover + background music over the silent video, with fades.
// Returns outFile. If neither track is provided, remuxes the video unchanged.
async function muxAudio({ videoFile, locucionFile, musicaFile, totalMs, outFile }) {
  const total = sec(totalMs);
  if (!locucionFile && !musicaFile) {
    await run(['-i', videoFile, '-c', 'copy', outFile]);
    return outFile;
  }

  const inputs = ['-i', videoFile];
  const chains = [];
  const mixLabels = [];
  let idx = 1;

  if (locucionFile) {
    inputs.push('-i', locucionFile);
    chains.push(
      `[${idx}:a]apad,atrim=end=${total},` +
      `afade=t=in:st=0:d=0.35,afade=t=out:st=${sec(totalMs - 500)}:d=0.5[voc]`
    );
    mixLabels.push('[voc]');
    idx++;
  }
  if (musicaFile) {
    inputs.push('-i', musicaFile);
    chains.push(
      `[${idx}:a]volume=0.18,apad,atrim=end=${total},` +
      `afade=t=in:st=0:d=0.8,afade=t=out:st=${sec(totalMs - 1000)}:d=1[mus]`
    );
    mixLabels.push('[mus]');
    idx++;
  }

  let filter;
  if (mixLabels.length === 2) {
    filter = `${chains.join(';')};${mixLabels.join('')}amix=inputs=2:duration=longest:normalize=0[aout]`;
  } else {
    // single source: rename its label to [aout]
    filter = chains[0].replace(/\[(voc|mus)\]$/, '[aout]');
  }

  await run([
    ...inputs,
    '-filter_complex', filter,
    '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    '-shortest',
    outFile,
  ]);
  return outFile;
}

// Final faststart remux (when there is no audio step to add it).
async function finalize({ inFile, outFile }) {
  await run(['-i', inFile, '-c', 'copy', '-movflags', '+faststart', outFile]);
  return outFile;
}

module.exports = { framesToSegment, overlayOnVideo, concatWithTransitions, muxAudio, finalize, ffmpegPath };
