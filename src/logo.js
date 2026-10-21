// Nuria Cobo logo lockup (monogram + "Nuria Cobo").
// Loaded once and stripped of hardcoded fills so it can be recolored per banner
// via `currentColor` (navy on cream panels, white over photos). The fixed
// width/height are removed so it scales to its container by height.

const fs = require('fs');
const path = require('path');

const RAW = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'logo-nuria-cobo.svg'),
  'utf8',
);

const CLEAN = RAW
  .replace(/fill:#[0-9a-fA-F]{3,6}/g, 'fill:currentColor')
  .replace(/fill="#[0-9a-fA-F]{3,6}"/g, 'fill="currentColor"')
  .replace(/stop-color:#[0-9a-fA-F]{3,6}/g, 'stop-color:currentColor')
  .replace(/\s(width|height)="[^"]*"/g, '');

function logoSvg() {
  return CLEAN;
}

module.exports = { logoSvg };
