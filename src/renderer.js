const puppeteer = require('puppeteer');
const sharp = require('sharp');

class Renderer {
  constructor() {
    this.browser = null;
  }

  async init() {
    if (this.browser) return;
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--font-render-hinting=none',
        '--disable-font-subpixel-positioning',
      ],
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Render an HTML string to a JPG buffer at the requested size.
   * Uses deviceScaleFactor 2 then downsamples with sharp for crisper text.
   */
  async renderToJpg({ html, w, h, quality = 92 }) {
    if (!this.browser) await this.init();
    const page = await this.browser.newPage();
    try {
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      // Wait for web fonts to finish loading before snapshot.
      await page.evaluate(() => document.fonts.ready);
      const png = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: w, height: h },
        omitBackground: false,
      });
      const jpg = await sharp(png)
        .resize(w, h, { fit: 'cover' })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toBuffer();
      return jpg;
    } finally {
      await page.close();
    }
  }
}

module.exports = { Renderer };
