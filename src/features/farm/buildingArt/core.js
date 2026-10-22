// Ядро генератора изометрических SVG зданий.
//
// Геометрия совпадает с рендерером (isoUtils.js): шаг по колонке (+a, +a/2), по ряду (-a, +a/2).
// Картинка шириной 256 точно накрывает ромб основания w×h клеток, нижний угол ромба — нижний
// край картинки, поэтому спрайт с anchor(0.5, 1) встаёт ровно на свои клетки.
// Файл без зависимостей от Vite/React: его использует и игра, и tools/gen_buildings.mjs.

export const OUT = "#2b2118";

const f2 = (v) => v.toFixed(2);

export function shade(color, k) {
  const c = color.replace("#", "");
  const ch = (i) => Math.max(0, Math.min(255, Math.round(parseInt(c.slice(i, i + 2), 16) * k)));
  return "#" + [0, 2, 4].map((i) => ch(i).toString(16).padStart(2, "0")).join("");
}

/** Детерминированный генератор случайных чисел (mulberry32): одно зерно — один и тот же вариант. */
export function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rand, list) => list[Math.floor(rand() * list.length)];
export const chance = (rand, p = 0.5) => rand() < p;
export const between = (rand, lo, hi) => lo + (hi - lo) * rand();

export class Builder {
  /** w — колонки, h — ряды, zmax — запас высоты картинки над основанием (в клетках). */
  constructor(w, h, zmax) {
    this.w = w;
    this.h = h;
    this.a = 256 / (w + h);
    this.ox = h * this.a;
    this.oy = zmax * this.a + 4;
    this.H = this.oy + ((w + h) * this.a) / 2;
    this.el = [];
  }

  // ------------------------------------------------------------ геометрия --
  P(r, c, z = 0) {
    const a = this.a;
    return [this.ox + (c - r) * a, this.oy + ((c + r) * a) / 2 - z * a];
  }

  pts(points) {
    return points.map(([x, y]) => `${f2(x)},${f2(y)}`).join(" ");
  }

  poly(points, fill, stroke = OUT, sw = 1.2, extra = "") {
    this.el.push(`<polygon points="${this.pts(points)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`);
  }

  line(p, q, color = OUT, sw = 1.2) {
    this.el.push(`<line x1="${f2(p[0])}" y1="${f2(p[1])}" x2="${f2(q[0])}" y2="${f2(q[1])}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`);
  }

  raw(s) {
    this.el.push(s);
  }

  // ------------------------------------------------------------ примитивы --
  plate(color, inset = 0, z = 0.06) {
    this.box(inset, inset, this.h - inset, this.w - inset, 0, z, color, null, 1.0);
  }

  box(r0, c0, r1, c1, z0, z1, color, top = null, sw = 1.2) {
    const P = this.P.bind(this);
    this.poly([P(r1, c0, z0), P(r1, c1, z0), P(r1, c1, z1), P(r1, c0, z1)], shade(color, 0.9), OUT, sw);
    this.poly([P(r1, c1, z0), P(r0, c1, z0), P(r0, c1, z1), P(r1, c1, z1)], shade(color, 0.72), OUT, sw);
    this.poly([P(r0, c0, z1), P(r0, c1, z1), P(r1, c1, z1), P(r1, c0, z1)], top || shade(color, 1.08), OUT, sw);
  }

  /** Двускатная крыша. axis "c" — конёк вдоль колонок, "r" — вдоль рядов. */
  gable(r0, c0, r1, c1, z, zr, roof, wall, axis = "c", o = 0.12) {
    const P = this.P.bind(this);
    if (axis === "c") {
      const rm = (r0 + r1) / 2;
      this.poly([P(r0 - o, c0 - o, z), P(r0 - o, c1 + o, z), P(rm, c1 + o, zr), P(rm, c0 - o, zr)], shade(roof, 1.05));
      this.poly([P(r1, c1, z), P(r0, c1, z), P(rm, c1, zr)], shade(wall, 0.72));
      this.poly([P(r1 + o, c0 - o, z), P(r1 + o, c1 + o, z), P(rm, c1 + o, zr), P(rm, c0 - o, zr)], shade(roof, 0.88));
    } else {
      const cm = (c0 + c1) / 2;
      this.poly([P(r0 - o, c0 - o, z), P(r1 + o, c0 - o, z), P(r1 + o, cm, zr), P(r0 - o, cm, zr)], shade(roof, 1.05));
      this.poly([P(r1, c0, z), P(r1, c1, z), P(r1, cm, zr)], shade(wall, 0.9));
      this.poly([P(r0 - o, c1 + o, z), P(r1 + o, c1 + o, z), P(r1 + o, cm, zr), P(r0 - o, cm, zr)], shade(roof, 0.78));
    }
  }

