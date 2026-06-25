const panel = require('./panel');
const tags = require('./tags');
const editorial = require('./editorial');
const fashion = require('./fashion');
const { getBrand } = require('../brands');

const STYLES = {
  panel,
  tags,
  editorial,
  fashion,
};

function renderBanner({ brandId, copy, subcopy, cta, imageUrl, focal, veil, zoom, format, baseUrl }) {
  const brand = getBrand(brandId);
  const template = STYLES[brand.style];
  if (!template) throw new Error(`Unknown style: ${brand.style}`);
  return template.render({ brand, copy, subcopy, cta, imageUrl, focal, veil, zoom, format, baseUrl });
}

module.exports = { renderBanner };
