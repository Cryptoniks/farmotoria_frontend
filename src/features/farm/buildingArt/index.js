// Генератор внешнего вида зданий.
//
// Внешний вид = три зерна { c, r, d }: цвета, крыша, детали. Одно и то же зерно всегда даёт
// одну и ту же картинку, поэтому на сервере хранятся только три числа (PlayerBuildingAppearance).
// Зерно 0 — стандартный вариант этой группы: можно менять, например, только цвета.
// null — стандартный вид (он же лежит готовыми файлами в src/assets/buildings, см. tools/gen_buildings.mjs).
import { Builder, rng } from "./core.js";
import { BUILDINGS } from "./buildings.js";

// Запас высоты картинки над стандартной: крутая крыша, высокая труба и дым не обрезаются
const HEADROOM = 0.9;

export const APPEARANCE_GROUPS = [
  { key: "c", label: "Цвета", icon: "🎨" },
  { key: "r", label: "Крыша и форма", icon: "🏠" },
  { key: "d", label: "Детали", icon: "🪵" },
];

export const hasBuildingArt = (slug) => Boolean(BUILDINGS[slug]);

/** Итоговые параметры рисунка: стандартные + варианты из трёх зёрен. */
export function resolveLook(slug, appearance) {
  const spec = BUILDINGS[slug];
  if (!spec) return null;
  const look = { ...spec.base };
  if (!appearance) return look;
  if (appearance.c) Object.assign(look, spec.colors(rng(appearance.c)));
  if (appearance.r) Object.assign(look, spec.roof(rng(appearance.r)));
  if (appearance.d) Object.assign(look, spec.details(rng(appearance.d)));
  return look;
}

/** SVG-разметка здания. appearance=null — стандартный вид. */
export function renderBuildingSvg(slug, appearance = null) {
  const spec = BUILDINGS[slug];
  if (!spec) return null;
  const [w, h, zmax] = spec.size;
  const b = new Builder(w, h, zmax + HEADROOM);
  spec.draw(b, resolveLook(slug, appearance));
  return b.svg();
}

export const svgToDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const randomSeed = () => 1 + Math.floor(Math.random() * (2 ** 31 - 1)); // 0 зарезервирован под стандарт

export const DEFAULT_APPEARANCE = { c: 0, r: 0, d: 0 };

/** Новое случайное зерно для одной группы (остальные сохраняются) или для всех, если group не указан. */
export function rerollAppearance(appearance, group = null) {
  if (!group) return { c: randomSeed(), r: randomSeed(), d: randomSeed() };
  return { ...(appearance || DEFAULT_APPEARANCE), [group]: randomSeed() };
}

/** Стандартный вид: null или все зёрна 0. */
export const isDefaultAppearance = (a) => !a || (!a.c && !a.r && !a.d);

export const sameAppearance = (a, b) =>
  (isDefaultAppearance(a) && isDefaultAppearance(b)) || Boolean(a && b && a.c === b.c && a.r === b.r && a.d === b.d);

/** Ключ кэша текстур: slug + зёрна. */
export const appearanceKey = (slug, appearance) =>
  isDefaultAppearance(appearance) ? slug : `${slug}@${appearance.c}.${appearance.r}.${appearance.d}`;

export { BUILDINGS };
