// Модульная процедурная генерация зданий.
//
// Здание собирается из модулей по рецепту: корпус (пропорции, высота, пристройка), материал стен,
// крыша (двускатная вдоль/поперёк, вальмовая, односкатная, плоская), двери, окна, труба, реквизит.
// У каждого здания есть обязательная «подпись» (крест на воротах Сарая, лопасти мельницы, горн
// кузницы…), поэтому оно остаётся узнаваемым. Основание всегда в своих клетках.
//
// Случайность: R — форма (зерно shape), D — детали (зерно details). Цвета C = { wall, roof, window }
// задаёт игрок (палитра в окне «Внешний вид») — генератор их не меняет.
// Животные на фермах — всегда свой вид (куры, свиньи, коровы, овцы); меняется только естественная масть.
import { OUT, between, chance, pick, shade } from "./core.js";

const GRASS = "#8bc34a";
const DIRT = "#b39a6b";
const GRAVEL = "#a7a39b";
const WOOD = ["#5d4037", "#6d4c41", "#4e342e", "#795548", "#8d6e63"];

// Палитры для случайных цветов (кнопка 🎲) — подобраны, чтобы любые сочетания смотрелись спокойно
export const PALETTES = {
  wall: ["#ecd9b0", "#f3d9a4", "#d7ccc8", "#fff3e0", "#cfd8dc", "#e0c9a6", "#f5f0e1", "#d9b99b", "#c5d6b8", "#e8c4b8", "#bcaaa4", "#b3c7d6", "#b23a2e", "#8d6e63", "#a0522d", "#90a4ae"],
  roof: ["#c0392b", "#8e3b2b", "#4e342e", "#2e7d32", "#1e88e5", "#546e7a", "#6d4c41", "#d35400", "#455a64", "#6a1b9a", "#3e2723", "#00796b", "#37474f", "#795548"],
  window: ["#fafafa", "#fff8e1", "#5d4037", "#2e7d32", "#1565c0", "#b71c1c", "#37474f", "#6a1b9a", "#00695c", "#ef6c00", "#455a64"],
};

const LIGHT_WALLS = ["#ecd9b0", "#f3d9a4", "#d7ccc8", "#fff3e0", "#cfd8dc", "#e0c9a6", "#f5f0e1", "#d9b99b", "#c5d6b8", "#e8c4b8", "#b3c7d6"];
const WOODS = ["#8d5a2b", "#a0522d", "#795548", "#6d4c41", "#9c6b3f", "#b07a4a"];
const DARK_ROOFS = ["#4e342e", "#3e2723", "#455a64", "#37474f", "#5d4037", "#263238", "#6d3a2c"];
const LIGHT_TRIM = ["#fafafa", "#fff8e1", "#ffe082", "#d7ccc8"];

// Тематические палитры для 🎲: Сарай — «амбарные» цвета, каменоломня — камень, рынок — яркие тенты…
const BARN = { wall: ["#b23a2e", "#c62828", "#8d6e63", "#2e7d32", "#1565c0", "#6d4c41", "#ad1457", "#ef6c00"], roof: DARK_ROOFS, window: LIGHT_TRIM };
const TIMBER = { wall: WOODS, roof: PALETTES.roof, window: PALETTES.window };
const HOME = { wall: LIGHT_WALLS, roof: PALETTES.roof, window: PALETTES.window };

const TANKS = ["#e53935", "#c62828", "#d84315", "#ef5350"]; // баки завода соусов — всегда «томатные»
const FRUIT = ["#e53935", "#ffb300", "#7cb342", "#ff7043", "#8d6e63", "#fafafa", "#ab47bc"];

// Естественная масть животных: вид не меняется, меняется только окрас
const COATS = {
  chicken: [["#fafafa", "#fafafa"], ["#a1887f", "#8d6e63"], ["#5d4037", "#4e342e"], ["#ffcc80", "#ffb74d"]],
  pig: [["#f8a5b8", "#f48fb1"], ["#f3d0c4", "#e8b4a6"], ["#d7a49a", "#c98f84"]],
  cow: [["#fafafa", "#424242"], ["#8d6e63", "#fafafa"], ["#fafafa", "#6d4c41"], ["#5d4037", "#3e2723"]],
  sheep: [["#fafafa", "#424242"], ["#efebe9", "#5d4037"], ["#d7ccc8", "#3e2723"], ["#424242", "#212121"]],
};

// ----------------------------------------------------------------------- модули --

/**
 * Корпус здания по рецепту S. Возвращает геометрию для подписи и реквизита.
 * S: zone [r0,c0,r1,c1], height [lo,hi], materials, roofs, doors, windows,
 *    doorFace ("front"|"side"), doorAt (доля длины грани), doorSize [w,h], doorFill(C), reserve [[from,to]] (доли фасада),
 *    annex, chimney ("never"|"maybe"|"always"), z0, slack, onFront(b, ctx) — рисунок на фасаде до крыши.
 */
