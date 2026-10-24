// Генератор внешнего вида зданий.
//
// Внешний вид (хранится на сервере, PlayerBuildingAppearance):
//   { v: 2, shape, details, colors: { wall, roof, window } | null }
//   shape    — зерно формы: 0 — исходная (классическая) форма, иначе модульная генерация (procedural.js);
//   details  — зерно деталей (окна, реквизит, животные на фермах);
//   colors   — цвета стен, крыши, окон и дверей, выбранные игроком (#rrggbb); null — стандартные.
// null — полностью стандартный вид: он же лежит файлами в src/assets/buildings (tools/gen_buildings.mjs).
import { Builder, rng, shade } from "./core.js";
import { CLASSIC } from "./classic.js";
import { PALETTES, RECIPES } from "./procedural.js";

// Запас высоты картинки над стандартной: крутые крыши, трубы и дым не обрезаются
const HEADROOM = 0.9;

export const COLOR_SLOTS = ["wall", "roof", "window"];
const DEFAULT_SLOTS = { wall: "Стены", roof: "Крыша", window: "Окна и двери" };

// Перекраска классической формы: какие параметры рисунка отвечают за стены, крышу и окна
const genericPaint = {
  get: (L) => ({ wall: L.wall, roof: L.roof, window: L.door || "#fafafa" }),
  set: (c) => ({ wall: c.wall, roof: c.roof, door: c.window }),
};
const CLASSIC_PAINT = {
  warehouse: {
    get: (L) => ({ wall: L.wall, roof: L.roof, window: L.gate }),
    set: (c) => ({ wall: c.wall, roof: c.roof, gate: c.window, gateLine: shade(c.window, 1.3) }),
  },
  barn: {
    get: (L) => ({ wall: L.wall, roof: L.roof, window: L.trim }),
    set: (c) => ({ wall: c.wall, door: shade(c.wall, 0.7), roof: c.roof, trim: c.window }),
  },
  cowshed: {
    get: (L) => ({ wall: L.wall, roof: L.roof, window: L.trim }),
    set: (c) => ({ wall: c.wall, gate: shade(c.wall, 0.72), roof: c.roof, trim: c.window }),
  },
  blacksmith: {
    get: genericPaint.get,
    set: (c) => ({ ...genericPaint.set(c), chimney: shade(c.wall, 0.85) }),
  },
  quarry: {
    get: (L) => ({ wall: L.stone, roof: "#5d4037", window: L.cart }),
    set: (c) => ({ stone: c.wall, cart: c.window }),
  },
  mine: {
    get: (L) => ({ wall: L.rock, roof: L.frame, window: L.cart }),
    set: (c) => ({ rock: c.wall, frame: c.roof, cart: c.window }),
  },
  sawmill: {
    get: (L) => ({ wall: L.log, roof: L.roof, window: L.post }),
    set: (c) => ({ log: c.wall, roof: c.roof, post: c.window }),
  },
  market: {
    get: (L) => ({ wall: "#a1887f", roof: L.tents[0][0], window: L.tents[0][1] }),
    set: (c) => ({ tents: [[c.roof, c.window], [c.roof, c.window], [c.roof, c.window]] }),
  },
};
const paintOf = (slug) => CLASSIC_PAINT[slug] || genericPaint;

export const hasBuildingArt = (slug) => Boolean(CLASSIC[slug] || RECIPES[slug]);

/** Подписи трёх цветов для окна «Внешний вид» (у каменоломни «Камень», у рынка «Тенты»…). */
export const slotLabels = (slug) => RECIPES[slug]?.slots || DEFAULT_SLOTS;

/** Стандартные цвета здания (исходная форма). */
export function defaultColors(slug) {
  const spec = CLASSIC[slug];
  return spec ? paintOf(slug).get(spec.base) : { wall: "#ecd9b0", roof: "#c0392b", window: "#fafafa" };
}

