// Классические (стандартные) рисунки зданий — те, что лежат файлами в src/assets/buildings.
// У каждого здания:
//   size  — [ширина (колонки), высота (ряды), zmax] — совпадает с BUILDINGS в seed_game_data.py;
//   base  — параметры стандартного вида;
//   draw(b, L) — рисование по параметрам L.
// Игрок может перекрасить классическую форму (стены, окна, крышу) — см. paintClassic в index.js.
import { OUT, shade } from "./core.js";

const GRASS = "#8bc34a";
const DIRT = "#b39a6b";
const GRAVEL = "#a7a39b";

/** Стандартная высота конька × крутизна (pitch) */
const ridge = (z, rise, pitch) => z + rise * pitch;

// ============================================================================= здания ==
export const CLASSIC = {
  house: {
    size: [2, 3, 2.0],
    base: { wall: "#ecd9b0", roof: "#c0392b", door: "#7a4a24", axis: "r", pitch: 1, chimney: true, flowers: true, flowerColor: "#e57373" },
    draw(b, L) {
      b.plate(GRASS);
      b.box(0.35, 0.3, 2.6, 1.7, 0.06, 0.95, L.wall);
      b.linesOn("side", 2.6, 1.7, 0.06, 2.25, 0.89, 0.15, shade(L.wall, 0.6), 0.6);
      b.door("front", 2.6, 0.3, 0.06, 0.55, 0.3, 0.55, L.door);
      b.window("side", 2.6, 1.7, 0.06, 0.35, 0.38);
      b.window("side", 2.6, 1.7, 0.06, 1.45, 0.38);
      const zr = ridge(0.95, 0.65, L.pitch);
      b.gable(0.35, 0.3, 2.6, 1.7, 0.95, zr, L.roof, L.wall, L.axis);
      if (L.axis === "r") b.window("front", 2.6, 0.3, 0.95, 0.55, 0.12, 0.3, 0.22);
      if (L.chimney) {
        const top = Math.max(1.85, zr + 0.25);
        b.box(1.0, 1.15, 1.25, 1.4, 1.2, top, "#8d6e63");
        b.smoke(1.12, 1.27, top);
      }
      if (L.flowers) b.ellipseGround(2.85, 1.3, 0.12, 0.06, L.flowerColor, OUT, 0.8);
    },
  },

  warehouse: {
    size: [5, 5, 2.6],
    base: { wall: "#8fa5b8", roof: "#5d6d7e", gate: "#4b5a69", gateLine: "#6b7b8a", axis: "c", pitch: 1, windows: true, crates: 4 },
    draw(b, L) {
      b.plate(GRAVEL);
      b.box(0.35, 0.35, 3.8, 4.65, 0.06, 1.55, L.wall);
      let ribs = "";
      for (let u = 1; u < 18; u++) ribs += `<line x1="${(u / 5).toFixed(2)}" y1="0" x2="${(u / 5).toFixed(2)}" y2="1.49" stroke="${shade(L.wall, 0.6)}" stroke-width="0.7" NS/>`;
      b.onFace("side", 3.8, 4.65, 0.06, ribs);
      let gate = `<rect x="1.5" y="0" width="1.3" height="1.05" fill="${L.gate}" stroke="${OUT}" stroke-width="1.2" NS/>`;
      for (let v = 1; v < 10; v++) gate += `<line x1="1.5" y1="${(v / 10).toFixed(2)}" x2="2.8" y2="${(v / 10).toFixed(2)}" stroke="${L.gateLine}" stroke-width="0.8" NS/>`;
      gate += `<rect x="1.4" y="1.05" width="1.5" height="0.08" fill="#f2c94c" stroke="${OUT}" stroke-width="0.8" NS/>`;
      b.onFace("front", 3.8, 0.35, 0.06, gate);
      if (L.windows) for (const u of [0.5, 3.5]) b.window("front", 3.8, 0.35, 0.06, u, 0.95, 0.4, 0.25);
      b.gable(0.35, 0.35, 3.8, 4.65, 1.55, ridge(1.55, 0.8, L.pitch), L.roof, L.wall, L.axis);
      const crates = [[4.1, 0.6, 0.06], [4.1, 1.05, 0.06], [4.1, 0.8, 0.46], [4.15, 3.6, 0.06]].slice(0, L.crates);
      for (const [r0, c0, z0] of crates) b.box(r0, c0, r0 + 0.4, c0 + 0.4, z0, z0 + 0.4, "#c8a165");
    },
  },

  barn: {
    size: [2, 2, 1.7],
    base: { wall: "#b23a2e", roof: "#4e342e", door: "#7b241c", trim: "#fafafa", axis: "c", pitch: 1, hay: true, window: true },
    draw(b, L) {
      b.plate(DIRT);
      b.box(0.25, 0.25, 1.7, 1.75, 0.06, 0.9, L.wall);
      b.onFace("front", 1.7, 0.25, 0.06,
        `<rect x="0.45" y="0" width="0.6" height="0.62" fill="${L.door}" stroke="${L.trim}" stroke-width="1.6" NS/>` +
        `<line x1="0.45" y1="0" x2="1.05" y2="0.62" stroke="${L.trim}" stroke-width="1.4" NS/>` +
        `<line x1="1.05" y1="0" x2="0.45" y2="0.62" stroke="${L.trim}" stroke-width="1.4" NS/>`);
      if (L.window) b.window("side", 1.7, 1.75, 0.06, 0.55, 0.45);
      b.gable(0.25, 0.25, 1.7, 1.75, 0.9, ridge(0.9, 0.6, L.pitch), L.roof, L.wall, L.axis);
      if (L.hay) b.cyl(1.88, 1.75, 0.13, 0.06, 0.3, "#e6c76a");
    },
  },

  lumberjack_hut: {
    size: [2, 2, 1.5],
    base: { wall: "#8d5a2b", roof: "#6d8b3a", door: "#7a4a24", axis: "c", pitch: 1, logs: true, stump: true },
    draw(b, L) {
      b.plate("#7cb342");
      b.box(0.2, 0.2, 1.25, 1.45, 0.06, 0.72, L.wall);
      b.linesOn("front", 1.25, 0.2, 0.06, 1.25, 0.66, 0.13, shade(L.wall, 0.55));
      b.linesOn("side", 1.25, 1.45, 0.06, 1.05, 0.66, 0.13, shade(L.wall, 0.55));
      b.door("front", 1.25, 0.2, 0.06, 0.45, 0.28, 0.46, L.door);
      b.window("side", 1.25, 1.45, 0.06, 0.4, 0.3, 0.24, 0.2);
      b.gable(0.2, 0.2, 1.25, 1.45, 0.72, ridge(0.72, 0.48, L.pitch), L.roof, L.wall, L.axis);
      if (L.logs) {
        b.box(1.45, 0.25, 1.85, 1.1, 0.06, 0.38, "#a0522d");
        b.onFace("side", 1.85, 1.1, 0.06, [[0.1, 0.08], [0.25, 0.08], [0.175, 0.22]]
          .map(([u, v]) => `<circle cx="${u}" cy="${v}" r="0.07" fill="#deb887" stroke="${OUT}" stroke-width="0.8" NS/>`).join(""));
      }
      if (L.stump) {
        b.cyl(1.6, 1.6, 0.16, 0.06, 0.25, "#8d6e63", "#e3c08a");
        const [x, y] = b.P(1.6, 1.6, 0.25);
        b.line([x - 2, y], [x + 0.25 * b.a, y - 0.35 * b.a], "#6d4c41", 2.2);
        b.poly([[x + 0.18 * b.a, y - 0.4 * b.a], [x + 0.34 * b.a, y - 0.36 * b.a], [x + 0.3 * b.a, y - 0.24 * b.a]], "#b0bec5", OUT, 1);
      }
    },
  },

  quarry: {
    size: [3, 3, 1.8],
    base: { stone: "#9e9e9e", block: "#cfcfcf", load: "#d6d6d6", cart: "#6d4c41", height: 1, crane: true, cart_: true },
    draw(b, L) {
      const h = (z) => 0.06 + (z - 0.06) * L.height;
      const [h1, h2, h3] = [h(0.35), h(0.7), h(1.05)];
      b.plate(GRAVEL);
      b.box(0.15, 0.15, 2.3, 2.6, 0.06, h1, L.stone);
      b.box(0.15, 0.15, 1.6, 1.9, h1, h2, shade(L.stone, 0.873));
      b.box(0.15, 0.15, 0.95, 1.1, h2, h3, shade(L.stone, 0.76));
      for (const [r, c, z] of [[1.9, 2.0, h1], [1.3, 1.3, h2], [0.7, 0.8, h3]]) b.ellipseGround(r, c, 0.07, z, "#6f6f6f", OUT, 0.6);
      b.box(2.0, 0.25, 2.3, 0.55, h1, h1 + 0.25, L.block);
      if (L.crane) {
        b.line(b.P(2.45, 2.55, 0.06), b.P(2.45, 2.55, 1.4), "#5d4037", 3);
        b.line(b.P(2.45, 2.55, 1.35), b.P(2.0, 1.9, 1.25), "#5d4037", 2.4);
        b.line(b.P(2.0, 1.9, 1.25), b.P(2.0, 1.9, 0.75), "#424242", 1);
        b.box(1.92, 1.82, 2.08, 1.98, 0.55, 0.72, L.load);
      }
      if (L.cart_) {
        b.box(2.45, 0.6, 2.8, 1.25, 0.12, 0.38, L.cart);
        b.box(2.5, 0.68, 2.75, 1.17, 0.38, 0.48, "#bdbdbd", "#cfcfcf");
        b.onFace("front", 2.8, 0.6, 0.12, [0.15, 0.5].map((u) => `<circle cx="${u}" cy="0" r="0.09" fill="#37474f" stroke="${OUT}" stroke-width="0.8" NS/>`).join(""));
      }
    },
  },

  mine: {
    size: [3, 3, 1.7],
    base: { rock: "#7b6a58", frame: "#8d6e63", cart: "#607d8b", height: 1, lamp: true, cart_: true },
    draw(b, L) {
      const h = (z) => 0.06 + (z - 0.06) * L.height;
      b.plate("#9c8a72");
      b.box(0.1, 0.1, 2.25, 2.7, 0.06, h(0.85), L.rock);
      b.box(0.1, 0.1, 1.5, 1.9, h(0.85), h(1.35), shade(L.rock, 0.9));
      b.box(0.1, 0.1, 0.8, 1.0, h(1.35), h(1.6), shade(L.rock, 0.82));
      b.onFace("front", 2.25, 0.1, 0.06,
        `<rect x="0.85" y="0" width="0.75" height="0.62" fill="#141414" stroke="${OUT}" stroke-width="1" NS/>` +
        `<rect x="0.8" y="0" width="0.1" height="0.68" fill="${L.frame}" stroke="${OUT}" stroke-width="1" NS/>` +
        `<rect x="1.55" y="0" width="0.1" height="0.68" fill="${L.frame}" stroke="${OUT}" stroke-width="1" NS/>` +
        `<rect x="0.75" y="0.62" width="0.95" height="0.1" fill="${L.frame}" stroke="${OUT}" stroke-width="1" NS/>` +
        (L.lamp ? `<circle cx="1.85" cy="0.5" r="0.06" fill="#ffb300" stroke="${OUT}" stroke-width="0.8" NS/>` : ""));
      for (const c of [1.08, 1.42]) b.line(b.P(2.25, c, 0.07), b.P(2.95, c, 0.07), "#5d4037", 1.6);
      for (const r of [2.4, 2.6, 2.8]) b.line(b.P(r, 1.0, 0.07), b.P(r, 1.5, 0.07), "#795548", 1.4);
      if (L.cart_) {
        b.box(2.4, 1.0, 2.8, 1.5, 0.1, 0.38, L.cart);
        const [x, y] = b.P(2.6, 1.25, 0.38);
        for (const [dx, dy, col] of [[-0.1, 0, "#424242"], [0.08, -0.02, "#5d4037"], [0, -0.07, "#ff8f00"]]) {
          b.raw(`<circle cx="${(x + dx * b.a).toFixed(2)}" cy="${(y + dy * b.a).toFixed(2)}" r="${(0.07 * b.a).toFixed(2)}" fill="${col}" stroke="${OUT}" stroke-width="0.8"/>`);
        }
      }
    },
  },

  water_mill: {
    size: [2, 2, 1.6],
    base: { wall: "#d7ccc8", roof: "#8d4e2a", door: "#7a4a24", wheel: "#5d4037", axis: "r", pitch: 1, window: true },
    draw(b, L) {
      b.plate(GRASS);
      b.box(0.0, 1.5, 2.0, 2.0, 0.0, 0.07, "#4fa3e0", "#64b5f6", 0.8);
      b.box(0.3, 0.2, 1.6, 1.38, 0.06, 0.8, L.wall);
      b.door("front", 1.6, 0.2, 0.06, 0.4, 0.28, 0.45, L.door);
      if (L.window) b.window("front", 1.6, 0.2, 0.06, 0.8, 0.4, 0.22, 0.2);
      b.gable(0.3, 0.2, 1.6, 1.38, 0.8, ridge(0.8, 0.5, L.pitch), L.roof, L.wall, L.axis);
      const angles = [...Array(8).keys()].map((i) => (i * Math.PI) / 4);
      const spokes = angles.map((t) => `<line x1="0" y1="0" x2="${(0.45 * Math.cos(t)).toFixed(3)}" y2="${(0.45 * Math.sin(t)).toFixed(3)}" stroke="${L.wheel}" stroke-width="1.4" NS/>`).join("");
      const paddles = angles.map((t) => `<rect x="${(0.42 * Math.cos(t) - 0.05).toFixed(3)}" y="${(0.42 * Math.sin(t) - 0.05).toFixed(3)}" width="0.1" height="0.1" fill="#8d6e63" stroke="${OUT}" stroke-width="0.8" NS/>`).join("");
      b.onFace("side", 0.95, 1.55, 0.45,
        `<circle cx="0" cy="0" r="0.45" fill="none" stroke="${L.wheel}" stroke-width="3" NS/>` + spokes + paddles +
        `<circle cx="0" cy="0" r="0.07" fill="#4e342e" NS/>`);
    },
  },

  sawmill: {
    size: [3, 2, 1.7],
    base: { roof: "#8d6e63", post: "#5d4037", log: "#8d5a2b", axis: "c", pitch: 1, planks: 3 },
    draw(b, L) {
      b.plate(DIRT);
      for (const [r, c] of [[0.3, 0.3], [0.3, 2.3], [1.42, 0.3], [1.42, 2.3]]) b.box(r, c, r + 0.09, c + 0.09, 0.06, 1.0, L.post);
      b.box(0.65, 0.5, 1.1, 2.1, 0.06, 0.42, "#a1887f");
      b.box(0.75, 0.6, 1.0, 2.0, 0.42, 0.62, L.log);
      b.onFace("front", 0.95, 1.3, 0.55,
        `<circle cx="0" cy="0" r="0.26" fill="#cfd8dc" stroke="${OUT}" stroke-width="1" NS/>` +
        `<circle cx="0" cy="0" r="0.05" fill="#607d8b" NS/>`);
      b.gable(0.3, 0.3, 1.51, 2.39, 1.0, ridge(1.0, 0.45, L.pitch), L.roof, L.roof, L.axis);
      for (let i = 0; i < L.planks; i++) b.box(1.62, 0.35, 1.92, 1.65, 0.06 + i * 0.12, 0.18 + i * 0.12, "#deb887");
    },
  },

  stonecutter_hut: {
    size: [2, 2, 1.5],
    base: { wall: "#a0a4a8", roof: "#546e7a", door: "#6d4c41", blockColor: "#d5d8da", axis: "c", pitch: 1, blocks: 4 },
    draw(b, L) {
      b.plate(GRAVEL);
      b.box(0.25, 0.25, 1.3, 1.75, 0.06, 0.75, L.wall);
      for (const [kind, r, c, length] of [["front", 1.3, 0.25, 1.5], ["side", 1.3, 1.75, 1.05]]) {
        b.linesOn(kind, r, c, 0.06, length, 0.69, 0.17, shade(L.wall, 0.6));
      }
      b.door("front", 1.3, 0.25, 0.06, 0.55, 0.3, 0.48, L.door);
      b.window("side", 1.3, 1.75, 0.06, 0.4, 0.32, 0.24, 0.2);
      b.gable(0.25, 0.25, 1.3, 1.75, 0.75, ridge(0.75, 0.45, L.pitch), L.roof, L.wall, L.axis);
      const blocks = [[1.45, 0.3, 0.06], [1.45, 0.75, 0.06], [1.45, 0.52, 0.36], [1.5, 1.35, 0.06]].slice(0, L.blocks);
      for (const [r0, c0, z0] of blocks) b.box(r0, c0, r0 + 0.35, c0 + 0.35, z0, z0 + 0.3, L.blockColor);
    },
  },

  blacksmith: {
    size: [3, 3, 2.4],
    base: { wall: "#6f6a66", roof: "#3e2723", door: "#4e342e", chimney: "#5a4a42", axis: "c", pitch: 1, anvil: true },
    draw(b, L) {
      b.plate(GRAVEL);
      b.box(0.3, 0.3, 2.0, 2.4, 0.06, 1.0, L.wall);
      b.linesOn("front", 2.0, 0.3, 0.06, 2.1, 0.94, 0.2, shade(L.wall, 0.65));
      b.onFace("front", 2.0, 0.3, 0.06,
        `<rect x="0.5" y="0.12" width="0.7" height="0.45" fill="#ff8f00" stroke="${OUT}" stroke-width="1.2" NS/>` +
        `<rect x="0.6" y="0.17" width="0.5" height="0.2" fill="#ffd54f" NS/>`);
      b.door("side", 2.0, 2.4, 0.06, 0.5, 0.35, 0.6, L.door);
      const zr = ridge(1.0, 0.6, L.pitch);
      b.gable(0.3, 0.3, 2.0, 2.4, 1.0, zr, L.roof, L.wall, L.axis);
      const top = Math.max(2.05, zr + 0.4);
      b.box(0.6, 1.75, 1.0, 2.15, 0.9, top, L.chimney);
      b.ellipseGround(0.8, 1.95, 0.12, top, "#ff7043", OUT, 0.8);
      b.smoke(0.8, 1.95, top);
      if (L.anvil) {
        b.box(2.3, 1.0, 2.5, 1.45, 0.06, 0.2, "#424242");
        b.box(2.25, 0.9, 2.55, 1.6, 0.2, 0.34, "#546e7a");
      }
    },
  },

  mill: {
    size: [2, 2, 2.6],
    base: { wall: "#f2e3c4", roof: "#8d4e2a", blades: "#fafafa", door: "#7a4a24", pitch: 1, turn: 20, flowers: false, flowerColor: "#e57373" },
    draw(b, L) {
      b.plate(GRASS);
      b.box(0.55, 0.55, 1.45, 1.45, 0.06, 1.45, L.wall);
      b.door("front", 1.45, 0.55, 0.06, 0.3, 0.3, 0.45, L.door);
      b.window("side", 1.45, 1.45, 0.06, 0.32, 0.8, 0.24, 0.22);
      b.cone(1.0, 1.0, 0.6, 1.45, ridge(1.45, 0.95, L.pitch), L.roof);
      const blades = [0, 90, 180, 270].map((d) => d + L.turn).map((ang) =>
        `<g transform="rotate(${ang})"><rect x="0.06" y="-0.09" width="0.85" height="0.18" fill="${L.blades}" stroke="${OUT}" stroke-width="1" NS/>` +
        [1, 2, 3, 4].map((k) => `<line x1="${(0.06 + 0.17 * k).toFixed(2)}" y1="-0.09" x2="${(0.06 + 0.17 * k).toFixed(2)}" y2="0.09" stroke="#9e9e9e" stroke-width="0.7" NS/>`).join("") +
        "</g>").join("");
      b.onFace("front", 1.5, 1.0, 1.35, blades + `<circle cx="0" cy="0" r="0.08" fill="#5d4037" stroke="${OUT}" stroke-width="1" NS/>`);
      if (L.flowers) {
        b.bush(1.75, 0.35, L.flowerColor);
        b.bush(1.75, 1.7, L.flowerColor);
      }
    },
  },

  bakery: {
    size: [3, 3, 2.1],
    base: { wall: "#f3d9a4", roof: "#d35400", door: "#7a4a24", awning: ["#e53935", "#fafafa"], axis: "r", pitch: 1, bushes: false, flowerColor: "#e57373" },
    draw(b, L) {
      b.plate("#c8b08a");
      b.box(0.3, 0.3, 2.2, 2.5, 0.06, 1.0, L.wall);
      const stripes = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${(0.2 + i * 0.18).toFixed(2)}" y="0.62" width="0.18" height="0.12" fill="${L.awning[i % 2]}" stroke="${OUT}" stroke-width="0.8" NS/>`).join("");
      b.onFace("front", 2.2, 0.3, 0.06,
        `<rect x="0.25" y="0.15" width="0.8" height="0.45" fill="#9ad7ff" stroke="${OUT}" stroke-width="1.2" NS/>` +
        `<ellipse cx="0.65" cy="0.32" rx="0.22" ry="0.09" fill="#d4a056" stroke="${OUT}" stroke-width="0.9" NS/>` +
        stripes +
        `<rect x="1.35" y="0" width="0.36" height="0.6" fill="${L.door}" stroke="${OUT}" stroke-width="1.1" NS/>` +
        `<ellipse cx="1.53" cy="0.78" rx="0.2" ry="0.1" fill="#d4a056" stroke="${OUT}" stroke-width="1" NS/>`);
      b.window("side", 2.2, 2.5, 0.06, 0.4, 0.4);
      b.window("side", 2.2, 2.5, 0.06, 1.2, 0.4);
      const zr = ridge(1.0, 0.65, L.pitch);
      b.gable(0.3, 0.3, 2.2, 2.5, 1.0, zr, L.roof, L.wall, L.axis);
      const top = Math.max(1.85, zr + 0.2);
      b.box(0.8, 1.9, 1.1, 2.2, 1.2, top, "#8d6e63");
      b.smoke(0.95, 2.05, top);
      if (L.bushes) {
        b.bush(2.5, 2.2, L.flowerColor);
        b.bush(2.45, 0.35, L.flowerColor);
      }
    },
  },

  sauce_factory: {
    size: [4, 3, 2.3],
    base: { wall: "#b5533c", roof: "#6d3a2c", door: "#5d4037", tank: "#e53935", tankTop: "#ef9a9a", axis: "c", pitch: 1, stack: true, pipe: true },
    draw(b, L) {
      b.plate("#b0b0b0");
      b.box(0.3, 0.3, 2.4, 2.6, 0.06, 1.05, L.wall);
      b.linesOn("front", 2.4, 0.3, 0.06, 2.3, 0.99, 0.12, shade(L.wall, 0.7), 0.5);
      for (const u of [0.2, 0.75]) b.window("front", 2.4, 0.3, 0.06, u, 0.5, 0.36, 0.3);
      b.door("front", 2.4, 0.3, 0.06, 1.35, 0.45, 0.6, L.door);
      b.onFace("front", 2.4, 0.3, 0.06,
        `<circle cx="2.0" cy="0.72" r="0.18" fill="#e53935" stroke="${OUT}" stroke-width="1" NS/>` +
        `<path d="M1.95,0.88 L2.0,0.97 L2.06,0.88 Z" fill="#43a047" stroke="${OUT}" stroke-width="0.7" NS/>`);
      const zr = ridge(1.05, 0.55, L.pitch);
      b.gable(0.3, 0.3, 2.4, 2.6, 1.05, zr, L.roof, L.wall, L.axis);
      if (L.stack) b.cyl(0.75, 0.75, 0.12, 1.2, Math.max(2.1, zr + 0.5), "#9e9e9e");
      for (const r of [0.9, 2.05]) b.cyl(r, 3.3, 0.36, 0.06, 1.3, L.tank, L.tankTop);
      if (L.pipe) b.line(b.P(1.4, 2.6, 0.8), b.P(1.4, 3.05, 0.8), "#757575", 3);
    },
  },

  butter_factory: {
    size: [4, 3, 2.2],
    base: { wall: "#f5f0e1", roof: "#1e88e5", door: "#455a64", silo: "#eceff1", cap: "#90a4ae", axis: "c", pitch: 1, can: true },
    draw(b, L) {
      b.plate("#cfd8dc");
      b.box(0.3, 0.3, 2.4, 2.6, 0.06, 1.0, L.wall);
      for (const u of [0.2, 0.75]) b.window("front", 2.4, 0.3, 0.06, u, 0.45, 0.36, 0.3);
      b.door("front", 2.4, 0.3, 0.06, 1.3, 0.45, 0.6, L.door);
      b.onFace("front", 2.4, 0.3, 0.06,
        `<rect x="1.8" y="0.55" width="0.38" height="0.22" fill="#ffe082" stroke="${OUT}" stroke-width="1" NS/>` +
        `<rect x="1.8" y="0.55" width="0.38" height="0.07" fill="#ffca28" stroke="${OUT}" stroke-width="0.7" NS/>`);
      b.gable(0.3, 0.3, 2.4, 2.6, 1.0, ridge(1.0, 0.55, L.pitch), L.roof, L.wall, L.axis);
      for (const r of [0.85, 2.0]) {
        b.cyl(r, 3.3, 0.38, 0.06, 1.45, L.silo);
        b.cone(r, 3.3, 0.38, 1.45, 1.85, L.cap);
      }
      if (L.can) b.cyl(2.7, 1.85, 0.1, 0.06, 0.32, "#b0bec5", "#eceff1");
    },
  },

  "chicken-coop": {
    size: [2, 2, 1.4],
    base: { wall: "#c97b4a", roof: "#8e3b2b", chicken: "#fafafa", axis: "c", pitch: 1, birds: 3 },
    draw(b, L) {
      b.plate("#e6c76a");
      b.fence(0.05, 1.95, 1.95, 1.95);
      for (const [r, c] of [[1.0, 0.3], [1.0, 1.25], [0.3, 1.25]]) b.box(r, c, r + 0.07, c + 0.07, 0.06, 0.3, "#5d4037");
      b.box(0.3, 0.3, 1.05, 1.3, 0.3, 0.75, L.wall);
      b.onFace("front", 1.05, 0.3, 0.3, `<rect x="0.4" y="0.02" width="0.2" height="0.22" fill="#3e2723" stroke="${OUT}" stroke-width="1" NS/>`);
      b.poly([b.P(1.05, 0.7, 0.3), b.P(1.05, 0.9, 0.3), b.P(1.5, 0.9, 0.06), b.P(1.5, 0.7, 0.06)], "#a1887f", OUT, 1);
      b.gable(0.3, 0.3, 1.05, 1.3, 0.75, ridge(0.75, 0.35, L.pitch), L.roof, L.wall, L.axis);
      b.fence(1.95, 0.05, 1.95, 1.95);
      for (const [r, c] of [[1.35, 1.35], [1.55, 0.45], [1.7, 1.15]].slice(0, L.birds)) {
        b.animal(r, c, L.chicken, L.chicken, "#f9a825", { k: 0.7 });
        const [x, y] = b.P(r, c, 0.16 * 0.7);
        b.raw(`<circle cx="${(x + 0.16 * b.a).toFixed(2)}" cy="${(y - 0.1 * b.a).toFixed(2)}" r="${(0.03 * b.a).toFixed(2)}" fill="#e53935"/>`);
      }
    },
  },

  pigsty: {
    size: [3, 3, 1.4],
    base: { wall: "#c48b5a", roof: "#6d4c41", pig: "#f8a5b8", pigHead: "#f48fb1", axis: "c", pitch: 1, puddle: true, pigs: 3 },
    draw(b, L) {
      b.plate("#8d6e4a");
      if (L.puddle) b.ellipseGround(1.9, 1.5, 0.45, 0.07, "#5d4033", OUT, 0.8);
      b.box(0.25, 0.25, 1.2, 2.0, 0.06, 0.7, L.wall);
      b.onFace("front", 1.2, 0.25, 0.06, `<rect x="0.6" y="0" width="0.4" height="0.42" fill="#3e2723" stroke="${OUT}" stroke-width="1" NS/>`);
      b.gable(0.25, 0.25, 1.2, 2.0, 0.7, ridge(0.7, 0.35, L.pitch), L.roof, L.wall, L.axis);
      b.fence(0.1, 2.85, 2.85, 2.85);
      for (const [r, c] of [[1.55, 0.7], [2.2, 1.0], [1.65, 2.2]].slice(0, L.pigs)) b.animal(r, c, L.pig, L.pigHead, "#c2185b");
      b.fence(2.85, 0.1, 2.85, 2.85);
    },
  },

  cowshed: {
    size: [4, 4, 2.4],
    base: { wall: "#c62828", gate: "#8e1c1c", roof: "#455a64", trim: "#fafafa", cow: "#fafafa", spot: "#424242", axis: "c", pitch: 1, silo: true, cows: 3 },
    draw(b, L) {
      b.plate(DIRT);
      b.box(0.3, 0.3, 2.5, 2.9, 0.06, 1.1, L.wall);
      b.onFace("front", 2.5, 0.3, 0.06,
        `<rect x="0.9" y="0" width="0.8" height="0.8" fill="${L.gate}" stroke="${L.trim}" stroke-width="1.8" NS/>` +
        `<line x1="0.9" y1="0" x2="1.7" y2="0.8" stroke="${L.trim}" stroke-width="1.5" NS/>` +
        `<line x1="1.7" y1="0" x2="0.9" y2="0.8" stroke="${L.trim}" stroke-width="1.5" NS/>`);
      for (const u of [0.4, 1.3]) b.window("side", 2.5, 2.9, 0.06, u, 0.55, 0.3, 0.25);
      b.gable(0.3, 0.3, 2.5, 2.9, 1.1, ridge(1.1, 0.75, L.pitch), L.roof, L.wall, L.axis);
      if (L.silo) {
        b.cyl(0.9, 3.4, 0.42, 0.06, 1.9, "#b0bec5");
        b.cone(0.9, 3.4, 0.42, 1.9, 2.25, "#78909c");
      }
      b.fence(3.85, 0.15, 3.85, 3.85);
      for (const [r, c] of [[3.0, 1.0], [3.3, 2.3], [2.9, 3.3]].slice(0, L.cows)) {
        b.animal(r, c, L.cow, L.cow, "#424242", { k: 1.25, spots: [[-0.08, -0.02], [0.07, 0.03]], spotColor: L.spot });
      }
    },
  },

  sheepfold: {
    size: [3, 3, 1.4],
    base: { wall: "#bca07a", roof: "#5d4037", stone: "#9e9e9e", wool: "#fafafa", head: "#424242", axis: "c", pitch: 1, sheep: 4 },
    draw(b, L) {
      b.plate(GRASS);
      b.box(0.25, 0.25, 1.2, 1.8, 0.06, 0.65, L.wall);
      b.onFace("front", 1.2, 0.25, 0.06, `<rect x="0.55" y="0" width="0.38" height="0.4" fill="#4e342e" stroke="${OUT}" stroke-width="1" NS/>`);
      b.gable(0.25, 0.25, 1.2, 1.8, 0.65, ridge(0.65, 0.35, L.pitch), L.roof, L.wall, L.axis);
      b.box(0.1, 2.75, 2.75, 2.92, 0.06, 0.28, L.stone, null, 1);
      for (const [r, c] of [[1.6, 0.6], [1.5, 1.6], [2.2, 1.1], [2.25, 2.1]].slice(0, L.sheep)) {
        b.animal(r, c, L.wool, L.head, "#424242", { fluffy: true });
      }
      b.box(2.75, 0.1, 2.92, 2.92, 0.06, 0.28, L.stone, null, 1);
    },
  },

  shop: {
    size: [3, 3, 2.0],
    base: { wall: "#fff3e0", roof: "#2e7d32", door: "#6d4c41", awning: ["#e53935", "#fafafa"], axis: "c", pitch: 1, crates: 3 },
    draw(b, L) {
      b.plate("#c8b08a");
      b.box(0.3, 0.3, 1.9, 2.6, 0.06, 1.0, L.wall);
      b.onFace("front", 1.9, 0.3, 0.06,
        `<rect x="0.2" y="0.12" width="0.95" height="0.5" fill="#9ad7ff" stroke="${OUT}" stroke-width="1.2" NS/>` +
        `<circle cx="0.45" cy="0.3" r="0.08" fill="#e53935" NS/>` +
        `<circle cx="0.7" cy="0.27" r="0.08" fill="#ffb300" NS/>` +
        `<circle cx="0.95" cy="0.3" r="0.08" fill="#7cb342" NS/>` +
        `<rect x="1.45" y="0" width="0.4" height="0.65" fill="${L.door}" stroke="${OUT}" stroke-width="1.1" NS/>` +
        `<rect x="0.55" y="0.78" width="1.2" height="0.18" fill="${L.roof}" stroke="${OUT}" stroke-width="1" NS/>` +
        `<path d="M0.7,0.92 L0.78,0.82 L1.0,0.82 L0.96,0.88 L0.76,0.88" fill="none" stroke="#fff" stroke-width="1.4" NS/>`);
      b.window("side", 1.9, 2.6, 0.06, 0.45, 0.35, 0.4, 0.3);
      b.gable(0.3, 0.3, 1.9, 2.6, 1.0, ridge(1.0, 0.55, L.pitch), L.roof, L.wall, L.axis);
      awning(b, 1.9, 0.4, 2.5, 0.78, L.awning);
      ["#e53935", "#ffb300", "#7cb342"].slice(0, L.crates).forEach((fill, i) => crate(b, 2.25, 0.45 + i * 0.45, fill));
    },
  },

  market: {
    size: [4, 3, 1.6],
    base: {
      tents: [["#1e88e5", "#fafafa"], ["#43a047", "#fafafa"], ["#e53935", "#fff59d"]],
      post: "#5d4037", slope: 0.2, sign: true,
    },
    draw(b, L) {
      b.plate("#d7c49e");
      const stalls = [
        [0.35, 0.3, L.tents[0], ["#e53935", "#ffb300"]],
        [0.35, 2.15, L.tents[1], ["#8d6e63", "#fafafa"]],
        [1.75, 1.2, L.tents[2], ["#7cb342", "#ff7043"]],
      ];
      for (const [r, c, cols, goods] of stalls) {
        const w = 1.4;
        for (const [rr, cc] of [[r, c], [r, c + w], [r + 0.8, c], [r + 0.8, c + w]]) b.line(b.P(rr, cc, 0.06), b.P(rr, cc, 0.95), L.post, 2.2);
        b.box(r + 0.45, c + 0.05, r + 0.8, c + w - 0.05, 0.06, 0.4, "#a1887f");
        [...goods, ...goods].forEach((fill, i) => b.ellipseGround(r + 0.62, c + 0.25 + i * 0.3, 0.1, 0.42, fill, OUT, 0.7));
        const n = 6;
        for (let i = 0; i < n; i++) {
          const a = c + (i * w) / n;
          const bb = c + ((i + 1) * w) / n;
          b.poly([b.P(r - 0.05, a, 1.05), b.P(r - 0.05, bb, 1.05), b.P(r + 0.95, bb, 1.05 - L.slope), b.P(r + 0.95, a, 1.05 - L.slope)], cols[i % 2], OUT, 0.8);
        }
      }
      if (L.sign) {
        b.line(b.P(1.4, 3.75, 0.06), b.P(1.4, 3.75, 1.2), L.post, 2.4);
        b.onFace("side", 1.65, 3.78, 0.95,
          `<rect x="0" y="0" width="0.5" height="0.32" fill="#fff8e1" stroke="${OUT}" stroke-width="1" NS/>` +
          `<line x1="0.25" y1="0.05" x2="0.25" y2="0.27" stroke="${OUT}" stroke-width="1.2" NS/>` +
          `<line x1="0.1" y1="0.24" x2="0.4" y2="0.24" stroke="${OUT}" stroke-width="1.2" NS/>` +
          `<path d="M0.05,0.14 L0.15,0.14 L0.1,0.22 Z M0.35,0.14 L0.45,0.14 L0.4,0.22 Z" fill="#ffb300" stroke="${OUT}" stroke-width="0.7" NS/>`);
      }
    },
  },
};

/** Полосатый навес над передней гранью (r = const) от колонки c0 до c1. */
function awning(b, r, c0, c1, z, colors, depth = 0.35, drop = 0.18) {
  const n = Math.max(2, Math.floor((c1 - c0) / 0.25));
  const step = (c1 - c0) / n;
  for (let i = 0; i < n; i++) {
    const a = c0 + i * step;
    const bb = c0 + (i + 1) * step;
    b.poly([b.P(r, a, z), b.P(r, bb, z), b.P(r + depth, bb, z - drop), b.P(r + depth, a, z - drop)], colors[i % 2], OUT, 0.8);
  }
}

/** Ящик с товаром: деревянная коробка и горка продукции сверху. */
function crate(b, r, c, fill, size = 0.32) {
  b.box(r, c, r + size, c + size, 0.06, 0.26, "#b0884f");
  b.ellipseGround(r + size / 2, c + size / 2, size * 0.32, 0.29, fill, OUT, 0.8);
}