function structure(b, R, D, C, S) {
  let [r0, c0, r1, c1] = S.zone;
  const slack = S.slack ?? 0.12;
  r0 += between(R, 0, slack);
  c0 += between(R, 0, slack);
  r1 -= between(R, 0, slack * 0.5);
  c1 -= between(R, 0, slack);
  const annexW = S.annex && chance(R, 0.45) ? Math.min(0.7, (c1 - c0) * 0.28) : 0;
  const cm = c1 - annexW;
  const z0 = S.z0 ?? 0.06;
  const z1 = z0 + between(R, S.height[0], S.height[1]);
  const wallKind = pick(R, S.materials);
  const roofKind = pick(R, S.roofs);
  const rise = between(R, 0.3, 0.7) * Math.min(1.3, Math.max(0.55, Math.min(r1 - r0, cm - c0) * 0.55));

  b.box(r0, c0, r1, cm, z0, z1, C.wall);
  b.material("front", r1, c0, z0, cm - c0, z1 - z0, wallKind, C.wall);
  b.material("side", r1, cm, z0, r1 - r0, z1 - z0, wallKind, C.wall);
  const front = { kind: "front", r: r1, c: c0, z: z0, len: cm - c0, h: z1 - z0 };
  const side = { kind: "side", r: r1, c: cm, z: z0, len: r1 - r0, h: z1 - z0 };
  const ctx = { r0, c0, r1, c1: cm, z0, z1, front, side, wallKind, roofKind };

  // Дверь
  if (S.doors) {
    const face = S.doorFace === "side" ? side : front;
    const [dwDef, dhDef] = S.doorSize || [Math.min(0.4, face.len * 0.28), 0.55];
    const dw = Math.min(dwDef, face.len - 0.2);
    const dh = Math.min(dhDef, face.h - 0.1);
    const du = S.doorAt != null ? S.doorAt * face.len - dw / 2 : between(R, 0.12, Math.max(0.12, face.len - dw - 0.12));
    const style = pick(R, S.doors);
    b.styledDoor(face.kind, face.r, face.c, face.z, du, dw, dh, style, S.doorFill ? S.doorFill(C) : C.window, C.window);
    ctx.door = { face: face.kind, from: du, to: du + dw };
  }

  // Окна: ряд слотов на фасаде и боковой грани, без пересечения с дверью и зарезервированным местом
  const wStyle = pick(D, S.windows || ["cross"]);
  const ww = 0.26;
  const wh = Math.min(0.3, (z1 - z0) * 0.34);
  const wv = Math.max(0.2, (z1 - z0) * 0.45);
  for (const face of [front, side]) {
    const busy = [];
    if (ctx.door?.face === face.kind) busy.push([ctx.door.from - 0.12, ctx.door.to + 0.12]);
    if (face === front) for (const [a, z] of S.reserve || []) busy.push([a * face.len, z * face.len]);
    const pad = wStyle === "shutters" ? 0.2 : 0.1;
    const n = Math.floor((face.len - 0.1) / 0.6);
    for (let i = 0; i < n; i++) {
      const u = 0.1 + pad + i * ((face.len - 0.2 - 2 * pad - ww) / Math.max(1, n - 1));
      if (busy.some(([a, z]) => u + ww + pad > a && u - pad < z)) continue;
      if (!chance(D, 0.8)) continue;
      b.styledWindow(face.kind, face.r, face.c, face.z, u, wv, ww, wh, wStyle, C.window);
    }
  }

  S.onFront?.(b, ctx);

  // Крыша
  let top = z1 + rise;
  if (roofKind === "gable-c") b.gable(r0, c0, r1, cm, z1, top, C.roof, C.wall, "c");
  else if (roofKind === "gable-r") {
    b.gable(r0, c0, r1, cm, z1, top, C.roof, C.wall, "r");
    if (chance(D, 0.5) && rise > 0.35) b.styledWindow("front", r1, c0, z1, (cm - c0) / 2 - 0.1, 0.08, 0.2, 0.18, "round", C.window);
  } else if (roofKind === "hip") b.hip(r0, c0, r1, cm, z1, top, C.roof);
  else if (roofKind === "shed") {
    top = z1 + rise * 0.8;
    b.shed(r0, c0, r1, cm, z1, top, C.roof, C.wall);
  } else {
    b.flatRoof(r0, c0, r1, cm, z1, C.roof);
    top = z1 + 0.11;
    if (chance(D, 0.6)) b.box(r0 + 0.3, c0 + 0.3, r0 + 0.5, c0 + 0.5, top, top + 0.15, "#90a4ae");
  }
  ctx.top = top;

  // Пристройка с односкатной крышей
  if (annexW) {
    const az = z0 + (z1 - z0) * 0.62;
    const ar0 = r0 + (r1 - r0) * 0.3;
    b.box(ar0, cm, r1, c1, z0, az, C.wall);
    b.material("front", r1, cm, z0, c1 - cm, az - z0, wallKind, C.wall);
    b.material("side", r1, c1, z0, r1 - ar0, az - z0, wallKind, C.wall);
    if (r1 - ar0 > 0.5) b.styledWindow("side", r1, c1, z0, (r1 - ar0) / 2 - 0.12, (az - z0) * 0.4, 0.24, Math.min(0.24, (az - z0) * 0.35), wStyle, C.window);
    b.shed(ar0, cm, r1, c1, az, az + 0.18, C.roof, C.wall, 0.08);
  }

  // Труба
  if (S.chimney === "always" || (S.chimney === "maybe" && chance(D, 0.6))) {
    const cr = r0 + (r1 - r0) * between(D, 0.2, 0.4);
    const cc = c0 + (cm - c0) * between(D, 0.55, 0.8);
    const ctop = top + 0.3;
    b.box(cr, cc, cr + 0.22, cc + 0.22, z1 - 0.1, ctop, S.chimneyColor || "#8d6e63");
    if (S.smoke !== false) b.smoke(cr + 0.11, cc + 0.11, ctop);
    ctx.chimney = { r: cr + 0.11, c: cc + 0.11, z: ctop };
  }
  return ctx;
}

// Реквизит
const barrel = (b, r, c) => b.cyl(r, c, 0.11, 0.06, 0.32, "#8d5a2b", "#a1887f");
const hay = (b, r, c) => b.cyl(r, c, 0.13, 0.06, 0.3, "#e6c76a");
function crate(b, r, c, fill, size = 0.3) {
  b.box(r, c, r + size, c + size, 0.06, 0.26, "#b0884f");
  if (fill) b.ellipseGround(r + size / 2, c + size / 2, size * 0.32, 0.29, fill, OUT, 0.8);
}
const sack = (b, r, c) => b.ellipseGround(r, c, 0.1, 0.14, "#d7ccc8", OUT, 0.8);

/** Несколько предметов на свободных местах: spots — [r, c], kinds — какие предметы можно ставить. */
function props(b, D, spots, kinds, max = spots.length) {
  const n = Math.min(max, Math.floor(D() * (spots.length + 1)));
  spots.slice(0, n).forEach(([r, c]) => {
    const k = pick(D, kinds);
    if (k === "barrel") barrel(b, r, c);
    else if (k === "hay") hay(b, r, c);
    else if (k === "crate") crate(b, r - 0.15, c - 0.15, pick(D, FRUIT));
    else if (k === "sack") sack(b, r, c);
    else if (k === "bush") b.bush(r, c, pick(D, ["#e57373", "#ffb300", "#ba68c8", "#f06292", "#fff176"]));
  });
}

/** Забор выбранного стиля по отрезку на земле. */
function fence(b, style, r0, c0, r1, c1, color) {
  if (style === "stone") {
    const rr0 = Math.min(r0, r1) - (r0 === r1 ? 0.08 : 0);
    const cc0 = Math.min(c0, c1) - (c0 === c1 ? 0.08 : 0);
    b.box(rr0, cc0, Math.max(r0, r1) + (r0 === r1 ? 0.08 : 0), Math.max(c0, c1) + (c0 === c1 ? 0.08 : 0), 0.06, 0.26, "#9e9e9e", null, 1);
  } else if (style === "picket") {
    const n = Math.max(2, Math.floor(Math.hypot(r1 - r0, c1 - c0) / 0.14) + 1);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const r = r0 + (r1 - r0) * t;
      const c = c0 + (c1 - c0) * t;
      b.line(b.P(r, c, 0.04), b.P(r, c, 0.3), color, 2);
    }
    b.line(b.P(r0, c0, 0.2), b.P(r1, c1, 0.2), shade(color, 0.8), 1.4);
  } else if (style === "wattle") {
    for (const z of [0.08, 0.15, 0.22]) b.line(b.P(r0, c0, z), b.P(r1, c1, z), shade(color, z > 0.12 ? 1 : 0.85), 2.2);
  } else {
    b.fence(r0, c0, r1, c1, color);
  }
}