  ellipseGround(r, c, R, z, fill, stroke = OUT, sw = 1.2, extra = "") {
    const [x, y] = this.P(r, c, z);
    const rx = R * this.a * Math.SQRT2;
    const ry = (R * this.a) / Math.SQRT2;
    this.raw(`<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(rx)}" ry="${f2(ry)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`);
  }

  cyl(r, c, R, z0, z1, color, top = null) {
    const [x0, y0] = this.P(r, c, z0);
    const [x1, y1] = this.P(r, c, z1);
    const rx = R * this.a * Math.SQRT2;
    const ry = (R * this.a) / Math.SQRT2;
    this.ellipseGround(r, c, R, z0, shade(color, 0.75));
    this.raw(`<path d="M${f2(x0 - rx)},${f2(y0)} A${f2(rx)},${f2(ry)} 0 0 0 ${f2(x0 + rx)},${f2(y0)} L${f2(x1 + rx)},${f2(y1)} L${f2(x1 - rx)},${f2(y1)} Z" fill="${shade(color, 0.85)}" stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round"/>`);
    this.ellipseGround(r, c, R, z1, top || shade(color, 1.1));
  }

  cone(r, c, R, z0, z1, color) {
    const [x0, y0] = this.P(r, c, z0);
    const [xa, ya] = this.P(r, c, z1);
    const rx = R * this.a * Math.SQRT2;
    this.ellipseGround(r, c, R, z0, shade(color, 0.7));
    this.raw(`<polygon points="${f2(x0 - rx)},${f2(y0)} ${f2(x0 + rx)},${f2(y0)} ${f2(xa)},${f2(ya)}" fill="${shade(color, 0.92)}" stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round"/>`);
    this.raw(`<polygon points="${f2(x0)},${f2(y0 + 0.2)} ${f2(x0 + rx)},${f2(y0)} ${f2(xa)},${f2(ya)}" fill="${shade(color, 0.75)}" stroke="none"/>`);
  }

  // -------------------------------------------- рисование в плоскости грани --
  /** Локальные координаты грани: u — вправо вдоль грани, v — вверх (в клетках).
   *  front: грань r=const (u вдоль +колонки), side: грань c=const (u вдоль −ряда). */
  face(kind, r, c, z) {
    const a = this.a;
    const [x, y] = this.P(r, c, z);
    const m = kind === "front" ? [a, a / 2, 0, -a, x, y] : [a, -a / 2, 0, -a, x, y];
    return `<g transform="matrix(${m.slice(0, 4).map((v) => v.toFixed(3)).join(",")},${f2(m[4])},${f2(m[5])})">`;
  }

  onFace(kind, r, c, z, inner) {
    this.raw(this.face(kind, r, c, z) + inner.replaceAll("NS", 'vector-effect="non-scaling-stroke"') + "</g>");
  }

  window(kind, r, c, z, u, v, w = 0.28, h = 0.26, glass = "#9ad7ff") {
    this.onFace(kind, r, c, z,
      `<rect x="${u}" y="${v}" width="${w}" height="${h}" fill="${glass}" stroke="${OUT}" stroke-width="1.1" NS/>` +
      `<line x1="${u + w / 2}" y1="${v}" x2="${u + w / 2}" y2="${v + h}" stroke="#f5f5f5" stroke-width="1" NS/>` +
      `<line x1="${u}" y1="${v + h / 2}" x2="${u + w}" y2="${v + h / 2}" stroke="#f5f5f5" stroke-width="1" NS/>`);
  }

  door(kind, r, c, z, u, w = 0.3, h = 0.5, color = "#7a4a24") {
    this.onFace(kind, r, c, z,
      `<rect x="${u}" y="0" width="${w}" height="${h}" fill="${color}" stroke="${OUT}" stroke-width="1.1" NS/>` +
      `<circle cx="${u + w * 0.78}" cy="${h * 0.45}" r="0.025" fill="#f2c94c"/>`);
  }

