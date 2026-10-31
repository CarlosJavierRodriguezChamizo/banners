const panel = require('./panel');
const tags = require('./tags');
const editorial = require('./editorial');
const fashion = require('./fashion');
const mosaic = require('./mosaic');
const commercial = require('./commercial');
const inspire = require('./inspire');
const { getBrand } = require('../brands');
const { applyCampaign } = require('../campaigns');

const STYLES = {
  panel,
  tags,
  editorial,
  fashion,
};

// Campaign-only layouts. A brand opts in with `layout` inside its
// campaigns.<id> block; the generic campaign always uses the brand's style.
const LAYOUTS = {
  mosaic,
  commercial,
  inspire,
};

function renderBanner({
  brandId, campaign, discount, campaignLabel, copy, subcopy, cta, imageUrl, images, product, legal,
  focal, veil, zoom, format, baseUrl,
}) {
  const brand = applyCampaign(getBrand(brandId), campaign, discount, campaignLabel);
  const template = (brand.campaign && LAYOUTS[brand.layout]) || STYLES[brand.style];
  if (!template) throw new Error(`Unknown style: ${brand.style}`);
  const part = format?.part || 'full';
  return template.render({
    brand, copy, subcopy, cta, imageUrl, images: images || [], product: product || {}, legal: legal || '',
    focal, veil, zoom, format, baseUrl, part,
  });
}

module.exports = { renderBanner };
