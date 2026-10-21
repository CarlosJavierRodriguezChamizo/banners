// Format catalog: platform → list of dimensions
const FORMATS = {
  google: [
    { w: 1200, h: 628 },
    { w: 1200, h: 1200 },
    { w: 960, h: 1200 },
  ],
  facebook: [
    { w: 1650, h: 671 },
    { w: 1200, h: 630 },
  ],
  instagram: [
    { w: 1200, h: 630 },
    { w: 1080, h: 1920 },
    { w: 1080, h: 1350 },
    { w: 1080, h: 1080 },
  ],
  pinterest: [
    { w: 1000, h: 1500 },
    { w: 800, h: 450 },
  ],
  twitter: [
    { w: 1500, h: 500 },
    { w: 1024, h: 512 },
  ],
  email: [
    { w: 1200, h: 1200 },
  ],
};

// Brand-specific website banner sizes, added on top of the social formats above.
// `part` splits a single canvas into separate deliverable files:
//   'text'  → only the text panel + CTA (no photo)
//   'image' → only the photo (no text)
//   'full'  → complete banner (default)
const CUSTOM_FORMATS = {
  'decorabano': [
    { platform: 'web', w: 1600, h: 1145, part: 'text',  label: 'Texto + CTA' },
    { platform: 'web', w: 1600, h: 1145, part: 'image', label: 'Solo imagen' },
  ],
  'solomamparas': [
    { platform: 'web', w: 1600, h: 724, label: 'Ordenador' },
    { platform: 'web', w: 640,  h: 550, label: 'Móvil' },
  ],
  'todo-muebles': [
    { platform: 'web', w: 1600, h: 724, label: 'Ordenador' },
    { platform: 'web', w: 640,  h: 550, label: 'Móvil' },
  ],
};

function allFormats(brandId) {
  const out = [];
  for (const [platform, list] of Object.entries(FORMATS)) {
    for (const { w, h } of list) {
      out.push({ platform, w, h, part: 'full', id: `${platform}-${w}x${h}` });
    }
  }
  for (const f of (brandId && CUSTOM_FORMATS[brandId]) || []) {
    const part = f.part || 'full';
    const suffix = part === 'full' ? '' : `-${part}`;
    out.push({
      platform: f.platform,
      w: f.w,
      h: f.h,
      part,
      label: f.label,
      id: `${f.platform}-${f.w}x${f.h}${suffix}`,
    });
  }
  return out;
}

module.exports = { FORMATS, CUSTOM_FORMATS, allFormats };
