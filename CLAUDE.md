# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — installs deps; Puppeteer downloads its own Chromium and `ffmpeg-static` bundles an ffmpeg binary (no global ffmpeg needed).
- `npm start` (alias `npm run dev`) — runs the server with `node --watch` on port 3000 (`PORT` env overrides). Open http://localhost:3000.
- No test runner or linter is configured.

There is **no build step** — templates emit HTML strings that Puppeteer renders directly.

### Verifying render changes

Rendering is visual, so verify by producing output and inspecting it, not by unit tests. The established pattern (used throughout development): start the server, call the pipeline from a throwaway Node script or hit the HTTP endpoints with `curl`, then read the resulting JPG/PNG/MP4 (extract video frames with the `ffmpeg-static` binary — `require('ffmpeg-static')` returns its path). Note: `ffmpeg-static` ships ffmpeg only, **not ffprobe** — inspect streams with `ffmpeg -i <file>`.

## Architecture

Two subsystems share one Express server (`src/server.js`) and one Puppeteer wrapper (`src/renderer.js`):

1. **Static banner generator** — HTML → Puppeteer screenshot → JPG, zipped. Endpoints: `/api/catalog`, `/api/upload`, `/api/preview-html`, `/api/generate`.
2. **Video generator** (`src/video/`) — animated HTML slides → deterministic frame capture → ffmpeg → MP4. Endpoints: `/api/video/preview`, `/api/video/generate`. Frontend at `public/video.html` + `public/video.js`.

Both render inside the server process, and slide/banner HTML references images via `baseUrl: http://localhost:PORT/`, so **Puppeteer fetches `/uploads` and `/fonts` from the running server** — the server must be up during any render (including scripted ones).

### Brand + template system (banners)

`src/brands.js` is the single source of brand config. Each brand's `style` key (`panel` | `tags` | `editorial` | `fashion`) selects a template family in `src/templates/` (`panel.js`, `tags.js`, `editorial.js`, `fashion.js`), dispatched by `src/templates/index.js` → `renderBanner()`. Colors/fonts/weights live in the brand config; templates read them. Adding a brand = add an entry to `BRANDS` with an existing `style`.

`src/templates/shared.js` holds cross-template helpers: `layoutCategory(w,h)` (wide/square/portrait by aspect ratio), `fitFontExact(...)` (iterative font-size-to-fit that respects `\n` and word-wrap), `htmlDocument(...)` (full-doc wrapper with reset), and `fontFaceCss()` (`@font-face` block — edit this when adding font weights under `fonts/`).

### Campaigns (Genérica / Black Friday / Cyber Monday)

`src/campaigns.js` defines the campaigns; `renderBanner()` calls `applyCampaign(brand, campaign, discount)` to merge the brand's own `campaigns.<id>` block (in `src/brands.js`: `colors` overrides + `badge` look) before templating. Templates read `brand.campaign` and draw the label via `campaignBadge()` in `shared.js` (filled `bg`, outlined `border`, or hairline `rule` style; `badge.overlay` overrides it for photo-overlay layouts), reserving its height before fitting the title. The optional discount text is appended to the label ("Black Friday · Hasta -40%"). ZIP names get a `-black-friday`/`-cyber-monday` suffix.

Campaign artwork is generated SVG from `src/templates/decor.js`: `sticker()` (shapes `circle`/`burst`/`scallop`/`pixel`/`tag`, optional `textPath` ring, discount parsed from the discount text), `tape()` (diagonal band across the bottom-right corner), `pattern()` (`stripes`/`dots`/`pixels`/`waves`/`arches`, optional fade mask) and `frame()`. Each brand picks pieces and colors in `campaigns.<id>.decor`; each template places them only in copy-free areas (photo side, free column, top-right corner) and shrinks or drops stickers when the space is too tight.

### Formats

`src/formats.js`: global social formats (`FORMATS`, same for all brands) plus per-brand website sizes (`CUSTOM_FORMATS`). `allFormats(brandId)` merges them; each format carries a `part` field (`full` | `text` | `image`). `part` splits one canvas into separate deliverables — e.g. Decorabaño's 1600×1145 renders once as text-only panel and once as image-only. The `panel` template branches on `part`; the ZIP filename gets a `-text`/`-image` suffix to avoid collisions. The frontend (`public/app.js`) rebuilds its grid per brand from `formatsByBrand`.

### Video pipeline (`src/video/`)

Segment-based: each slide becomes one MP4 segment, segments are concatenated with `xfade` crossfades, then audio is muxed. Module roles:

- `timeline.js` — payload → ordered slide list with durations; resolves `short` (1080×1920) / `youtube` (1920×1080); auto-drops the optional cupones slide when empty.
- `slides.js` — HTML per slide type (`portada`, `producto`, `cupones`, `cierre`), layout-aware (vertical vs horizontal). `brandPalette(brandId)` **normalizes** each brand's bespoke color keys into one vocabulary (`bg`/`fg`/`accent`/…) so all four brand styles theme consistently. Photo slides use a fixed dark scrim (white text always readable); solid slides (cupones/cierre) use the brand bg color. A brand may add an optional **`video` block** in `src/brands.js` (`bg`, `accent`, `accentMass`/`onAccentMass` for large filled areas, `pattern`, `ctaSans`, `couponStyle`) to override the video look without touching the banner config; Todo Muebles uses it for its green frames, CSS-drawn line pattern (`patternBg`) and `ledger` coupon layout.
- `animate.js` — the deterministic-animation core. Slides author declarative CSS/WAAPI animations with `animation-fill-mode: both`; in **capture mode** an injected `window.__seek(t)` pauses every animation and sets its `currentTime` per frame, making any frame reproducible. In **preview mode** (UI iframe) the same animations just play and loop.
- `capture.js` — Puppeteer: waits for fonts/images, then screenshots one PNG per frame at 30fps (`omitBackground` for transparent overlays).
- `encode.js` — wraps the `ffmpeg-static` binary via `child_process` (no fluent-ffmpeg): PNG sequence → segment, transparent overlay composited over a user video clip, `xfade` concat, and audio mux (voiceover `afade` in/out + music at low volume with fades).
- `render.js` — orchestrator. Cleans its own temp `workDir` on failure; a bad/silent audio track degrades to no-audio instead of failing the whole render.

Key detail: a **product slide with photo media** renders the image as its own background (Ken Burns); a **product slide with video media** renders as a *transparent overlay only* (`overlayOnly`/`transparent`) which ffmpeg then composites over the user's clip. Typography uses `min(w,h)/100` as the rem base, identical for both formats since both share a 1080 min dimension.

### Assets

Only `nuria-cobo` has a logo asset (`public/logo-nuria-cobo.svg`, recolored via `currentColor` in `src/logo.js`). Other brands fall back to a typographic wordmark; the video generator also accepts an optional per-video logo upload.