  linesOn(kind, r, c, z, length, height, step, color, sw = 0.8) {
    let s = "";
    for (let i = 1; i <= Math.floor(height / step); i++) {
      const v = step * i;
      if (v < height) s += `<line x1="0" y1="${v.toFixed(3)}" x2="${length}" y2="${v.toFixed(3)}" stroke="${color}" stroke-width="${sw}" NS/>`;
    }
    this.onFace(kind, r, c, z, s);
  }

  // ----------------------------------------------------------------- мелочи --
  smoke(r, c, z) {
    const [x, y] = this.P(r, c, z);
    const a = this.a;
    [[0.05, -0.25, 0.13], [0.2, -0.55, 0.17], [0.1, -0.9, 0.2]].forEach(([dx, dy, rr], i) => {
      this.raw(`<circle cx="${f2(x + dx * a)}" cy="${f2(y + dy * a)}" r="${f2(rr * a)}" fill="#eceff1" fill-opacity="${(0.85 - i * 0.2).toFixed(2)}" stroke="#b0bec5" stroke-width="0.8"/>`);
    });
  }

  animal(r, c, body, head, legs = OUT, { k = 1, spots = null, spotColor = "#212121", fluffy = false } = {}) {
    const a = this.a * k;
    const [x, y] = this.P(r, c, 0.16 * k);
    for (const dx of [-0.12, 0.1]) this.line([x + dx * a, y + 0.05 * a], [x + dx * a, y + 0.16 * a], legs, 1.6);
    if (fluffy) {
      for (const [dx, dy] of [[-0.12, 0], [0, -0.05], [0.12, 0], [-0.05, 0.04], [0.07, 0.04]]) {
        this.raw(`<circle cx="${f2(x + dx * a)}" cy="${f2(y + dy * a)}" r="${f2(0.1 * a)}" fill="${body}" stroke="${OUT}" stroke-width="0.9"/>`);
      }
    } else {
      this.raw(`<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(0.2 * a)}" ry="${f2(0.11 * a)}" fill="${body}" stroke="${OUT}" stroke-width="1"/>`);
    }
    for (const [sx, sy] of spots || []) {
      this.raw(`<ellipse cx="${f2(x + sx * a)}" cy="${f2(y + sy * a)}" rx="${f2(0.05 * a)}" ry="${f2(0.035 * a)}" fill="${spotColor}"/>`);
    }
    this.raw(`<ellipse cx="${f2(x + 0.21 * a)}" cy="${f2(y - 0.06 * a)}" rx="${f2(0.08 * a)}" ry="${f2(0.065 * a)}" fill="${head}" stroke="${OUT}" stroke-width="1"/>`);
  }

  /** Забор по отрезку на земле (r0,c0)→(r1,c1): столбики и две жерди. */
  fence(r0, c0, r1, c1, color = "#8d6e63", hgt = 0.28) {
    const n = Math.max(2, Math.floor(Math.hypot(r1 - r0, c1 - c0) / 0.35) + 1);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const r = r0 + (r1 - r0) * t;
      const c = c0 + (c1 - c0) * t;
      this.line(this.P(r, c, 0), this.P(r, c, hgt), shade(color, 0.7), 2.2);
    }
    for (const zz of [hgt * 0.45, hgt * 0.9]) this.line(this.P(r0, c0, zz), this.P(r1, c1, zz), color, 1.8);
  }

  /** Клумба/куст у стены: зелёный круг с цветами. */
  bush(r, c, flowers = "#e57373", R = 0.12) {
    this.ellipseGround(r, c, R, 0.12, "#43a047", OUT, 0.8);
    const [x, y] = this.P(r, c, 0.16);
    for (const [dx, dy] of [[-0.06, 0], [0.05, -0.02], [0, 0.03]]) {
      this.raw(`<circle cx="${f2(x + dx * this.a)}" cy="${f2(y + dy * this.a)}" r="${f2(0.03 * this.a)}" fill="${flowers}"/>`);
    }
  }

  svg() {
    const W = 256;
    const H = Math.ceil(this.H);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">\n  ${this.el.join("\n  ")}\n</svg>\n`;
  }
}
