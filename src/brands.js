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
    },
    titleWeight: 800,
    titleCase: 'uppercase',
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
  },
  'todo-muebles': {
    name: 'Todo Muebles de Baño',
    style: 'editorial',
    fontTitle: 'Ogg, Georgia, "Times New Roman", serif',
    fontBody: '"Suisse Intl", "Helvetica Neue", Arial, sans-serif',
    colors: {
      panel: '#A6B9A5',
      patternLine: 'rgba(255,255,255,0.5)',
      title: '#382B33',
      body: '#382B33',
      cta: '#FBEC80',
      ctaText: '#382B33',
    },
    titleWeight: 400,
    titleCase: 'none',
  },
  'nuria-cobo': {
    name: 'Nuria Cobo',
    style: 'fashion',
    fontTitle: 'Ogg, "Times New Roman", Georgia, serif',
    fontBody: '"Suisse Intl", "Helvetica Neue", Arial, sans-serif',
    colors: {
      bg: '#FFFFFF',
      title: '#1F4380',
      subtitle: '#4A4A4A',
      cta: '#EE7896',
      ctaText: '#FFFFFF',
      wordmark: '#1F4380',
    },
    titleWeight: 400,
    titleStyle: 'italic',
    titleCase: 'none',
    wordmark: 'Nuria Cobo',
  },
};

function getBrand(id) {
  const b = BRANDS[id];
  if (!b) throw new Error(`Unknown brand: ${id}`);
  return b;
}

module.exports = { BRANDS, getBrand };
