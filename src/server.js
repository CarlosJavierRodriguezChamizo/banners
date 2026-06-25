const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const express = require('express');
const multer = require('multer');
const archiver = require('archiver');

const { BRANDS } = require('./brands');
const { FORMATS, allFormats } = require('./formats');
const { renderBanner } = require('./templates');
const { Renderer } = require('./renderer');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT, 'uploads');
const PUBLIC_DIR = path.join(ROOT, 'public');
const FONTS_DIR = path.join(ROOT, 'fonts');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '10mb' }));

// Static assets
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/fonts', express.static(FONTS_DIR));
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
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Serve catalog (brands + formats) to the frontend
app.get('/api/catalog', (_req, res) => {
  res.json({
    brands: Object.entries(BRANDS).map(([id, b]) => ({ id, name: b.name, style: b.style })),
    formats: FORMATS,
    allFormats: allFormats(),
  });
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
    const { brandId, copy, subcopy, cta, imageUrl, focal, veil, zoom, format } = req.body;
    if (!brandId || !format?.w || !format?.h) {
      return res.status(400).json({ error: 'Missing brandId or format' });
    }
    const html = renderBanner({
      brandId,
      copy: copy ?? '',
      subcopy: subcopy ?? '',
      cta: cta ?? '',
      imageUrl: imageUrl ?? '',
      focal: focal ?? { x: 50, y: 50 },
      veil: !!veil,
      zoom: Number(zoom) || 1,
      format: { w: Number(format.w), h: Number(format.h) },
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
  const { brandId, copy, subcopy, cta, imageUrl, perFormat } = req.body;
  if (!brandId) return res.status(400).json({ error: 'brandId required' });
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl required (upload first)' });

  const renderer = new Renderer();
  try {
    await renderer.init();

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="banners-${brandId}-${Date.now()}.zip"`,
    });
    archive.on('error', (err) => {
      console.error('archive error:', err);
      try { res.status(500).end(); } catch (_) {}
    });
    archive.pipe(res);

    for (const format of allFormats()) {
      const opts = (perFormat && perFormat[format.id]) || {};
      const focal = { x: opts.focalX ?? 50, y: opts.focalY ?? 50 };
      const veil = !!opts.veil;
      const zoom = Number(opts.zoom) || 1;

      const html = renderBanner({
        brandId,
        copy: copy ?? '',
        subcopy: subcopy ?? '',
        cta: cta ?? '',
        imageUrl,
        focal,
        veil,
        zoom,
        format: { w: format.w, h: format.h },
        baseUrl: `http://localhost:${PORT}/`,
      });

      const jpg = await renderer.renderToJpg({ html, w: format.w, h: format.h });
      const filename = `${format.platform}/${format.w}x${format.h}.jpg`;
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

app.listen(PORT, () => {
  console.log(`\n  banners generator running at http://localhost:${PORT}\n`);
});
