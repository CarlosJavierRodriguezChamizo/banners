const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const express = require('express');
const multer = require('multer');
const archiver = require('archiver');

const { BRANDS } = require('./brands');
const { CAMPAIGNS } = require('./campaigns');
const { FORMATS, allFormats } = require('./formats');
const { renderBanner } = require('./templates');
const { Renderer } = require('./renderer');
const { renderVideo } = require('./video/render');
const { renderSlide } = require('./video/slides');
const { resolveFormat, DEFAULTS: VIDEO_DEFAULTS } = require('./video/timeline');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT, 'uploads');
const PUBLIC_DIR = path.join(ROOT, 'public');
const FONTS_DIR = path.join(ROOT, 'fonts');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '10mb' }));

// Static assets. Puppeteer loads slide/banner HTML through `page.setContent`,
// which leaves the document on an opaque origin — without these CORS headers
// Chromium blocks the @font-face fetches and every render silently falls back
// to Helvetica instead of the brand font.
const allowCors = (_req, res, next) => { res.setHeader('Access-Control-Allow-Origin', '*'); next(); };
app.use('/uploads', allowCors, express.static(UPLOADS_DIR));
app.use('/fonts', allowCors, express.static(FONTS_DIR));
app.use('/', express.static(PUBLIC_DIR));

// File upload (image used by all banners)
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      const id = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname || '.jpg').toLowerCase() || '.jpg';
      cb(null, `${id}${ext}`);
    },
  }),
  // Larger cap: product clips and audio tracks for the video generator.
  limits: { fileSize: 200 * 1024 * 1024 },
});

// Map an /uploads/... URL to a safe absolute path (for ffmpeg inputs).
function resolveUploadPath(url) {
  const clean = String(url || '').replace(/^\/+/, '');
  if (!clean.startsWith('uploads/')) throw new Error(`invalid asset url: ${url}`);
  const p = path.join(ROOT, clean);
  if (!p.startsWith(UPLOADS_DIR)) throw new Error('path escape');
  return p;
}

// "-black-friday" / "-cyber-monday" for ZIP names; nothing for the generic one.
function campaignSuffix(campaign) {
  return CAMPAIGNS[campaign]?.label ? `-${campaign}` : '';
}

// Serve catalog (brands + formats) to the frontend. Formats are brand-aware:
// each brand gets the shared social formats plus its own website banner sizes.
app.get('/api/catalog', (_req, res) => {
  const brands = Object.entries(BRANDS).map(([id, b]) => ({
    id, name: b.name, style: b.style, campaignFields: b.campaignFields || [],
  }));
  const formatsByBrand = {};
  for (const { id } of brands) formatsByBrand[id] = allFormats(id);
  const campaigns = Object.entries(CAMPAIGNS).map(([id, c]) => ({ id, name: c.name }));
  res.json({ brands, campaigns, formats: FORMATS, formatsByBrand });
});

// Upload image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
  });
});

