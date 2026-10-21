const panel = require('./panel');
const tags = require('./tags');
const editorial = require('./editorial');
const fashion = require('./fashion');
const { getBrand } = require('../brands');
const { applyCampaign } = require('../campaigns');

const STYLES = {
  panel,
  tags,
  editorial,
  fashion,
};

function renderBanner({ brandId, campaign, discount, copy, subcopy, cta, imageUrl, focal, veil, zoom, format, baseUrl }) {
  const brand = applyCampaign(getBrand(brandId), campaign, discount);
  const template = STYLES[brand.style];
  if (!template) throw new Error(`Unknown style: ${brand.style}`);
  const part = format?.part || 'full';
  return template.render({ brand, copy, subcopy, cta, imageUrl, focal, veil, zoom, format, baseUrl, part });
}

module.exports = { renderBanner };
