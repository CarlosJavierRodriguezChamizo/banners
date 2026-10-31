// Seasonal campaigns. A campaign is a skin layered on top of a brand: it swaps
// some of the brand's colors (from the brand's own `campaigns` block in
// src/brands.js, so each store keeps its identity) and adds a campaign badge
// ("BLACK FRIDAY · HASTA -40%") above the title. 'generic' is the plain brand.

const CAMPAIGNS = {
  'generic':      { name: 'Genérica',     label: '' },
  'black-friday': { name: 'Black Friday', label: 'Black Friday' },
  'cyber-monday': { name: 'Cyber Monday', label: 'Cyber Monday' },
};

// Returns the brand with the campaign's overrides merged in, plus a
// `campaign` field the templates read: null for the generic campaign, else
// { id, label, discount, text, ...badge colors/style from the brand config }.
// The brand's `decor` block (SVG stickers, tape, patterns — see
// src/templates/decor.js) lands on brand.decor via the override spread.
// `customLabel` replaces the campaign name everywhere it's drawn (badge,
// tape, sticker ring) — e.g. "Black Week" instead of "Black Friday". Omitted
// (null/undefined) means the default name; an empty string means no label at
// all — empty fields are never drawn.
function applyCampaign(brand, campaignId, discount, customLabel) {
  const campaign = CAMPAIGNS[campaignId];
  if (!campaign || !campaign.label) return { ...brand, campaign: null };
  const override = brand.campaigns?.[campaignId] || {};
  const extra = String(discount ?? '').replace(/\s+/g, ' ').trim();
  const label = customLabel == null
    ? campaign.label
    : String(customLabel).replace(/\s+/g, ' ').trim();
  return {
    ...brand,
    ...override,
    colors: { ...brand.colors, ...(override.colors || {}) },
    campaign: {
      id: campaignId,
      label,
      discount: extra,
      text: [label, extra].filter(Boolean).join(' · '),
      ...(override.badge || {}),
    },
  };
}

module.exports = { CAMPAIGNS, applyCampaign };
