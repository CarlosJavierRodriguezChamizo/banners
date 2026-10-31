// Brand configuration. The "style" key picks which template family to use.
// Tweak colors/fonts here without touching templates.

const BRANDS = {
  'decorabano': {
    name: 'Decorabaño',
    style: 'panel',
    fontFamily: 'Lausanne, "Helvetica Neue", Arial, sans-serif',
    colors: {
      panel: '#0F2A47',
      text: '#FFFFFF',
      subtext: 'rgba(255,255,255,0.85)',
      cta: '#B6D8E5',
      ctaText: '#0F2A47',
    },
    titleWeight: 500,
    titleCase: 'none',
    // Seasonal skins (src/campaigns.js). Both keep the Decorabaño navy + light
    // blue and switch to the multiproduct mosaic (src/templates/mosaic.js)
    // with an editorial header lockup instead of a pill. Cyber Monday adds a
    // navy pixel dissolve over the photos.
    campaignFields: ['images'],
    campaigns: {
      'black-friday': {
        layout: 'mosaic',
        badge: { line: true, fill: false, fg: '#B6D8E5', extraFg: '#FFFFFF' },
      },
      'cyber-monday': {
        layout: 'mosaic',
        badge: { line: true, fill: false, fg: '#B6D8E5', extraFg: '#FFFFFF' },
        decor: {
          seam: { type: 'pixels', color: '#0F2A47', opacity: 1, cell: 0.05 },
        },
      },
    },
  },
  'decora-salle-de-bain': {
    name: 'Decora Salle de Bain',
    style: 'panel',
    fontFamily: 'Lausanne, "Helvetica Neue", Arial, sans-serif',
    colors: {
      panel: '#0F2A47',
      text: '#FFFFFF',
      subtext: 'rgba(255,255,255,0.85)',
      cta: '#B6D8E5',
      ctaText: '#0F2A47',
    },
    titleWeight: 500,
    titleCase: 'none',
    // Seasonal skins (src/campaigns.js). Both keep the Decorabaño navy + light
    // blue and switch to the multiproduct mosaic (src/templates/mosaic.js)
    // with an editorial header lockup instead of a pill. Cyber Monday adds a
    // navy pixel dissolve over the photos.
    campaignFields: ['images'],
    campaigns: {
      'black-friday': {
        layout: 'mosaic',
        badge: { line: true, fill: false, fg: '#B6D8E5', extraFg: '#FFFFFF' },
      },
      'cyber-monday': {
        layout: 'mosaic',
        badge: { line: true, fill: false, fg: '#B6D8E5', extraFg: '#FFFFFF' },
        decor: {
          seam: { type: 'pixels', color: '#0F2A47', opacity: 1, cell: 0.05 },
        },
      },
    },
  },
  'solomamparas': {
    name: 'Solomamparas',
    style: 'tags',
    fontFamily: 'Sora, "Helvetica Neue", Arial, sans-serif',
    colors: {
      tagBg: '#2C8FE3',
      tagBgAlpha: 'rgba(44, 143, 227, 0.75)',
      tagText: '#FFFFFF',
      cta: '#F26B2A',
      ctaText: '#FFFFFF',
      // Video only — cupones slide: brand blue base with the brighter promo orange.
      videoCouponBg: '#0091EB',
      videoCouponAccent: '#FF7701',
    },
    titleWeight: 800,
    titleCase: 'uppercase',
    // Seasonal skins (src/campaigns.js): retail promo layout
    // (src/templates/commercial.js) — white headline with *highlighted* words,
    // solid label tab, optional price card with a round discount label.
    // Black Friday in brand orange; Cyber Monday in navy + cyan with tape.
    campaignFields: ['product'],
    campaigns: {
      'black-friday': {
        layout: 'commercial',
        colors: { accent: '#F26B2A', onAccent: '#FFFFFF' },
        badge: { bg: '#F26B2A', fg: '#FFFFFF' },
        decor: {
          sticker: { shape: 'circle', bg: '#F26B2A', fg: '#FFFFFF', ring: false, rotate: -8 },
        },
      },
      'cyber-monday': {
        layout: 'commercial',
        colors: { accent: '#2CC8F2', onAccent: '#0E204A' },
        badge: { bg: '#2CC8F2', fg: '#0E204A' },
        decor: {
          tape: { bg: '#2CC8F2', fg: '#0E204A', double: true },
          sticker: { shape: 'pixel', bg: '#0E204A', fg: '#2CC8F2', rotate: 0 },
        },
      },
    },
  },
  'douche-elite': {
    name: 'Douche Elite',
    style: 'tags',
    fontFamily: 'Sora, "Helvetica Neue", Arial, sans-serif',
    colors: {
      tagBg: '#2C8FE3',
      tagBgAlpha: 'rgba(44, 143, 227, 0.75)',
      tagText: '#FFFFFF',
      cta: '#F26B2A',
      ctaText: '#FFFFFF',
    },
    titleWeight: 800,
    titleCase: 'uppercase',
    // Seasonal skins (src/campaigns.js): retail promo layout
    // (src/templates/commercial.js) — white headline with *highlighted* words,
    // solid label tab, optional price card with a round discount label.
    // Black Friday in brand orange; Cyber Monday in navy + cyan with tape.
    campaignFields: ['product'],
    campaigns: {
      'black-friday': {
        layout: 'commercial',
        colors: { accent: '#F26B2A', onAccent: '#FFFFFF' },
        badge: { bg: '#F26B2A', fg: '#FFFFFF' },
        decor: {
          sticker: { shape: 'circle', bg: '#F26B2A', fg: '#FFFFFF', ring: false, rotate: -8 },
        },
      },
      'cyber-monday': {
        layout: 'commercial',
        colors: { accent: '#2CC8F2', onAccent: '#0E204A' },
        badge: { bg: '#2CC8F2', fg: '#0E204A' },
        decor: {
          tape: { bg: '#2CC8F2', fg: '#0E204A', double: true },
          sticker: { shape: 'pixel', bg: '#0E204A', fg: '#2CC8F2', rotate: 0 },
        },
      },
    },
  },
  'todo-muebles': {
    name: 'Todo Muebles de Baño',
    style: 'editorial',
    fontTitle: 'Ogg, Georgia, "Times New Roman", serif',
    fontBody: '"Suisse Intl", "Helvetica Neue", Arial, sans-serif',
    colors: {
      // Photographic banners: full-bleed photo, butter yellow type centred on a
      // dark green tinted scrim, outlined (ghost) CTA in the same yellow.
      overlayTitle: '#FBEC80',                  // brand butter yellow
      overlayBody: 'rgba(251,236,128,0.92)',
      overlayScrim: 'rgba(27,38,37,0.55)',      // centre of the scrim, over the copy
      overlayScrimSoft: 'rgba(27,38,37,0.18)',  // edges of the scrim
      overlayBg: '#2C403F',                     // fallback when there's no photo
      frame: '#E1E1E1',                         // hairline border around the canvas
      cta: '#FBEC80',                           // ghost CTA: border + label
      // Kept for the video generator's palette normalization.
      panel: '#A6B9A5',
      patternLine: 'rgba(255,255,255,0.5)',
      title: '#382B33',
      body: '#382B33',
    },
    // Video-only styling (read by src/video/slides.js). Every frame sits on the
    // sage green, lined with the brand pattern; dark green carries the small
    // accents and butter yellow the large masses (buttons, chips, badges).
    video: {
      bg: '#A6B9A5',
      accent: '#2C403F',
      accentMass: '#FDE68A',
      onAccentMass: '#2C403F',
      pattern: true,
      ctaSans: true,
      ctaShadow: false,
      couponStyle: 'stub',
    },
    titleWeight: 400,
    titleCase: 'none',
    // Seasonal skins (src/campaigns.js): luminous lifestyle layout
    // (src/templates/inspire.js) — bright photo, short Suisse stack at the top
    // in soft yellow, yellow pill CTA, optional vertical legal copy. No seal:
    // the discount lives in the campaign line.
    campaignFields: ['legal'],
    campaigns: {
      'black-friday': {
        layout: 'inspire',
        colors: { inspireInk: '#F7EAA8', inspireCta: '#F7EAA8', inspireCtaText: '#2C403F' },
        badge: { fg: '#F7EAA8', rule: true },
      },
      'cyber-monday': {
        layout: 'inspire',
        colors: { inspireInk: '#F7EAA8', inspireCta: '#F7EAA8', inspireCtaText: '#2C403F' },
        badge: { bg: 'rgba(166,185,165,0.92)', fg: '#2C403F' },
        decor: {
          pattern: { type: 'arches', color: '#FFFDF6', opacity: 0.45, corners: ['bl'], radius: 0.36 },
        },
      },
    },
  },
  'nuria-cobo': {
    name: 'Nuria Cobo',
    style: 'fashion',
    fontTitle: 'Ogg, "Times New Roman", Georgia, serif',
    fontBody: '"Suisse Intl", "Helvetica Neue", Arial, sans-serif',
    colors: {
      // Panel mode (wide formats): cream background, black serif title.
      panelBg: '#F3EFE8',
      title: '#161616',          // black title on the cream panel
      subtitle: '#5A5A5A',
      // Overlay mode (square/portrait): white text over the photo.
      titleOverlay: '#FFFFFF',
      subtitleOverlay: 'rgba(255,255,255,0.92)',
      // Shared.
      cta: '#EF8AA3',            // rose pink pill
      ctaText: '#FFFFFF',
      logo: '#1B70B5',           // logo color on panels
      logoOverlay: '#FFFFFF',    // logo color over photos
    },
    titleWeight: 400,            // Ogg Roman only — never italic
    titleCase: 'none',
    // Seasonal skins (src/campaigns.js). Black Friday: black panel, white type,
    // rose eyebrow with a hairline. Cyber Monday: the logo blue as panel with a
    // rose pill badge. Overlays get a slightly deeper scrim for the extra line.
    campaigns: {
      'black-friday': {
        colors: {
          panelBg: '#121212', title: '#FFFFFF', subtitle: 'rgba(255,255,255,0.72)',
          logo: '#FFFFFF', overlayScrim: 'rgba(0,0,0,0.62)',
        },
        // Bare rose label on the panel; over photos it needs a backing, so the
        // overlay layouts get a black pill instead.
        badge: { fg: '#EF8AA3', rule: true, overlay: { bg: '#121212', fg: '#EF8AA3', rule: false } },
        // Rose arcs rising from the panel corner + scalloped rose sticker.
        decor: {
          pattern: { type: 'arches', color: '#EF8AA3', opacity: 0.4, corners: ['br'], radius: 0.5, rings: 9 },
          sticker: {
            shape: 'scallop', bg: '#EF8AA3', fg: '#FFFFFF', ring: false, rotate: 8,
            font: '"Suisse Intl", Arial, sans-serif', numFont: 'Ogg, Georgia, serif', weight: 400,
          },
        },
      },
      'cyber-monday': {
        colors: {
          panelBg: '#1B70B5', title: '#FFFFFF', subtitle: 'rgba(255,255,255,0.85)',
          logo: '#FFFFFF', overlayScrim: 'rgba(0,0,0,0.58)',
        },
        badge: { bg: '#EF8AA3', fg: '#FFFFFF' },
        // Soft white waves across the blue panel + rose seal with text ring.
        decor: {
          pattern: { type: 'waves', color: '#FFFFFF', opacity: 0.13 },
          sticker: {
            shape: 'circle', bg: '#EF8AA3', fg: '#FFFFFF',
            font: '"Suisse Intl", Arial, sans-serif', numFont: 'Ogg, Georgia, serif', weight: 400,
          },
        },
      },
    },
  },
};

function getBrand(id) {
  const b = BRANDS[id];
  if (!b) throw new Error(`Unknown brand: ${id}`);
  return b;
}

module.exports = { BRANDS, getBrand };
