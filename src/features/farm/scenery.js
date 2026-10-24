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

const grass = (c) => svg(`
  <path d="M12,54 Q10,44 6,40 M16,54 Q16,42 13,34 M20,54 Q21,40 24,33 M24,54 Q26,44 31,39 M28,54 Q31,47 35,45"
        stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M14,54 Q13,46 10,43 M22,54 Q23,46 27,42" stroke="${shade(c, 1.25)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);

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
  flowers3: { svg: flowers("#ffffff"), w: 0.5 },
  grass1: { svg: grass("#4c8c2f"), w: 0.45 },
  grass2: { svg: grass("#5f9e3a"), w: 0.4 },
};

// ---------------------------------------------------------------- участки --
export const CHUNK_COLORS = {
  forest: 0x5b8f3f,
  meadow: 0x93c55a,
  rocks: 0xa2a982,
  owned: 0x7cc36a,  // купленная земля — один цвет, переливы даёт grassShade
  wild: 0x4e7f3b,   // кольцо леса вокруг поля
};

const seedOf = (...nums) => nums.reduce((h, n) => (Math.imul(h ^ (n | 0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);

// Плавный шум: значения в узлах решётки шага step и сглаженная интерполяция между ними
function valueNoise(r, c, step, salt) {
  const fr = r / step;
  const fc = c / step;
  const r0 = Math.floor(fr);
  const c0 = Math.floor(fc);
  const node = (a, b) => rng(seedOf(a, b, salt))();
  const smooth = (t) => t * t * (3 - 2 * t);
  const tr = smooth(fr - r0);
  const tc = smooth(fc - c0);
  const top = node(r0, c0) * (1 - tc) + node(r0, c0 + 1) * tc;
  const bottom = node(r0 + 1, c0) * (1 - tc) + node(r0 + 1, c0 + 1) * tc;
  return top * (1 - tr) + bottom * tr;
}

/** Оттенок травы в точке поля: мягкие переливы без резких границ (цвет 0xRRGGBB). */
export function grassShade(r, c) {
  const v = valueNoise(r, c, 16, 71) * 0.7 + valueNoise(r, c, 6, 73) * 0.3;
  const lerp = (a, b) => Math.round(a + (b - a) * v);
  return (lerp(0x70, 0x8a) << 16) | (lerp(0xb8, 0xcc) << 8) | lerp(0x5c, 0x72);
}

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

const OWNED_DECOR = [["grass1", 0.32], ["grass2", 0.28], ["flowers1", 0.12], ["flowers2", 0.1], ["flowers3", 0.08], ["bush1", 0.06], ["bush2", 0.04]];

/** Мелкая растительность на купленной земле (трава, цветы, кустики) — постоянная для участка. */
export function ownedDecor(cr, cc, size) {
  const rand = rng(seedOf(cr, cc, 97));
  const n = 6 + Math.floor(rand() * 6);
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      art: pickWeighted(rand, OWNED_DECOR),
      r: cr * size + 0.4 + rand() * (size - 0.8),
      c: cc * size + 0.4 + rand() * (size - 0.8),
      tint: 0.9 + rand() * 0.1,
    });
  }
  return items;
}

/** Прямоугольник мира вокруг поля с кромкой margin клеток — дальше камера не показывает. */
export function wildBounds(maxSize, margin) {
  const xMax = (maxSize + 2 * margin) * 8;
  return { x0: -xMax, x1: xMax, y0: -8 * margin, y1: 8 * (maxSize + margin) };
}

/** Лес вокруг поля: заполняет весь прямоугольник wildBounds вне поля — гуще у забора, реже дальше. */
export function wildDecor(maxSize, margin) {
  const rand = rng(seedOf(maxSize, margin, 37));
  const { x0, x1, y0, y1 } = wildBounds(maxSize, margin);
  const trees = [];
  for (let y = y0; y < y1; y += 11) {
    for (let x = x0; x < x1; x += 22) {
      const wx = x + rand() * 18;
      const wy = y + rand() * 9;
      const r = (wy / 4 - wx / 8) / 2; // мир → клетки (как isoToGrid)
      const c = (wy / 4 + wx / 8) / 2;
      const out = Math.max(-r, -c, r - maxSize, c - maxSize);
      if (out < 1) continue;
      if (rand() > (out < margin ? 0.5 : 0.22)) continue;
      trees.push({ art: pickWeighted(rand, KIND_DECOR.forest), r, c, tint: 0.78 + rand() * 0.2 });
    }
  }
  return { trees };
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
