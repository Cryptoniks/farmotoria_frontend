// Пейзаж карты: лес и холмы вокруг поля, закрытые участки (лес, луг, камни), забор с воротами.
// Всё детерминированно: один и тот же участок всегда выглядит одинаково (зерно — координаты).
import { OUT, rng, shade } from "./buildingArt/core.js";

// ----------------------------------------------------------------- картинки --
// Контурный стиль как у зданий. Точка опоры — низ по центру (x = 20, y = 54 из viewBox 40×56).
const svg = (body, w = 40, h = 56) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}">${body}</svg>`;

const pine = (c) => svg(`
  <rect x="17.5" y="42" width="5" height="12" fill="#6d4c41" stroke="${OUT}" stroke-width="1.2"/>
  <polygon points="20,22 6,46 34,46" fill="${shade(c, 0.85)}" stroke="${OUT}" stroke-width="1.3" stroke-linejoin="round"/>
  <polygon points="20,12 8,34 32,34" fill="${c}" stroke="${OUT}" stroke-width="1.3" stroke-linejoin="round"/>
  <polygon points="20,3 11,22 29,22" fill="${shade(c, 1.12)}" stroke="${OUT}" stroke-width="1.3" stroke-linejoin="round"/>
  <polygon points="20,3 20,46 34,46 29,34 32,34 26,22 29,22" fill="#000" fill-opacity="0.12"/>`);

const oak = (c) => svg(`
  <rect x="17" y="36" width="6" height="18" fill="#795548" stroke="${OUT}" stroke-width="1.2"/>
  <circle cx="12" cy="30" r="9" fill="${shade(c, 0.88)}" stroke="${OUT}" stroke-width="1.3"/>
  <circle cx="28" cy="30" r="9" fill="${shade(c, 0.78)}" stroke="${OUT}" stroke-width="1.3"/>
  <circle cx="20" cy="18" r="12" fill="${c}" stroke="${OUT}" stroke-width="1.3"/>
  <circle cx="16" cy="14" r="4" fill="#fff" fill-opacity="0.18"/>`);

const bush = (c, berries) => svg(`
  <circle cx="13" cy="44" r="8" fill="${shade(c, 0.85)}" stroke="${OUT}" stroke-width="1.2"/>
  <circle cx="27" cy="44" r="8" fill="${shade(c, 0.75)}" stroke="${OUT}" stroke-width="1.2"/>
  <circle cx="20" cy="38" r="9" fill="${c}" stroke="${OUT}" stroke-width="1.2"/>
  ${berries ? `<circle cx="16" cy="36" r="1.8" fill="${berries}"/><circle cx="24" cy="40" r="1.8" fill="${berries}"/><circle cx="21" cy="45" r="1.8" fill="${berries}"/>` : ""}`);

const rock = (c) => svg(`
  <polygon points="6,52 9,40 18,33 29,35 35,45 33,53" fill="${c}" stroke="${OUT}" stroke-width="1.3" stroke-linejoin="round"/>
  <polygon points="18,33 29,35 35,45 24,44" fill="#fff" fill-opacity="0.2"/>
  <polygon points="6,52 24,44 33,53" fill="#000" fill-opacity="0.15"/>`);

const flowers = (c) => svg(`
  <path d="M10,54 Q12,46 9,40 M20,54 Q19,44 22,38 M30,54 Q28,46 31,41" stroke="#558b2f" stroke-width="1.6" fill="none"/>
  <circle cx="9" cy="40" r="3" fill="${c}" stroke="${OUT}" stroke-width="0.8"/>
  <circle cx="22" cy="38" r="3" fill="${c}" stroke="${OUT}" stroke-width="0.8"/>
  <circle cx="31" cy="41" r="3" fill="${c}" stroke="${OUT}" stroke-width="0.8"/>`);

/** Все картинки пейзажа: имя → svg и ширина в клетках на карте. */
export const SCENERY_ART = {
  pine1: { svg: pine("#2e7d32"), w: 1.2 },
  pine2: { svg: pine("#388e3c"), w: 1.0 },
  pine3: { svg: pine("#1b5e20"), w: 1.35 },
  oak1: { svg: oak("#558b2f"), w: 1.35 },
  oak2: { svg: oak("#689f38"), w: 1.15 },
  bush1: { svg: bush("#558b2f"), w: 0.8 },
  bush2: { svg: bush("#689f38", "#e53935"), w: 0.75 },
  rock1: { svg: rock("#9e9e9e"), w: 0.9 },
  rock2: { svg: rock("#a1887f"), w: 0.7 },
  flowers1: { svg: flowers("#fff176"), w: 0.55 },
  flowers2: { svg: flowers("#f48fb1"), w: 0.55 },
};

// ---------------------------------------------------------------- участки --
export const CHUNK_COLORS = {
  forest: 0x5b8f3f,
  meadow: 0x93c55a,
  rocks: 0xa2a982,
  owned: [0x7cc36a, 0x76bd63],
  wild: 0x4e7f3b, // кольцо леса и холмов вокруг поля
};