// HTML preview for one format (used by the iframe in the UI)
app.post('/api/preview-html', (req, res) => {
  try {
    const {
      brandId, campaign, discount, copy, subcopy, cta, imageUrl, images, product, legal, focal, veil, zoom, format,
    } = req.body;
    if (!brandId || !format?.w || !format?.h) {
      return res.status(400).json({ error: 'Missing brandId or format' });
    }
    const html = renderBanner({
      brandId,
      campaign,
      discount,
      images: Array.isArray(images) ? images : [],
      product: product || {},
      legal: legal ?? '',
      copy: copy ?? '',
      subcopy: subcopy ?? '',
      cta: cta ?? '',
      imageUrl: imageUrl ?? '',
      focal: focal ?? { x: 50, y: 50 },
      veil: !!veil,
      zoom: Number(zoom) || 1,
      format: { w: Number(format.w), h: Number(format.h), platform: format.platform, part: format.part },
      baseUrl: `http://localhost:${PORT}/`,
    });
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Generate the full ZIP
app.post('/api/generate', async (req, res) => {
  const { brandId, campaign, discount, copy, subcopy, cta, imageUrl, images, product, legal, perFormat } = req.body;
  if (!brandId) return res.status(400).json({ error: 'brandId required' });
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl required (upload first)' });

  const renderer = new Renderer();
  try {
    await renderer.init();

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="banners-${brandId}${campaignSuffix(campaign)}-${Date.now()}.zip"`,
    });
    archive.on('error', (err) => {
      console.error('archive error:', err);
      try { res.status(500).end(); } catch (_) {}
    });
    archive.pipe(res);

    for (const format of allFormats(brandId)) {
      const opts = (perFormat && perFormat[format.id]) || {};
      const focal = { x: opts.focalX ?? 50, y: opts.focalY ?? 50 };
      const veil = !!opts.veil;
      const zoom = Number(opts.zoom) || 1;

      const html = renderBanner({
        brandId,
        campaign,
        discount,
        images: Array.isArray(images) ? images : [],
        product: product || {},
        legal: legal ?? '',
        copy: copy ?? '',
        subcopy: subcopy ?? '',
        cta: cta ?? '',
        imageUrl,
        focal,
        veil,
        zoom,
        format: { w: format.w, h: format.h, platform: format.platform, part: format.part },
        baseUrl: `http://localhost:${PORT}/`,
      });

      const jpg = await renderer.renderToJpg({ html, w: format.w, h: format.h });
      // Include the part suffix so same-size splits (e.g. text/image) don't collide.
      const partSuffix = format.part && format.part !== 'full' ? `-${format.part}` : '';
      const filename = `${format.platform}/${format.w}x${format.h}${partSuffix}.jpg`;
      archive.append(jpg, { name: filename });
      console.log(`rendered ${format.id}`);
    }

    await archive.finalize();
  } catch (err) {
    console.error('generate error:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  } finally {
    await renderer.close();
  }
});

// ---------------------------------------------------------------------------
// Video generator (Short/TikTok + YouTube horizontal)
// ---------------------------------------------------------------------------

// HTML preview of a SINGLE slide for the UI iframe (animations play + loop).
app.post('/api/video/preview', (req, res) => {
  try {
    const { brandId, format, slide, logoUrl, imageMotion } = req.body;
    if (!brandId || !slide?.type) {
      return res.status(400).json({ error: 'Missing brandId or slide.type' });
    }
    const fmt = resolveFormat(format);
    const data = { ...(slide.data || {}) };
    // In preview we never composite video: show the brand background instead of
    // a broken <img> when the product media is a video clip.
    if (slide.type === 'producto' && data.mediaType === 'video') data.mediaUrl = '';
    const html = renderSlide(
      { type: slide.type, brandId, data, durationMs: VIDEO_DEFAULTS[slide.type] || 3000, overlayOnly: false },
      {
        format: fmt, baseUrl: `http://localhost:${PORT}/`, capture: false, logoUrl: logoUrl || null,
        imageMotion, imageIndex: Number(slide.index) || 0,
      }
    );
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('video preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Render the full MP4 and stream it back as a download.
app.post('/api/video/generate', async (req, res) => {
  const payload = req.body || {};
  if (!payload.brandId) return res.status(400).json({ error: 'brandId required' });

  let result = null;
  try {
    result = await renderVideo(payload, {
      baseUrl: `http://localhost:${PORT}/`,
      resolvePath: resolveUploadPath,
      tmpDir: os.tmpdir(),
      fps: 30,
      onProgress: (p) => console.log('  video', JSON.stringify(p)),
    });

    const stat = fs.statSync(result.file);
    res.set({
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="video-${payload.brandId}-${result.format.name}-${Date.now()}.mp4"`,
    });
    const stream = fs.createReadStream(result.file);
    stream.pipe(res);
    stream.on('close', () => {
      fs.rm(result.workDir, { recursive: true, force: true }, () => {});
    });
    stream.on('error', (err) => {
      console.error('stream error:', err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
      fs.rm(result.workDir, { recursive: true, force: true }, () => {});
    });
  } catch (err) {
    console.error('video generate error:', err);
    if (result?.workDir) fs.rm(result.workDir, { recursive: true, force: true }, () => {});
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n  banners generator running at http://localhost:${PORT}\n`);
});
