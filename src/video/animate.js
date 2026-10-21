// Animation runtime + slide document builder for the video generator.
//
// Slides are authored with declarative CSS animations, but captured
// deterministically frame-by-frame: in capture mode every animation is paused
// and its `currentTime` is set per frame via window.__seek(tMs). Because CSS
// animations use `animation-fill-mode: both`, any frame is fully reproducible.
// In preview mode (UI iframe) the same animations just play — and loop — so the
// user can eyeball the motion.

const { fontFaceCss } = require('../templates/shared');

// Smooth, non-strident easing (ease-out cubic) shared by all element animations.
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

// Keyframes + base class. Elements opt in with class "a" and an inline
// animation-name/duration/delay (see `anim()` below).
function animationCss() {
  return `
    :root { --ease: ${EASE}; }
    .a {
      animation-duration: 700ms;
      animation-timing-function: var(--ease);
      animation-fill-mode: both;
    }
    @keyframes fadeIn   { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeUp   { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
    /* Individual (tier 2) reveal: transform only, so it composes with a parent
       group's opacity fade (tier 1) without the two opacities cancelling out. */
    @keyframes riseY    { from { transform: translateY(40px); } to { transform: translateY(0); } }
    @keyframes fadeDown { from { opacity: 0; transform: translateY(-28px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn  { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
    @keyframes popIn    { 0% { opacity: 0; transform: scale(0.6) rotate(-6deg); } 70% { opacity: 1; transform: scale(1.06) rotate(0deg); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes wipeIn   { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
    @keyframes lineGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    /* Image motion presets (selectable; see slides.motionImage). */
    @keyframes zoomIn  { from { transform: scale(1.0); } to { transform: scale(1.12); } }
    @keyframes zoomOut { from { transform: scale(1.12); } to { transform: scale(1.0); } }
    @keyframes driftLR { from { transform: scale(1.06) translateX(-2.2%); } to { transform: scale(1.06) translateX(2.2%); } }
    @keyframes driftRL { from { transform: scale(1.06) translateX(2.2%); } to { transform: scale(1.06) translateX(-2.2%); } }
  `;
}

// Inline style helper for an animated element. Always includes fill-mode:both so
// the element holds its "from" state during the delay (no flash of the final
// content before the animation runs) and its "to" state after it ends.
function anim(name, { dur = 700, delay = 0 } = {}) {
  return `animation-name:${name};animation-duration:${dur}ms;animation-delay:${delay}ms;` +
    `animation-timing-function:var(--ease);animation-fill-mode:both;`;
}

// The runtime script injected into every slide document.
function runtimeScript(durationMs) {
  return `
  (function(){
    var D = ${Math.round(durationMs)};
    function anims(){ return document.getAnimations ? document.getAnimations() : []; }
    window.__duration = D;
    window.__seek = function(t){
      var list = anims();
      for (var i=0;i<list.length;i++){
        try { list[i].pause(); list[i].currentTime = Math.max(0, t); } catch(e){}
      }
    };
    // Server-side text sizing is a character-ratio *estimate*, which can be off
    // by 15%+ for a single unbreakable string (a wordmark like "SOLOMAMPARAS"
    // is far wider per character than the brand average). Once the real font is
    // loaded, shrink every [data-fit] element to the pixel budget in the
    // attribute. Runs once, before the first seek, so capture stays
    // frame-identical.
    window.__fit = function(){
      var els = document.querySelectorAll('[data-fit]');
      for (var i=0;i<els.length;i++){
        var el = els[i];
        var budget = parseFloat(el.getAttribute('data-fit'));
        // scrollWidth, not just offsetWidth: a wrapping wordmark is capped by
        // max-width, so an unbreakable name ("SOLOMAMPARAS") sits at exactly
        // the budget while its glyphs spill out of the box. scrollWidth sees
        // the real content width; for a nowrap element the two are equal.
        var width = Math.max(el.offsetWidth, el.scrollWidth);
        if (!(budget > 0) || !(width > budget)) continue;
        var fs = parseFloat(getComputedStyle(el).fontSize);
        // Text width is linear in font-size, so one pass suffices; the 0.995
        // trims the sub-pixel rounding in offsetWidth.
        el.style.fontSize = (Math.floor(fs * (budget / width) * 0.995 * 100) / 100) + 'px';
      }
      // Same idea for a whole stack that outgrows its height budget (very long
      // copy): scale it down uniformly rather than let it bleed off the canvas.
      // Only used on containers whose own animation is opacity-only, so the
      // inline transform never fights a keyframe.
      var tall = document.querySelectorAll('[data-fit-h]');
      for (var j=0;j<tall.length;j++){
        var box = tall[j];
        var maxH = parseFloat(box.getAttribute('data-fit-h'));
        var height = box.offsetHeight;
        if (!(maxH > 0) || !(height > maxH)) continue;
        box.style.transform = 'scale(' + (Math.floor((maxH / height) * 1000) / 1000) + ')';
      }
    };
    window.__ready = function(){
      var waits = [];
      if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
      var imgs = Array.prototype.slice.call(document.images || []);
      var pending = imgs.filter(function(im){ return !im.complete; });
      if (pending.length){
        waits.push(new Promise(function(res){
          var n = pending.length;
          function done(){ if(--n<=0) res(); }
          pending.forEach(function(im){ im.addEventListener('load', done); im.addEventListener('error', done); });
        }));
      }
      return Promise.all(waits).then(function(){ window.__fit(); });
    };
    if (window.__CAPTURE__){
      // Freeze at t=0 until the capturer drives __seek per frame.
      window.addEventListener('load', function(){ window.__seek(0); });
    } else {
      // Preview: drive the same deterministic seek in real time and loop.
      // (Seeking — not cancel/replay — so elements never flash their final
      // state between loops.)
      var HOLD = 1000;
      var t0 = null;
      function frame(ts){
        if (t0 === null) t0 = ts;
        var elapsed = (ts - t0) % (D + HOLD);
        window.__seek(Math.min(elapsed, D));
        requestAnimationFrame(frame);
      }
      // Preview never calls __ready, so fit here once the font is in.
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())
        .then(function(){ window.__fit(); });
      setTimeout(function(){ requestAnimationFrame(frame); }, 60);
    }
  })();
  `;
}

// Build a complete slide HTML document.
//   capture     — inject __CAPTURE__ flag (paused, deterministic seek)
//   transparent — no background fill (for overlays composited over video)
function slideDocument({ w, h, bodyCss, body, baseUrl = '', durationMs = 3000, capture = false, transparent = false }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  ${baseUrl ? `<base href="${baseUrl}">` : ''}
  <title>slide ${w}x${h}</title>
  ${capture ? '<script>window.__CAPTURE__=true;</script>' : ''}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { width: 100%; height: 100%; overflow: hidden; font-size: ${Math.min(w, h) / 100}px; }
    body {
      width: ${w}px; height: ${h}px; overflow: hidden;
      background: ${transparent ? 'transparent' : '#000'};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    img { display: block; max-width: none; }
    ${fontFaceCss()}
    ${animationCss()}
    ${bodyCss}
  </style>
</head>
<body>
  ${body}
  <script>${runtimeScript(durationMs)}</script>
</body>
</html>`;
}

module.exports = { slideDocument, anim, animationCss, runtimeScript, EASE };