const seedOf = (...nums) => nums.reduce((h, n) => (Math.imul(h ^ (n | 0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);

/** Тип закрытого участка: в основном лес, местами луг и камни. */
export function chunkKind(cr, cc) {
  const v = rng(seedOf(cr, cc, 11))();
  return v < 0.6 ? "forest" : v < 0.85 ? "meadow" : "rocks";
}

const KIND_DECOR = {
  forest: [["pine1", 0.3], ["pine2", 0.25], ["pine3", 0.15], ["oak1", 0.15], ["oak2", 0.1], ["bush1", 0.05]],
  meadow: [["bush1", 0.25], ["bush2", 0.15], ["flowers1", 0.25], ["flowers2", 0.2], ["oak2", 0.15]],
  rocks: [["rock1", 0.4], ["rock2", 0.3], ["pine2", 0.15], ["bush1", 0.15]],
};
const KIND_COUNT = { forest: [9, 13], meadow: [3, 6], rocks: [4, 7] };

const pickWeighted = (rand, list) => {
  let v = rand();
  for (const [name, w] of list) {
    if ((v -= w) <= 0) return name;
  }
  return list[list.length - 1][0];
};

/** Деревья, кусты и камни закрытого участка: [{ art, r, c, tint }]. Отступ от края — чтобы не нависали над полем. */
export function chunkDecor(cr, cc, size) {
  const kind = chunkKind(cr, cc);
  const rand = rng(seedOf(cr, cc, 23));
  const [lo, hi] = KIND_COUNT[kind];
  const n = lo + Math.floor(rand() * (hi - lo + 1));
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      art: pickWeighted(rand, KIND_DECOR[kind]),
      r: cr * size + 1 + rand() * (size - 2),
      c: cc * size + 1 + rand() * (size - 2),
      tint: 0.88 + rand() * 0.12,
    });
  }
  return items;
}

/** Лес вокруг поля (кольцо шириной margin клеток) и холмы. */
export function wildDecor(maxSize, margin) {
  const rand = rng(seedOf(maxSize, margin, 37));
  const trees = [];
  for (let r = -margin; r < maxSize + margin; r += 2.2) {
    for (let c = -margin; c < maxSize + margin; c += 2.2) {
      if (r > -1.5 && c > -1.5 && r < maxSize + 0.5 && c < maxSize + 0.5) continue;
      if (rand() > 0.4) continue;
      trees.push({
        art: pickWeighted(rand, KIND_DECOR.forest),
        r: r + rand() * 1.6,
        c: c + rand() * 1.6,
        tint: 0.8 + rand() * 0.2,
      });
    }
  }
  const hills = [];
  for (let i = 0; i < 60; i++) {
    const side = Math.floor(rand() * 4);
    const t = rand() * (maxSize + margin * 2) - margin;
    const d = -margin * (0.3 + rand() * 0.6);
    const [r, c] = [[d, t], [t, maxSize - d], [maxSize - d, t], [t, d]][side];
    hills.push({ r, c, R: 4 + rand() * 7, light: rand() < 0.5 });
  }
  return { trees, hills };
}

// ------------------------------------------------------------------ забор --
/**
 * Отрезки забора по внешней границе купленной земли. owned — Set("cr,cc").
 * Каждый отрезок — сторона участка: { r0, c0, r1, c1, near, gate }.
 * near — ближняя к зрителю сторона (юг/восток): рисуется поверх зданий; дальняя — под ними.
 * gate — ворота посередине стороны: случайно, но постоянно; хотя бы одни ворота есть всегда.
 */
export function fenceEdges(owned, size) {
  const edges = [];
  for (const key of owned) {
    const [cr, cc] = key.split(",").map(Number);
    const sides = [
      ["n", [cr - 1, cc], [cr * size, cc * size, cr * size, (cc + 1) * size], false],
      ["w", [cr, cc - 1], [cr * size, cc * size, (cr + 1) * size, cc * size], false],
      ["s", [cr + 1, cc], [(cr + 1) * size, cc * size, (cr + 1) * size, (cc + 1) * size], true],
      ["e", [cr, cc + 1], [cr * size, (cc + 1) * size, (cr + 1) * size, (cc + 1) * size], true],
    ];
    for (const [side, [nr, nc], [r0, c0, r1, c1], near] of sides) {
      if (owned.has(`${nr},${nc}`)) continue;
      const roll = rng(seedOf(cr, cc, side.charCodeAt(0), 53))();
      edges.push({ r0, c0, r1, c1, near, gate: roll < 0.16, roll });
    }
  }
  if (edges.length && !edges.some((e) => e.gate)) {
    const near = edges.filter((e) => e.near);
    (near.length ? near : edges).reduce((a, b) => (a.roll < b.roll ? a : b)).gate = true;
  }
  return edges;
}
