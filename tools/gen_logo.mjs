// Логотип и иконка сайта в стиле игры: изометрические Сарай и мельница на холме + надпись.
// Здания берутся из того же генератора, что и на карте (src/features/farm/buildingArt).
//
//   node tools/gen_logo.mjs     # src/assets/logo.svg (шапка) и public/favicon.svg (вкладка браузера)
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { renderBuildingSvg } from "../src/features/farm/buildingArt/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Вложить svg здания в позицию (x, y) шириной w — размеры берутся из его viewBox. */
function place(svg, x, y, w) {
  const [, , vw, vh] = svg.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
  const h = (w * vh) / vw;
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return `<svg x="${x}" y="${(y - h).toFixed(1)}" width="${w}" height="${h.toFixed(1)}" viewBox="0 0 ${vw} ${vh}">${inner}</svg>`;
}

const barn = renderBuildingSvg("barn");
const mill = renderBuildingSvg("mill");

// Холм с полосами грядок
const hill = (cx, cy, rx, ry) => `
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#7cb342" stroke="#2b2118" stroke-width="2.5"/>
  <path d="M${cx - rx * 0.78},${cy - ry * 0.18} Q${cx},${cy - ry * 0.62} ${cx + rx * 0.8},${cy - ry * 0.2}" fill="none" stroke="#9ccc65" stroke-width="7" stroke-linecap="round"/>
  <path d="M${cx - rx * 0.88},${cy + ry * 0.18} Q${cx},${cy - ry * 0.2} ${cx + rx * 0.9},${cy + ry * 0.16}" fill="none" stroke="#c5a14a" stroke-width="7" stroke-linecap="round"/>
  <path d="M${cx - rx * 0.8},${cy + ry * 0.5} Q${cx},${cy + ry * 0.2} ${cx + rx * 0.82},${cy + ry * 0.48}" fill="none" stroke="#9ccc65" stroke-width="7" stroke-linecap="round"/>`;

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 200" width="660" height="200">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#bfe6ff"/><stop offset="1" stop-color="#e8f7ff"/>
    </linearGradient>
  </defs>
  <circle cx="110" cy="96" r="88" fill="url(#sky)" stroke="#2b2118" stroke-width="3"/>
  <circle cx="160" cy="44" r="14" fill="#ffd54f"/>
  ${hill(110, 150, 92, 40)}
  ${place(mill, 104, 136, 82)}
  ${place(barn, 40, 150, 84)}
  <text x="214" y="118" font-family="'Trebuchet MS','Segoe UI',Verdana,sans-serif" font-size="74" font-weight="900"
        fill="#2e7d32" stroke="#fff8e1" stroke-width="10" paint-order="stroke" letter-spacing="1">Farmotoria</text>
  <text x="220" y="154" font-family="'Trebuchet MS','Segoe UI',Verdana,sans-serif" font-size="21" font-weight="700"
        fill="#8d5a2b" stroke="#fff8e1" stroke-width="5" paint-order="stroke">ферма, которая растёт вместе с тобой</text>
</svg>
`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#bfe6ff" stroke="#2b2118" stroke-width="2"/>
  <ellipse cx="32" cy="50" rx="28" ry="12" fill="#7cb342" stroke="#2b2118" stroke-width="1.5"/>
  ${place(barn, 9, 52, 46)}
</svg>
`;

writeFileSync(join(root, "src", "assets", "logo.svg"), logo);
writeFileSync(join(root, "public", "favicon.svg"), favicon);
console.log("logo.svg, favicon.svg");