/** Животные одного вида в загоне [r0,c0,r1,c1]; масть у каждого своя, из естественных окрасов вида. */
function herd(b, D, species, [r0, c0, r1, c1], min, max) {
  const spots = [];
  for (let r = r0; r <= r1; r += 0.5) for (let c = c0; c <= c1; c += 0.6) spots.push([r + between(D, -0.08, 0.08), c + between(D, -0.1, 0.1)]);
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(D() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  const n = Math.min(spots.length, min + Math.floor(D() * (max - min + 1)));
  spots.slice(0, n).sort((a, b2) => a[0] + a[1] - (b2[0] + b2[1])).forEach(([r, c]) => {
    const [body, head] = pick(D, COATS[species]);
    if (species === "chicken") {
      b.animal(r, c, body, head, "#f9a825", { k: 0.7, comb: "#e53935" });
    } else if (species === "pig") b.animal(r, c, body, head, "#c2185b");
    else if (species === "cow") b.animal(r, c, body, body, "#424242", { k: 1.25, spots: [[-0.08, -0.02], [0.07, 0.03]], spotColor: head });
    else b.animal(r, c, body, head, "#424242", { fluffy: true });
  });
}

const MATERIALS_HOME = ["plaster", "planks", "logs", "brick", "stone"];
const ROOFS_ALL = ["gable-c", "gable-r", "hip", "shed", "flat"];
const ROOFS_PITCHED = ["gable-c", "gable-r", "hip", "shed"];

// ======================================================================= рецепты ==
// slots — подписи трёх цветов в окне «Внешний вид» (стены, крыша, окна и двери).
const HOME_SLOTS = { wall: "slot.walls", roof: "slot.roof", window: "slot.windowsDoors" };

export const RECIPES = {
  house: {
    size: [2, 3, 2.2],
    slots: HOME_SLOTS,
    palette: HOME,
    compose(b, R, D, C) {
      b.plate(GRASS);
      structure(b, R, D, C, {
        zone: [0.3, 0.25, 2.55, 1.75], height: [0.75, 1.1], materials: MATERIALS_HOME, roofs: ROOFS_PITCHED,
        doors: ["plain", "arched", "double"], windows: ["cross", "shutters", "arched"], chimney: "maybe",
      });
      props(b, D, [[2.8, 0.45], [2.8, 1.45]], ["bush", "bush", "barrel"]);
    },
  },

  warehouse: {
    size: [5, 5, 2.8],
    slots: { wall: "slot.walls", roof: "slot.roof", window: "slot.gatesWindows" },
    palette: { wall: ["#8fa5b8", "#90a4ae", "#b0bec5", "#78909c", "#a5b4a0", "#c8b89a", "#a1887f", "#b23a2e"], roof: DARK_ROOFS, window: ["#4b5a69", "#5d4037", "#37474f", "#1b5e20", "#7f2b1f", "#1565c0"] },
    compose(b, R, D, C) {
      b.plate(GRAVEL);
      structure(b, R, D, C, {
        zone: [0.35, 0.35, 3.8, 4.65], height: [1.3, 1.85], materials: ["metal", "planks", "brick"], roofs: ROOFS_ALL,
        doors: ["gate"], doorSize: [1.3, 1.05], doorAt: between(R, 0.35, 0.6), windows: ["cross"], annex: true, chimney: "never",
      });
      props(b, D, [[4.3, 0.75], [4.3, 1.25], [4.35, 2.4], [4.35, 3.6], [4.3, 4.2]], ["crate", "barrel", "crate"]);
    },
  },

  barn: {
    size: [2, 2, 1.9],
    slots: { wall: "slot.walls", roof: "slot.roof", window: "slot.gateTrim" },
    palette: BARN,
    compose(b, R, D, C) {
      b.plate(DIRT);
      structure(b, R, D, C, {
        zone: [0.25, 0.25, 1.7, 1.75], height: [0.75, 1.0], materials: ["planks", "planks", "logs", "brick"],
        roofs: ["gable-c", "gable-r", "hip"], doors: ["barn"], doorSize: [0.6, 0.62], doorAt: 0.42,
        doorFill: (C2) => shade(C2.wall, 0.7), windows: ["cross", "round"], chimney: "never", slack: 0.08,
      });
      if (chance(D, 0.7)) hay(b, 1.88, 1.75);
    },
  },

  lumberjack_hut: {
    size: [2, 2, 1.7],
    slots: HOME_SLOTS,
    palette: TIMBER,
    compose(b, R, D, C) {
      b.plate("#7cb342");
      structure(b, R, D, C, {
        zone: [0.2, 0.2, 1.25, 1.45], height: [0.6, 0.85], materials: ["logs", "logs", "planks"], roofs: ["gable-c", "gable-r", "shed"],
        doors: ["plain"], windows: ["cross", "shutters"], chimney: "maybe", slack: 0.08,
      });
      // подпись: поленница и пень с топором
      const len = between(D, 0.55, 0.85);
      b.box(1.45, 0.25, 1.85, 0.25 + len, 0.06, between(D, 0.28, 0.42), "#a0522d");
      b.onFace("side", 1.85, 0.25 + len, 0.06, [[0.1, 0.08], [0.25, 0.08], [0.175, 0.22]]
        .map(([u, v]) => `<circle cx="${u}" cy="${v}" r="0.07" fill="#deb887" stroke="${OUT}" stroke-width="0.8" NS/>`).join(""));
      b.cyl(1.6, 1.6, 0.16, 0.06, 0.25, "#8d6e63", "#e3c08a");
      b.sprite(1.6, 1.6, 0.25, [0.45, 0.5, 0.08], { kind: "chop", amp: 0.12 * b.a }, () => {
        const [x, y] = b.P(1.6, 1.6, 0.25);
        b.line([x - 2, y], [x + 0.25 * b.a, y - 0.35 * b.a], "#6d4c41", 2.2);
        b.poly([[x + 0.18 * b.a, y - 0.4 * b.a], [x + 0.34 * b.a, y - 0.36 * b.a], [x + 0.3 * b.a, y - 0.24 * b.a]], "#b0bec5", OUT, 1);
      });
      b.emit("chips", 1.6, 1.6, 0.3);
    },
  },

  quarry: {
    size: [3, 3, 2.0],
    slots: { wall: "slot.stone", roof: "slot.craneWood", window: "slot.cart" },
    palette: { wall: ["#9e9e9e", "#a1887f", "#b0a999", "#8d8d8d", "#bcaaa4", "#90a4ae", "#c2b280"], roof: WOOD, window: [...WOOD, "#607d8b", "#546e7a"] },
    compose(b, R, D, C) {
      b.plate(GRAVEL);
      const tiers = 2 + Math.floor(R() * 3);
      let [r1, c1, z] = [2.3, 2.6, 0.06];
      for (let i = 0; i < tiers; i++) {
        const h = between(R, 0.25, 0.4);
        b.box(0.15, 0.15, r1, c1, z, z + h, shade(C.wall, 1 - i * 0.1));
        if (chance(D, 0.6)) b.ellipseGround(r1 - 0.35, c1 - 0.4, 0.07, z + h, "#6f6f6f", OUT, 0.6);
        z += h;
        r1 = 0.15 + (r1 - 0.15) * between(R, 0.55, 0.75);
        c1 = 0.15 + (c1 - 0.15) * between(R, 0.55, 0.75);
      }
      b.box(2.0, 0.25, 2.3, 0.55, 0.06, 0.32, shade(C.wall, 1.25));
      if (chance(D, 0.8)) {
        b.line(b.P(2.45, 2.55, 0.06), b.P(2.45, 2.55, 1.4), C.roof, 3);
        b.line(b.P(2.45, 2.55, 1.35), b.P(2.0, 1.9, 1.25), C.roof, 2.4);
        b.sprite(2.0, 1.9, 0.72, [0.25, 0.6, 0.35], { kind: "lift", amp: 0.12 * b.a }, () => {
          b.line(b.P(2.0, 1.9, 1.25), b.P(2.0, 1.9, 0.75), "#424242", 1);
          b.box(1.92, 1.82, 2.08, 1.98, 0.55, 0.72, shade(C.wall, 1.3));
        });
      }
      b.emit("dust", 2.05, 0.4, 0.4);
      if (chance(D, 0.8)) {
        b.box(2.45, 0.6, 2.8, 1.25, 0.12, 0.38, C.window);
        b.box(2.5, 0.68, 2.75, 1.17, 0.38, 0.48, shade(C.wall, 1.2));
        b.onFace("front", 2.8, 0.6, 0.12, [0.15, 0.5].map((u) => `<circle cx="${u}" cy="0" r="0.09" fill="#37474f" stroke="${OUT}" stroke-width="0.8" NS/>`).join(""));
      }
    },
  },

  mine: {
    size: [3, 3, 1.9],
    slots: { wall: "slot.rock", roof: "slot.supports", window: "slot.minecart" },
    palette: { wall: ["#7b6a58", "#6d6d6d", "#8d7b68", "#5d4e3f", "#7a6f62", "#6f5f52"], roof: WOODS, window: ["#607d8b", "#8d6e63", "#546e7a", "#795548", "#455a64"] },
    compose(b, R, D, C) {
      b.plate("#9c8a72");
      const tiers = 2 + Math.floor(R() * 2);
      let [r1, c1, z] = [2.25, 2.7, 0.06];
      const h1 = between(R, 0.75, 0.95);
      for (let i = 0; i < tiers; i++) {
        const h = i === 0 ? h1 : between(R, 0.25, 0.5);
        b.box(0.1, 0.1, r1, c1, z, z + h, shade(C.wall, 1 - i * 0.1));
        z += h;
        r1 = 0.1 + (r1 - 0.1) * between(R, 0.55, 0.7);
        c1 = 0.1 + (c1 - 0.1) * between(R, 0.55, 0.7);
      }
      const tu = between(R, 0.6, 1.2);
      const th = Math.min(0.62, h1 - 0.15);
      b.onFace("front", 2.25, 0.1, 0.06,
        `<rect x="${tu + 0.05}" y="0" width="0.75" height="${th}" fill="#141414" stroke="${OUT}" stroke-width="1" NS/>` +
        `<rect x="${tu}" y="0" width="0.1" height="${th + 0.06}" fill="${C.roof}" stroke="${OUT}" stroke-width="1" NS/>` +
        `<rect x="${tu + 0.75}" y="0" width="0.1" height="${th + 0.06}" fill="${C.roof}" stroke="${OUT}" stroke-width="1" NS/>` +
        `<rect x="${tu - 0.05}" y="${th}" width="0.95" height="0.1" fill="${C.roof}" stroke="${OUT}" stroke-width="1" NS/>` +
        (chance(D, 0.7) ? `<circle cx="${tu + 1.05}" cy="${th * 0.8}" r="0.06" fill="#ffb300" stroke="${OUT}" stroke-width="0.8" NS/>` : ""));
      b.emit("glow", 2.25, 0.1 + tu + 0.42, 0.06 + th * 0.5, { size: 0.3, color: 0xffb300 });
      const cm = 0.1 + tu + 0.42;
      for (const c of [cm - 0.17, cm + 0.17]) b.line(b.P(2.25, c, 0.07), b.P(2.95, c, 0.07), "#5d4037", 1.6);
      for (const r of [2.4, 2.6, 2.8]) b.line(b.P(r, cm - 0.25, 0.07), b.P(r, cm + 0.25, 0.07), "#795548", 1.4);
      if (chance(D, 0.8)) {
        b.sprite(2.6, cm, 0.3, [0.45, 0.4, 0.35], { kind: "shuttle", vec: b.delta([2.6, cm, 0], [2.3, cm, 0]), period: 3 }, () => {
          b.box(2.4, cm - 0.25, 2.8, cm + 0.25, 0.1, 0.38, C.window);
          const [x, y] = b.P(2.6, cm, 0.38);
          for (const [dx, dy, col] of [[-0.1, 0, "#424242"], [0.08, -0.02, "#5d4037"], [0, -0.07, "#ff8f00"]]) {
            b.raw(`<circle cx="${(x + dx * b.a).toFixed(2)}" cy="${(y + dy * b.a).toFixed(2)}" r="${(0.07 * b.a).toFixed(2)}" fill="${col}" stroke="${OUT}" stroke-width="0.8"/>`);
          }
        });
      }
    },
  },

  water_mill: {
    size: [2, 2, 1.8],
    slots: HOME_SLOTS,
    palette: HOME,
    compose(b, R, D, C) {
      b.plate(GRASS);
      b.box(0.0, 1.5, 2.0, 2.0, 0.0, 0.07, "#4fa3e0", "#64b5f6", 0.8);
      const ctx = structure(b, R, D, C, {
        zone: [0.3, 0.2, 1.6, 1.38], height: [0.65, 0.9], materials: ["stone", "plaster", "planks", "logs"], roofs: ROOFS_PITCHED,
        doors: ["plain", "arched"], windows: ["cross", "shutters"], chimney: "never", slack: 0.08,
      });
      // подпись: водяное колесо у воды
      const wheel = pick(D, WOOD);
      const zc = Math.min(0.45, ctx.z1 - 0.1);
      const angles = [...Array(8).keys()].map((i) => (i * Math.PI) / 4);
      b.rotor("side", 0.95, 1.55, zc, 0.5,
        `<circle cx="0" cy="0" r="0.45" fill="none" stroke="${wheel}" stroke-width="3" NS/>` +
        angles.map((t) => `<line x1="0" y1="0" x2="${(0.45 * Math.cos(t)).toFixed(3)}" y2="${(0.45 * Math.sin(t)).toFixed(3)}" stroke="${wheel}" stroke-width="1.4" NS/>`).join("") +
        angles.map((t) => `<rect x="${(0.42 * Math.cos(t) - 0.05).toFixed(3)}" y="${(0.42 * Math.sin(t) - 0.05).toFixed(3)}" width="0.1" height="0.1" fill="#8d6e63" stroke="${OUT}" stroke-width="0.8" NS/>`).join("") +
        `<circle cx="0" cy="0" r="0.07" fill="#4e342e" NS/>`, { symmetry: 45, period: 1.4 });
    },
  },

  sawmill: {
    size: [3, 2, 1.9],
    slots: { wall: "slot.logsTable", roof: "slot.canopy", window: "slot.posts" },
    palette: { wall: WOODS, roof: [...DARK_ROOFS, "#2e7d32", "#c0392b", "#8d6e63"], window: WOOD },
    compose(b, R, D, C) {
      b.plate(DIRT);
      const z1 = between(R, 0.9, 1.15);
      const [r0, c0, r1, c1] = [0.3, 0.3, between(R, 1.35, 1.51), between(R, 2.2, 2.39)];
      for (const [r, c] of [[r0, c0], [r0, c1 - 0.09], [r1 - 0.09, c0], [r1 - 0.09, c1 - 0.09]]) b.box(r, c, r + 0.09, c + 0.09, 0.06, z1, C.window);
      b.box(0.65, 0.5, 1.1, 2.1, 0.06, 0.42, shade(C.wall, 1.15));
      b.box(0.75, 0.6, 1.0, 2.0, 0.42, 0.62, C.wall);
      b.rotor("front", 0.95, 1.3, 0.55, 0.3,
        `<circle cx="0" cy="0" r="0.26" fill="#cfd8dc" stroke="${OUT}" stroke-width="1" NS/>` +
        [...Array(8).keys()].map((i) => `<line x1="0" y1="0" x2="${(0.24 * Math.cos((i * Math.PI) / 4)).toFixed(3)}" y2="${(0.24 * Math.sin((i * Math.PI) / 4)).toFixed(3)}" stroke="#90a4ae" stroke-width="0.8" NS/>`).join("") +
        `<circle cx="0" cy="0" r="0.05" fill="#607d8b" NS/>`, { symmetry: 45, period: 0.25 });
      b.emit("chips", 0.95, 1.45, 0.6);
      const rise = between(R, 0.3, 0.6);
      const kind = pick(R, ["gable-c", "gable-r", "hip", "shed"]);
      if (kind === "hip") b.hip(r0, c0, r1, c1, z1, z1 + rise, C.roof);
      else if (kind === "shed") b.shed(r0, c0, r1, c1, z1, z1 + rise * 0.8, C.roof, C.roof);
      else b.gable(r0, c0, r1, c1, z1, z1 + rise, C.roof, C.roof, kind === "gable-c" ? "c" : "r");
      const planks = 1 + Math.floor(D() * 4);
      for (let i = 0; i < planks; i++) b.box(1.62, 0.35, 1.92, 1.65, 0.06 + i * 0.12, 0.18 + i * 0.12, "#deb887");
      if (chance(D, 0.5)) for (const [rr, cc] of [[1.75, 2.1], [1.75, 2.45]]) b.cyl(rr, cc, 0.1, 0.06, 0.26, "#8d5a2b", "#deb887");
    },
  },

  stonecutter_hut: {
    size: [2, 2, 1.7],
    slots: HOME_SLOTS,
    palette: { wall: ["#a0a4a8", "#9e9e9e", "#b0a999", "#90a4ae", "#a1887f", "#bdb6a8"], roof: PALETTES.roof, window: PALETTES.window },
    compose(b, R, D, C) {
      b.plate(GRAVEL);
      structure(b, R, D, C, {
        zone: [0.25, 0.25, 1.3, 1.75], height: [0.6, 0.85], materials: ["stone", "stone", "brick", "plaster"], roofs: ROOFS_PITCHED,
        doors: ["plain", "arched"], windows: ["cross", "round"], chimney: "never", slack: 0.08,
      });
      const stone = pick(D, ["#d5d8da", "#e0d6c8", "#cfd8dc", "#d7ccc8"]);
      const blocks = [[1.45, 0.3, 0.06], [1.45, 0.75, 0.06], [1.45, 0.52, 0.36], [1.5, 1.35, 0.06]];
      blocks.slice(0, 1 + Math.floor(D() * 4)).forEach(([r0, c0, z0]) => b.box(r0, c0, r0 + 0.35, c0 + 0.35, z0, z0 + 0.3, stone));
      b.emit("dust", 1.62, 0.5, 0.4);
    },
  },

  blacksmith: {
    size: [3, 3, 2.6],
    slots: HOME_SLOTS,
    palette: { wall: ["#6f6a66", "#5d5d5d", "#7b6f63", "#4e4a47", "#6d6d6d", "#8d8d8d"], roof: DARK_ROOFS, window: ["#4e342e", "#3e2723", "#37474f", "#5d4037", "#fafafa"] },
    compose(b, R, D, C) {
      b.plate(GRAVEL);
      const ctx = structure(b, R, D, C, {
        zone: [0.3, 0.3, 2.0, 2.4], height: [0.85, 1.15], materials: ["stone", "brick", "stone"], roofs: ROOFS_PITCHED,
        doors: ["plain", "double"], doorFace: "side", windows: ["cross", "arched"], reserve: [[0.1, 0.65]], chimney: "never",
        onFront: (bb, c) => bb.onFace("front", c.front.r, c.front.c, c.z0,
          `<rect x="${(c.front.len * 0.2).toFixed(2)}" y="0.12" width="0.7" height="0.45" fill="#ff8f00" stroke="${OUT}" stroke-width="1.2" NS/>` +
          `<rect x="${(c.front.len * 0.2 + 0.1).toFixed(2)}" y="0.17" width="0.5" height="0.2" fill="#ffd54f" NS/>`),
      });
      b.emit("glow", ctx.front.r, ctx.front.c + ctx.front.len * 0.2 + 0.35, ctx.z0 + 0.35, { size: 0.35, color: 0xff8f00 });
      // подпись: большая труба горна с огнём и наковальня
      const top = ctx.top + 0.45;
      b.box(0.6, ctx.c1 - 0.65, 1.0, ctx.c1 - 0.25, ctx.z1 - 0.1, top, shade(C.wall, 0.8));
      b.ellipseGround(0.8, ctx.c1 - 0.45, 0.12, top, "#ff7043", OUT, 0.8);
      b.smoke(0.8, ctx.c1 - 0.45, top);
      b.box(2.3, 1.0, 2.5, 1.45, 0.06, 0.2, "#424242");
      b.box(2.25, 0.9, 2.55, 1.6, 0.2, 0.34, "#546e7a");
      props(b, D, [[2.55, 2.2], [2.7, 0.45]], ["barrel", "crate"]);
    },
  },

  mill: {
    size: [2, 2, 2.9],
    slots: HOME_SLOTS,
    palette: HOME,
    compose(b, R, D, C) {
      b.plate(GRASS);
      const half = between(R, 0.38, 0.48);
      const [r0, c0, r1, c1] = [1 - half, 1 - half, 1 + half, 1 + half];
      const z1 = 0.06 + between(R, 1.2, 1.65);
      const wallKind = pick(R, ["plaster", "stone", "planks", "brick"]);
      b.box(r0, c0, r1, c1, 0.06, z1, C.wall);
      b.material("front", r1, c0, 0.06, c1 - c0, z1 - 0.06, wallKind, C.wall);
      b.material("side", r1, c1, 0.06, r1 - r0, z1 - 0.06, wallKind, C.wall);
      b.styledDoor("front", r1, c0, 0.06, (c1 - c0) / 2 - 0.15, 0.3, 0.45, pick(R, ["plain", "arched"]), C.window);
      const wStyle = pick(D, ["cross", "round", "shutters"]);
      const nWin = 1 + Math.floor(D() * 2);
      for (let i = 0; i < nWin; i++) b.styledWindow("side", r1, c1, 0.06, (r1 - r0) / 2 - 0.12, 0.6 + i * 0.4, 0.24, 0.22, wStyle, C.window);
      const rise = between(R, 0.7, 1.0);
      if (chance(R, 0.5)) b.cone(1, 1, half + 0.15, z1, z1 + rise, C.roof);
      else b.hip(r0, c0, r1, c1, z1, z1 + rise, C.roof);
      // подпись: лопасти
      const blades = pick(D, ["#fafafa", "#ffe0b2", "#d7ccc8", "#fff8e1"]);
      const turn = Math.round(between(R, 0, 90));
      const svg = [0, 90, 180, 270].map((d) => d + turn).map((ang) =>
        `<g transform="rotate(${ang})"><rect x="0.06" y="-0.09" width="0.85" height="0.18" fill="${blades}" stroke="${OUT}" stroke-width="1" NS/>` +
        [1, 2, 3, 4].map((k) => `<line x1="${(0.06 + 0.17 * k).toFixed(2)}" y1="-0.09" x2="${(0.06 + 0.17 * k).toFixed(2)}" y2="0.09" stroke="#9e9e9e" stroke-width="0.7" NS/>`).join("") +
        "</g>").join("");
      b.rotor("front", r1 + 0.05, 1.0, z1 - 0.1, 0.95, svg + `<circle cx="0" cy="0" r="0.08" fill="#5d4037" stroke="${OUT}" stroke-width="1" NS/>`, { symmetry: 90, period: 2.2 });
      props(b, D, [[1.75, 0.35], [1.75, 1.7]], ["bush", "sack", "sack"]);
    },
  },

  bakery: {
    size: [3, 3, 2.3],
    slots: HOME_SLOTS,
    palette: HOME,
    compose(b, R, D, C) {
      b.plate("#c8b08a");
      structure(b, R, D, C, {
        zone: [0.3, 0.3, 2.2, 2.5], height: [0.85, 1.1], materials: ["plaster", "brick", "planks", "stone"], roofs: ROOFS_PITCHED,
        doors: ["plain", "arched"], doorAt: 0.75, windows: ["cross", "shutters", "arched"], reserve: [[0.05, 0.6]], chimney: "always",
        onFront: (bb, c) => {
          const stripes = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${(0.2 + i * 0.18).toFixed(2)}" y="0.62" width="0.18" height="0.12" fill="${i % 2 ? "#fafafa" : C.window}" stroke="${OUT}" stroke-width="0.8" NS/>`).join("");
          bb.onFace("front", c.front.r, c.front.c, c.z0,
            `<rect x="0.25" y="0.15" width="0.8" height="0.45" fill="#9ad7ff" stroke="${C.window}" stroke-width="1.6" NS/>` +
            `<ellipse cx="0.65" cy="0.32" rx="0.22" ry="0.09" fill="#d4a056" stroke="${OUT}" stroke-width="0.9" NS/>` + stripes);
        },
      });
      props(b, D, [[2.5, 2.25], [2.45, 0.35], [2.6, 1.2]], ["bush", "sack", "crate"]);
    },
  },

  sauce_factory: {
    size: [4, 3, 2.5],
    slots: HOME_SLOTS,
    palette: { wall: ["#b5533c", "#a1452e", "#8d6e63", "#c26a4a", "#9e4b3a", "#b0a999"], roof: DARK_ROOFS, window: PALETTES.window },
    compose(b, R, D, C) {
      b.plate("#b0b0b0");
      structure(b, R, D, C, {
        zone: [0.3, 0.3, 2.4, 2.6], height: [0.9, 1.2], materials: ["brick", "brick", "metal", "plaster"], roofs: ROOFS_ALL,
        doors: ["double", "plain"], doorAt: 0.6, doorSize: [0.45, 0.6], windows: ["cross", "arched"], reserve: [[0.78, 0.98]], chimney: "maybe",
        chimneyColor: "#9e9e9e", smoke: true,
        onFront: (bb, c) => bb.onFace("front", c.front.r, c.front.c, c.z0,
          `<circle cx="${(c.front.len * 0.88).toFixed(2)}" cy="0.72" r="0.18" fill="#e53935" stroke="${OUT}" stroke-width="1" NS/>` +
          `<path d="M${(c.front.len * 0.88 - 0.05).toFixed(2)},0.88 L${(c.front.len * 0.88).toFixed(2)},0.97 L${(c.front.len * 0.88 + 0.06).toFixed(2)},0.88 Z" fill="#43a047" stroke="${OUT}" stroke-width="0.7" NS/>`),
      });
      // подпись: «томатные» баки
      const n = 1 + Math.floor(R() * 3);
      const tank = pick(D, TANKS);
      [[0.9, 3.3], [2.05, 3.3], [1.45, 3.45]].slice(0, n).sort((a, b2) => a[0] - b2[0]).forEach(([r, c]) => b.cyl(r, c, between(R, 0.3, 0.38), 0.06, between(R, 1.1, 1.5), tank, shade(tank, 1.45)));
      if (chance(D, 0.7)) b.line(b.P(1.4, 2.6, 0.8), b.P(1.4, 3.0, 0.8), "#757575", 3);
    },
  },

  butter_factory: {
    size: [4, 3, 2.4],
    slots: HOME_SLOTS,
    palette: HOME,
    compose(b, R, D, C) {
      b.plate("#cfd8dc");
      structure(b, R, D, C, {
        zone: [0.3, 0.3, 2.4, 2.6], height: [0.85, 1.15], materials: ["plaster", "metal", "brick"], roofs: ROOFS_ALL,
        doors: ["double", "plain"], doorAt: 0.58, doorSize: [0.45, 0.6], windows: ["cross", "shutters"], reserve: [[0.76, 0.96]], chimney: "never",
        onFront: (bb, c) => bb.onFace("front", c.front.r, c.front.c, c.z0,
          `<rect x="${(c.front.len * 0.79).toFixed(2)}" y="0.55" width="0.38" height="0.22" fill="#ffe082" stroke="${OUT}" stroke-width="1" NS/>` +
          `<rect x="${(c.front.len * 0.79).toFixed(2)}" y="0.55" width="0.38" height="0.07" fill="#ffca28" stroke="${OUT}" stroke-width="0.7" NS/>`),
      });
      // подпись: силосы для молока
      const n = 1 + Math.floor(R() * 3);
      const silo = pick(D, ["#eceff1", "#cfd8dc", "#fff8e1", "#e0e0e0"]);
      [[0.85, 3.3], [2.0, 3.3], [1.42, 3.5]].slice(0, n).sort((a, b2) => a[0] - b2[0]).forEach(([r, c]) => {
        const h = between(R, 1.2, 1.6);
        b.cyl(r, c, 0.36, 0.06, h, silo);
        b.cone(r, c, 0.36, h, h + 0.4, C.roof);
        b.emit("steam", r, c, h + 0.4);
      });
      if (chance(D, 0.7)) b.cyl(2.7, 1.85, 0.1, 0.06, 0.32, "#b0bec5", "#eceff1");
    },
  },

  "chicken-coop": {
    size: [2, 2, 1.6],
    slots: HOME_SLOTS,
    palette: { wall: [...WOODS, "#c97b4a", "#e0c9a6", "#b23a2e"], roof: PALETTES.roof, window: LIGHT_TRIM },
    compose(b, R, D, C) {
      b.plate("#e6c76a");
      const style = pick(R, ["rail", "picket", "wattle"]);
      fence(b, style, 0.05, 1.95, 1.95, 1.95, "#8d6e63");
      for (const [r, c] of [[1.0, 0.3], [1.0, 1.25], [0.3, 1.25]]) b.box(r, c, r + 0.07, c + 0.07, 0.06, 0.3, "#5d4037");
      structure(b, R, D, C, {
        zone: [0.3, 0.3, 1.05, 1.3], z0: 0.3, height: [0.4, 0.55], materials: ["planks", "logs", "planks"], roofs: ROOFS_PITCHED,
        windows: ["round"], chimney: "never", slack: 0.04,
        onFront: (bb, c) => bb.onFace("front", c.front.r, c.front.c, c.z0, `<rect x="${(c.front.len * 0.4).toFixed(2)}" y="0.02" width="0.2" height="0.22" fill="#3e2723" stroke="${OUT}" stroke-width="1" NS/>`),
      });
      b.poly([b.P(1.05, 0.7, 0.3), b.P(1.05, 0.9, 0.3), b.P(1.5, 0.9, 0.06), b.P(1.5, 0.7, 0.06)], "#a1887f", OUT, 1);
      fence(b, style, 1.95, 0.05, 1.95, 1.95, "#8d6e63");
      herd(b, D, "chicken", [1.3, 0.35, 1.75, 1.6], 1, 4);
    },
  },

  pigsty: {
    size: [3, 3, 1.6],
    slots: HOME_SLOTS,
    palette: { wall: [...WOODS, "#c48b5a", "#d9b99b"], roof: PALETTES.roof, window: LIGHT_TRIM },
    compose(b, R, D, C) {
      b.plate("#8d6e4a");
      if (chance(D, 0.75)) b.ellipseGround(between(D, 1.7, 2.1), between(D, 1.2, 1.8), between(D, 0.3, 0.45), 0.07, "#5d4033", OUT, 0.8);
      structure(b, R, D, C, {
        zone: [0.25, 0.25, 1.2, 2.0], height: [0.55, 0.75], materials: ["planks", "logs", "brick"], roofs: ROOFS_PITCHED,
        doors: ["plain"], doorFill: () => "#3e2723", doorSize: [0.4, 0.42], windows: ["cross"], chimney: "never", slack: 0.06,
      });
      const style = pick(R, ["rail", "picket", "wattle", "stone"]);
      fence(b, style, 0.1, 2.85, 2.85, 2.85, "#8d6e63");
      herd(b, D, "pig", [1.45, 0.45, 2.55, 2.4], 1, 4);
      fence(b, style, 2.85, 0.1, 2.85, 2.85, "#8d6e63");
    },
  },

  cowshed: {
    size: [4, 4, 2.6],
    slots: { wall: "slot.walls", roof: "slot.roof", window: "slot.gateTrim" },
    palette: BARN,
    compose(b, R, D, C) {
      b.plate(DIRT);
      structure(b, R, D, C, {
        zone: [0.3, 0.3, 2.5, 2.9], height: [0.95, 1.25], materials: ["planks", "planks", "brick", "logs"], roofs: ["gable-c", "gable-r", "hip"],
        doors: ["barn"], doorSize: [0.8, 0.8], doorAt: 0.5, doorFill: (C2) => shade(C2.wall, 0.72), windows: ["cross", "round"], chimney: "never",
      });
      if (chance(D, 0.75)) {
        b.cyl(0.9, 3.4, 0.42, 0.06, 1.9, "#b0bec5");
        b.cone(0.9, 3.4, 0.42, 1.9, 2.25, C.roof);
      }
      const style = pick(R, ["rail", "picket", "stone"]);
      fence(b, style, 3.85, 0.15, 3.85, 3.85, "#8d6e63");
      herd(b, D, "cow", [2.85, 0.6, 3.6, 3.5], 1, 4);
    },
  },

  sheepfold: {
    size: [3, 3, 1.6],
    slots: HOME_SLOTS,
    palette: { wall: [...WOODS, "#bca07a", "#d9b99b"], roof: PALETTES.roof, window: LIGHT_TRIM },
    compose(b, R, D, C) {
      b.plate(GRASS);
      structure(b, R, D, C, {
        zone: [0.25, 0.25, 1.2, 1.8], height: [0.5, 0.7], materials: ["planks", "stone", "logs"], roofs: ROOFS_PITCHED,
        doors: ["plain"], doorFill: () => "#4e342e", doorSize: [0.38, 0.4], windows: ["cross"], chimney: "never", slack: 0.06,
      });
      const style = pick(R, ["stone", "rail", "wattle"]);
      fence(b, style, 0.1, 2.83, 2.75, 2.83, "#8d6e63");
      herd(b, D, "sheep", [1.45, 0.5, 2.4, 2.2], 2, 5);
      fence(b, style, 2.83, 0.1, 2.83, 2.83, "#8d6e63");
    },
  },

  shop: {
    size: [3, 3, 2.2],
    slots: { wall: "slot.walls", roof: "slot.roofSign", window: "slot.windowsAwning" },
    palette: HOME,
    compose(b, R, D, C) {
      b.plate("#c8b08a");
      const ctx = structure(b, R, D, C, {
        zone: [0.3, 0.3, 1.9, 2.6], height: [0.85, 1.1], materials: ["plaster", "planks", "brick"], roofs: ROOFS_PITCHED,
        doors: ["plain", "double", "arched"], doorAt: 0.82, windows: ["cross", "shutters"], reserve: [[0.05, 0.62]], chimney: "maybe",
        onFront: (bb, c) => bb.onFace("front", c.front.r, c.front.c, c.z0,
          `<rect x="0.2" y="0.12" width="0.95" height="0.5" fill="#9ad7ff" stroke="${C.window}" stroke-width="1.6" NS/>` +
          `<circle cx="0.45" cy="0.3" r="0.08" fill="#e53935" NS/><circle cx="0.7" cy="0.27" r="0.08" fill="#ffb300" NS/><circle cx="0.95" cy="0.3" r="0.08" fill="#7cb342" NS/>` +
          `<rect x="0.55" y="${(c.front.h - 0.22).toFixed(2)}" width="1.2" height="0.18" fill="${C.roof}" stroke="${OUT}" stroke-width="1" NS/>` +
          `<path d="M0.7,${(c.front.h - 0.08).toFixed(2)} L0.78,${(c.front.h - 0.18).toFixed(2)} L1.0,${(c.front.h - 0.18).toFixed(2)} L0.96,${(c.front.h - 0.12).toFixed(2)} L0.76,${(c.front.h - 0.12).toFixed(2)}" fill="none" stroke="#fff" stroke-width="1.4" NS/>`),
      });
      // подпись: полосатый навес над витриной
      const z = Math.min(0.78, ctx.z1 - 0.25);
      const n = 8;
      const [a0, a1] = [ctx.c0 + 0.1, ctx.c0 + 0.1 + (ctx.c1 - ctx.c0) * 0.62];
      for (let i = 0; i < n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        const bb = a0 + ((a1 - a0) * (i + 1)) / n;
        b.poly([b.P(ctx.r1, a, z), b.P(ctx.r1, bb, z), b.P(ctx.r1 + 0.35, bb, z - 0.18), b.P(ctx.r1 + 0.35, a, z - 0.18)], i % 2 ? "#fafafa" : C.window, OUT, 0.8);
      }
      props(b, D, [[2.4, 0.55], [2.4, 1.0], [2.4, 1.45]], ["crate", "crate", "barrel"]);
    },
  },

  market: {
    size: [4, 3, 1.8],
    slots: { wall: "slot.stalls", roof: "slot.tents", window: "slot.tentStripes" },
    palette: { wall: WOODS, roof: ["#1e88e5", "#43a047", "#e53935", "#fb8c00", "#8e24aa", "#00897b", "#fdd835"], window: ["#fafafa", "#fff8e1", "#fff59d", "#ffe0b2"] },
    compose(b, R, D, C) {
      b.plate("#d7c49e");
      const layouts = [
        [[0.35, 0.3], [0.35, 2.15], [1.75, 1.2]],
        [[0.35, 0.3], [1.75, 0.3], [1.0, 2.2]],
        [[0.35, 1.2], [1.75, 0.3], [1.75, 2.2]],
        [[0.35, 0.3], [0.35, 2.15], [1.75, 0.3], [1.75, 2.15]],
      ];
      const stalls = pick(R, layouts).sort((a, b2) => a[0] + a[1] - (b2[0] + b2[1]));
      const style = pick(R, ["striped", "pitched", "plain"]);
      const post = pick(D, WOOD);
      for (const [r, c] of stalls) {
        const w = 1.4;
        for (const [rr, cc] of [[r, c], [r, c + w], [r + 0.8, c], [r + 0.8, c + w]]) b.line(b.P(rr, cc, 0.06), b.P(rr, cc, 0.95), post, 2.2);
        b.box(r + 0.45, c + 0.05, r + 0.8, c + w - 0.05, 0.06, 0.4, C.wall);
        for (let i = 0; i < 4; i++) b.ellipseGround(r + 0.62, c + 0.25 + i * 0.3, 0.1, 0.42, pick(D, FRUIT), OUT, 0.7);
        if (style === "pitched") {
          b.gable(r - 0.05, c, r + 0.95, c + w, 0.92, 1.25, C.roof, C.window, "c", 0.06);
        } else {
          const n = 6;
          for (let i = 0; i < n; i++) {
            const a = c + (i * w) / n;
            const bb = c + ((i + 1) * w) / n;
            const fill = style === "striped" ? (i % 2 ? C.window : C.roof) : C.roof;
            b.poly([b.P(r - 0.05, a, 1.05), b.P(r - 0.05, bb, 1.05), b.P(r + 0.95, bb, 0.85), b.P(r + 0.95, a, 0.85)], fill, OUT, 0.8);
          }
          if (style === "plain") b.line(b.P(r + 0.95, c, 0.85), b.P(r + 0.95, c + w, 0.85), C.window, 2.4);
        }
      }
      if (chance(D, 0.8)) {
        b.line(b.P(1.4, 3.75, 0.06), b.P(1.4, 3.75, 1.2), post, 2.4);
        b.onFace("side", 1.65, 3.78, 0.95,
          `<rect x="0" y="0" width="0.5" height="0.32" fill="#fff8e1" stroke="${OUT}" stroke-width="1" NS/>` +
          `<line x1="0.25" y1="0.05" x2="0.25" y2="0.27" stroke="${OUT}" stroke-width="1.2" NS/>` +
          `<line x1="0.1" y1="0.24" x2="0.4" y2="0.24" stroke="${OUT}" stroke-width="1.2" NS/>` +
          `<path d="M0.05,0.14 L0.15,0.14 L0.1,0.22 Z M0.35,0.14 L0.45,0.14 L0.4,0.22 Z" fill="#ffb300" stroke="${OUT}" stroke-width="0.7" NS/>`);
      }
    },
  },
};
