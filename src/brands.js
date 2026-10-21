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
    // Seasonal skins (src/campaigns.js). Black Friday swaps the navy for black
    // and keeps the brand's light blue as the accent; Cyber Monday goes to a
    // saturated electric navy with a cyan outline badge.
    campaigns: {
      'black-friday': {
        colors: { panel: '#0B0B0D', subtext: 'rgba(255,255,255,0.78)', cta: '#B6D8E5', ctaText: '#0B0B0D' },
        badge: { bg: '#B6D8E5', fg: '#0B0B0D' },
        // Fine light-blue stripes on the black panel + black tape across the
        // photo's corner.
        decor: {
          pattern: { type: 'stripes', color: '#B6D8E5', opacity: 0.09 },
          tape: { bg: '#0B0B0D', fg: '#B6D8E5' },
        },
      },
      'cyber-monday': {
        colors: { panel: '#0A1F5C', cta: '#5CE1FF', ctaText: '#0A1F5C' },
        badge: { border: '#5CE1FF', fg: '#5CE1FF' },
        // The panel "dissolves" into the photo in pixels, plus a dot grid on
        // the panel and a navy seal with a cyan text ring.
        decor: {
          pattern: { type: 'dots', color: '#5CE1FF', opacity: 0.22, fade: 'seam' },
          seam: { type: 'pixels', color: '#0A1F5C', opacity: 1 },
          sticker: { shape: 'circle', bg: '#0A1F5C', fg: '#5CE1FF', stroke: '#5CE1FF' },
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
    // Seasonal skins (src/campaigns.js). Black Friday swaps the navy for black
    // and keeps the brand's light blue as the accent; Cyber Monday goes to a
    // saturated electric navy with a cyan outline badge.
    campaigns: {
      'black-friday': {
        colors: { panel: '#0B0B0D', subtext: 'rgba(255,255,255,0.78)', cta: '#B6D8E5', ctaText: '#0B0B0D' },
        badge: { bg: '#B6D8E5', fg: '#0B0B0D' },
        // Fine light-blue stripes on the black panel + black tape across the
        // photo's corner.
        decor: {
          pattern: { type: 'stripes', color: '#B6D8E5', opacity: 0.09 },
          tape: { bg: '#0B0B0D', fg: '#B6D8E5' },
        },
      },
      'cyber-monday': {
        colors: { panel: '#0A1F5C', cta: '#5CE1FF', ctaText: '#0A1F5C' },
        badge: { border: '#5CE1FF', fg: '#5CE1FF' },
        // The panel "dissolves" into the photo in pixels, plus a dot grid on
        // the panel and a navy seal with a cyan text ring.
        decor: {
          pattern: { type: 'dots', color: '#5CE1FF', opacity: 0.22, fade: 'seam' },
          seam: { type: 'pixels', color: '#0A1F5C', opacity: 1 },
          sticker: { shape: 'circle', bg: '#0A1F5C', fg: '#5CE1FF', stroke: '#5CE1FF' },
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
    // Seasonal skins (src/campaigns.js). Black Friday turns the blue tags black
    // with the brand orange as badge + CTA; Cyber Monday uses deep navy tags
    // with an electric cyan badge.
    campaigns: {
      'black-friday': {
        colors: { tagBg: '#0A0A0A', tagBgAlpha: 'rgba(10,10,10,0.88)' },
        badge: { bg: '#F26B2A', fg: '#FFFFFF' },
        // Black warning tape across the corner + an orange price tag.
        decor: {
          tape: { bg: '#0A0A0A', fg: '#F26B2A' },
          sticker: { shape: 'tag', bg: '#F26B2A', fg: '#FFFFFF', ring: false, rotate: -14 },
        },
      },
      'cyber-monday': {
        colors: { tagBg: '#0E204A', tagBgAlpha: 'rgba(14,32,74,0.90)' },
        badge: { bg: '#2CC8F2', fg: '#0E204A' },
        // Cyan tape + a pixelated "digital" sticker.
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
    // Seasonal skins (src/campaigns.js). Black Friday turns the blue tags black
    // with the brand orange as badge + CTA; Cyber Monday uses deep navy tags
    // with an electric cyan badge.
    campaigns: {
      'black-friday': {
        colors: { tagBg: '#0A0A0A', tagBgAlpha: 'rgba(10,10,10,0.88)' },
        badge: { bg: '#F26B2A', fg: '#FFFFFF' },
        // Black warning tape across the corner + an orange price tag.
        decor: {
          tape: { bg: '#0A0A0A', fg: '#F26B2A' },
          sticker: { shape: 'tag', bg: '#F26B2A', fg: '#FFFFFF', ring: false, rotate: -14 },
        },
      },
      'cyber-monday': {
        colors: { tagBg: '#0E204A', tagBgAlpha: 'rgba(14,32,74,0.90)' },
        badge: { bg: '#2CC8F2', fg: '#0E204A' },
        // Cyan tape + a pixelated "digital" sticker.
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
    // Seasonal skins (src/campaigns.js). The ghost CTA becomes a filled yellow
    // button for urgency. Black Friday darkens the scrim to near-black (yellow
    // on black) with a hairline-flanked eyebrow; Cyber Monday keeps the brand
    // green with a sage pill eyebrow.
    campaigns: {
      'black-friday': {
        colors: {
          overlayScrim: 'rgba(8,10,10,0.68)', overlayScrimSoft: 'rgba(8,10,10,0.30)',
          overlayBg: '#0E0F0F', ctaFill: '#FBEC80', ctaFillText: '#141414',
        },
        badge: { fg: '#FBEC80', rule: true },
        // Black seal with a yellow text ring.
        decor: {
          sticker: {
            shape: 'circle', bg: 'rgba(14,15,15,0.88)', fg: '#FBEC80', stroke: '#FBEC80',
            font: '"Suisse Intl", Arial, sans-serif', numFont: 'Ogg, Georgia, serif', weight: 400,
          },
        },
      },
      'cyber-monday': {
        colors: {
          overlayScrim: 'rgba(27,38,37,0.66)', overlayScrimSoft: 'rgba(27,38,37,0.26)',
          ctaFill: '#FBEC80', ctaFillText: '#2C403F',
        },
        badge: { bg: '#A6B9A5', fg: '#2C403F' },
        // Sage concentric arcs from two corners (echoes the brand's line
        // pattern) + a scalloped sage sticker.
        decor: {
          pattern: { type: 'arches', color: '#A6B9A5', opacity: 0.7, corners: ['tl', 'br'], radius: 0.38 },
          sticker: {
            shape: 'scallop', bg: '#A6B9A5', fg: '#2C403F',
            font: '"Suisse Intl", Arial, sans-serif', numFont: 'Ogg, Georgia, serif', weight: 400,
          },
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