/** Случайные цвета из палитры здания (у Сарая — «амбарные», у каменоломни — камень…);
 *  закреплённые (locked) слоты берутся из current. */
export function randomColors(rand, slug, current = null, locked = {}) {
  const palette = RECIPES[slug]?.palette || PALETTES;
  const out = {};
  for (const slot of COLOR_SLOTS) {
    const list = palette[slot];
    out[slot] = locked[slot] && current?.[slot] ? current[slot] : list[Math.floor(rand() * list.length)];
  }
  return out;
}

export const isDefaultAppearance = (a) => !a || (!a.shape && !a.colors);

/** Нарисовать здание. mode "full" — картинка «в покое», "base" — «в работе» (без движущихся частей). */
function drawBuilding(slug, appearance, mode) {
  const classic = CLASSIC[slug];
  if (isDefaultAppearance(appearance) || !appearance.shape) {
    if (!classic) return null;
    const [w, h, zmax] = classic.size;
    const b = new Builder(w, h, zmax + HEADROOM);
    b.mode = mode;
    const look = { ...classic.base };
    if (appearance?.colors) {
      Object.assign(look, paintOf(slug).set(appearance.colors));
      b.windowColor = appearance.colors.window;
    }
    classic.draw(b, look);
    return b;
  }
  const recipe = RECIPES[slug];
  if (!recipe) return drawBuilding(slug, { ...appearance, shape: 0 }, mode);
  const [w, h, zmax] = recipe.size;
  const b = new Builder(w, h, zmax + HEADROOM * 0.5);
  b.mode = mode;
  const colors = appearance.colors || randomColors(rng(appearance.shape), slug);
  b.windowColor = colors.window;
  recipe.compose(b, rng(appearance.shape), rng(appearance.details || 1), colors);
  return b;
}

/** SVG-разметка здания «в покое». appearance=null — стандартный вид. */
export function renderBuildingSvg(slug, appearance = null) {
  return drawBuilding(slug, appearance, "full")?.svg() ?? null;
}

const ROTOR_FRAMES = 12;

/**
 * Анимация здания «в работе»: картинка без движущихся частей + части + эффекты.
 * Координаты — в единицах картинки (ширина 256, высота H), как у svg здания.
 *   parts: rotor  — { box, frames: [svg × 12 на один шаг симметрии], period (сек на шаг) }
 *          sprite — { box, svg, motion: { kind: "bob" | "chop" | "lift" | "shuttle" | "wander", … } }
 *   emitters: { type: "smoke" | "steam" | "dust" | "chips" | "glow", x, y, a, … }
 * null — у здания нечего анимировать.
 */
export function renderBuildingAnimation(slug, appearance = null) {
  const b = drawBuilding(slug, appearance, "base");
  if (!b || (!b.parts.length && !b.emitters.length)) return null;
  const parts = b.parts.map((p) => {
    if (p.type === "rotor") {
      const frames = Array.from({ length: ROTOR_FRAMES }, (_, i) => Builder.partSvg(p.box, p.frame((p.symmetry * i) / ROTOR_FRAMES)));
      return { type: "rotor", box: p.box, frames, period: p.period };
    }
    return { type: "sprite", box: p.box, svg: Builder.partSvg(p.box, p.els.join("")), motion: p.motion };
  });
  return { svg: b.svg(), H: Math.ceil(b.H), parts, emitters: b.emitters };
}

export const svgToDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const randomSeed = () => 1 + Math.floor(Math.random() * (2 ** 31 - 1)); // 0 — исходная форма

const norm = (a) => (isDefaultAppearance(a) ? "" : `${a.shape}.${a.details}.${COLOR_SLOTS.map((s) => a.colors?.[s] || "").join(".")}`);

export const sameAppearance = (a, b) => norm(a) === norm(b);

/** Ключ кэша текстур. */
export const appearanceKey = (slug, appearance) => (isDefaultAppearance(appearance) ? slug : `${slug}@${norm(appearance)}`);

export { CLASSIC, RECIPES };
