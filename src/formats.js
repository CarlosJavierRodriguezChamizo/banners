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

function allFormats() {
  const out = [];
  for (const [platform, list] of Object.entries(FORMATS)) {
    for (const { w, h } of list) {
      out.push({ platform, w, h, id: `${platform}-${w}x${h}` });
    }
  }
  return out;
}

module.exports = { FORMATS, allFormats };
