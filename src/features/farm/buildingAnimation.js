// Анимация работающих зданий на карте (Pixi).
//
// Генератор (buildingArt) отдаёт картинку «в работе» без движущихся частей, сами части
// (кадры вращения, подвижные предметы) и точки эффектов. Здесь из них собирается контейнер,
// а update(t) двигает всё как функцию от общего времени t (секунды) — без внутреннего состояния,
// поэтому перерисовка карты (каждые 5 секунд приходит статус) не сбивает анимацию.
import * as PIXI from "pixi.js";
import { renderBuildingAnimation, svgToDataUrl } from "./buildingArt";

const loadSvg = (svg) => PIXI.Assets.load({ src: svgToDataUrl(svg), loadParser: "loadSVG" });

/** Текстуры анимации здания (или null, если анимировать нечего). */
export async function loadBuildingAnimation(slug, look) {
  const anim = renderBuildingAnimation(slug, look);
  if (!anim) return null;
  const [base, parts] = await Promise.all([
    loadSvg(anim.svg),
    Promise.all(anim.parts.map(async (p) =>
      p.type === "rotor"
        ? { ...p, textures: await Promise.all(p.frames.map(loadSvg)) }
        : { ...p, texture: await loadSvg(p.svg) })),
  ]);
  return { base, H: anim.H, parts, emitters: anim.emitters };
}

// Частицы: сколько, за сколько секунд проходят путь, высота подъёма и снос (в клетках), размер и цвет
const PARTICLES = {
  smoke: { n: 5, period: 3.2, rise: 1.5, drift: 0.4, r0: 0.09, r1: 0.26, color: 0xeceff1, alpha: 0.85 },
  steam: { n: 4, period: 2.4, rise: 0.9, drift: 0.2, r0: 0.07, r1: 0.18, color: 0xffffff, alpha: 0.65 },
  dust: { n: 6, period: 1.8, rise: 0.45, drift: 0.55, r0: 0.04, r1: 0.13, color: 0xd7ccc8, alpha: 0.75 },
  chips: { n: 6, period: 0.9, rise: 0.35, drift: 0.5, r0: 0.03, r1: 0.035, color: 0xdeb887, alpha: 0.95, arc: true },
};

function emitter(container, e, at, k) {
  const g = new PIXI.Graphics();
  container.addChild(g);
  const [x, y] = at(e.x, e.y);
  const a = e.a * k; // размер клетки в мире
  const seed = ((e.x * 31 + e.y * 17) % 100) / 100;

  if (e.type === "glow") {
    g.blendMode = "add";
    const size = (e.size || 0.3) * a;
    return (t) => {
      const f = 0.55 + 0.25 * Math.sin(t * 9 + seed * 6) + 0.2 * Math.sin(t * 23 + seed);
      g.clear();
      g.ellipse(x, y, size, size * 0.6).fill({ color: e.color, alpha: 0.35 * f });
      g.circle(x, y, size * 0.35).fill({ color: 0xfff3c4, alpha: 0.45 * f });
    };
  }

  const cfg = PARTICLES[e.type];
  if (!cfg) return () => {};
  return (t) => {
    g.clear();
    for (let i = 0; i < cfg.n; i++) {
      const p = (t / cfg.period + i / cfg.n + seed) % 1;
      const side = Math.sin((i + 1) * 12.9898) * 0.5; // у каждой частицы свой разлёт
      const px = x + (Math.sin(p * 3 + i) * cfg.drift * 0.25 + side * cfg.drift * p) * a;
      const py = cfg.arc ? y - Math.sin(p * Math.PI) * cfg.rise * a : y - p * cfg.rise * a;
      const r = (cfg.r0 + (cfg.r1 - cfg.r0) * p) * a;
      g.circle(px, py, r).fill({ color: cfg.color, alpha: cfg.alpha * (1 - p) });
    }
  };
}

/**
 * Анимированное здание. place — где стоит картинка в мире: середина нижнего края (x, y) и ширина.
 * Возвращает { node, update(t) }.
 */
export function buildAnimatedBuilding(anim, place) {
  const k = place.width / 256; // единица картинки генератора → мир
  const left = place.x - place.width / 2;
  const top = place.y - anim.H * k;
  const at = (u, v) => [left + u * k, top + v * k];
  const node = new PIXI.Container();
  const updaters = [];

  const base = new PIXI.Sprite(anim.base);
  base.scale.set(place.width / anim.base.width);
  base.position.set(left, top);
  node.addChild(base);

  for (const p of anim.parts) {
    const [bx, by] = at(p.box[0], p.box[1]);
    if (p.type === "rotor") {
      const s = new PIXI.Sprite(p.textures[0]);
      s.position.set(bx, by);
      s.scale.set((p.box[2] * k) / p.textures[0].width);
      node.addChild(s);
      const n = p.textures.length;
      updaters.push((t) => { s.texture = p.textures[Math.floor((t / p.period) * n) % n]; });
      continue;
    }
    const s = new PIXI.Sprite(p.texture);
    s.scale.set((p.box[2] * k) / p.texture.width);
    node.addChild(s);
    const m = p.motion;
    const ph = ((m.seed ?? p.box[0]) % 7) * 0.9;
    updaters.push((t) => {
      let dx = 0;
      let dy = 0;
      if (m.kind === "chop") dy = -Math.abs(Math.sin(t * 4)) * m.amp;           // замах и удар
      else if (m.kind === "lift") dy = Math.sin(t * 1.5) * m.amp;                // груз на кране
      else if (m.kind === "shuttle") {                                           // туда-обратно по рельсам
        const q = 0.5 - 0.5 * Math.cos((t / m.period) * Math.PI * 2);
        dx = m.vec[0] * q;
        dy = m.vec[1] * q;
      } else if (m.kind === "wander") {                                          // животное бродит и покачивается
        dx = Math.sin(t * 0.6 + ph) * m.range;
        dy = Math.sin(t * 0.8 + ph * 1.7) * m.range * 0.45 - Math.abs(Math.sin(t * 5 + ph)) * m.range * 0.12;
      }
      s.position.set(bx + dx * k, by + dy * k);
    });
  }

  for (const e of anim.emitters) updaters.push(emitter(node, e, at, k));
  return { node, update: (t) => { for (const u of updaters) u(t); } };
}
