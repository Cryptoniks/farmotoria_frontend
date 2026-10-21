"""Генератор изометрических SVG зданий Farmotoria.

Геометрия совпадает с рендерером (isoUtils.js): шаг по колонке (+a, +a/2), по ряду (-a, +a/2).
Картинка шириной 256 точно накрывает ромб основания w×h клеток, нижний угол ромба — нижний край картинки,
поэтому спрайт с anchor(0.5, 1) встаёт ровно на свои клетки.

Запуск (из корня фронтенда, нужен только Python 3):
    python tools/gen_buildings.py              # перезаписывает src/assets/buildings/<slug>.svg
    python tools/gen_buildings.py <папка>      # сохранить в другую папку, например для предпросмотра

Размеры w×h в B(w, h, zmax) должны совпадать с BUILDINGS в бэкенде (seed_game_data.py):
w — ширина (колонки), h — высота (ряды), zmax — запас высоты картинки над основанием в клетках.
Новое здание: функция рисования + строка в словаре BUILDINGS внизу файла.
"""
import math
import os
import sys

OUT = "#2b2118"
OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "src", "assets", "buildings")


def shade(color, k):
    c = color.lstrip("#")
    r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
    f = lambda v: max(0, min(255, round(v * k)))
    return f"#{f(r):02x}{f(g):02x}{f(b):02x}"


class B:
    def __init__(self, w, h, zmax):
        self.w, self.h = w, h
        self.a = 256 / (w + h)
        self.ox = h * self.a
        self.oy = zmax * self.a + 4
        self.H = self.oy + (w + h) * self.a / 2
        self.el = []

    # -------------------------------------------------------------- геометрия --
    def P(self, r, c, z=0.0):
        a = self.a
        return (self.ox + (c - r) * a, self.oy + (c + r) * a / 2 - z * a)

    def _pts(self, pts):
        return " ".join(f"{x:.2f},{y:.2f}" for x, y in pts)

    def poly(self, pts, fill, stroke=OUT, sw=1.2, extra=""):
        self.el.append(f'<polygon points="{self._pts(pts)}" fill="{fill}" stroke="{stroke}" '
                       f'stroke-width="{sw}" stroke-linejoin="round" {extra}/>')

    def line(self, p, q, color=OUT, sw=1.2):
        self.el.append(f'<line x1="{p[0]:.2f}" y1="{p[1]:.2f}" x2="{q[0]:.2f}" y2="{q[1]:.2f}" '
                       f'stroke="{color}" stroke-width="{sw}" stroke-linecap="round"/>')

    def raw(self, s):
        self.el.append(s)

    # ------------------------------------------------------------- примитивы --
    def plate(self, color, inset=0.0, z=0.06):
        self.box(inset, inset, self.h - inset, self.w - inset, 0, z, color, sw=1.0)

    def box(self, r0, c0, r1, c1, z0, z1, color, top=None, sw=1.2):
        P = self.P
        self.poly([P(r1, c0, z0), P(r1, c1, z0), P(r1, c1, z1), P(r1, c0, z1)], shade(color, 0.9), sw=sw)
        self.poly([P(r1, c1, z0), P(r0, c1, z0), P(r0, c1, z1), P(r1, c1, z1)], shade(color, 0.72), sw=sw)
        self.poly([P(r0, c0, z1), P(r0, c1, z1), P(r1, c1, z1), P(r1, c0, z1)], top or shade(color, 1.08), sw=sw)

    def gable(self, r0, c0, r1, c1, z, zr, roof, wall, axis="c", o=0.12):
        P = self.P
        if axis == "c":  # конёк вдоль колонок
            rm = (r0 + r1) / 2
            self.poly([P(r0 - o, c0 - o, z), P(r0 - o, c1 + o, z), P(rm, c1 + o, zr), P(rm, c0 - o, zr)], shade(roof, 1.05))
            self.poly([P(r1, c1, z), P(r0, c1, z), P(rm, c1, zr)], shade(wall, 0.72))
            self.poly([P(r1 + o, c0 - o, z), P(r1 + o, c1 + o, z), P(rm, c1 + o, zr), P(rm, c0 - o, zr)], shade(roof, 0.88))
        else:  # конёк вдоль рядов
            cm = (c0 + c1) / 2
            self.poly([P(r0 - o, c0 - o, z), P(r1 + o, c0 - o, z), P(r1 + o, cm, zr), P(r0 - o, cm, zr)], shade(roof, 1.05))
            self.poly([P(r1, c0, z), P(r1, c1, z), P(r1, cm, zr)], shade(wall, 0.9))
            self.poly([P(r0 - o, c1 + o, z), P(r1 + o, c1 + o, z), P(r1 + o, cm, zr), P(r0 - o, cm, zr)], shade(roof, 0.78))

    def ellipse_ground(self, r, c, R, z, fill, stroke=OUT, sw=1.2, extra=""):
        x, y = self.P(r, c, z)
        rx, ry = R * self.a * math.sqrt(2), R * self.a / math.sqrt(2)
        self.raw(f'<ellipse cx="{x:.2f}" cy="{y:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" fill="{fill}" '
                 f'stroke="{stroke}" stroke-width="{sw}" {extra}/>')

    def cyl(self, r, c, R, z0, z1, color, top=None):
        x0, y0 = self.P(r, c, z0)
        x1, y1 = self.P(r, c, z1)
        rx, ry = R * self.a * math.sqrt(2), R * self.a / math.sqrt(2)
        self.ellipse_ground(r, c, R, z0, shade(color, 0.75))
        self.raw(f'<path d="M{x0 - rx:.2f},{y0:.2f} A{rx:.2f},{ry:.2f} 0 0 0 {x0 + rx:.2f},{y0:.2f} '
                 f'L{x1 + rx:.2f},{y1:.2f} L{x1 - rx:.2f},{y1:.2f} Z" fill="{shade(color, 0.85)}" stroke="{OUT}" '
                 f'stroke-width="1.2" stroke-linejoin="round"/>')
        self.ellipse_ground(r, c, R, z1, top or shade(color, 1.1))

    def cone(self, r, c, R, z0, z1, color):
        x0, y0 = self.P(r, c, z0)
        xa, ya = self.P(r, c, z1)
        rx = R * self.a * math.sqrt(2)
        self.ellipse_ground(r, c, R, z0, shade(color, 0.7))
        self.raw(f'<polygon points="{x0 - rx:.2f},{y0:.2f} {x0 + rx:.2f},{y0:.2f} {xa:.2f},{ya:.2f}" '
                 f'fill="{shade(color, 0.92)}" stroke="{OUT}" stroke-width="1.2" stroke-linejoin="round"/>')
        self.raw(f'<polygon points="{x0:.2f},{y0 + 0.2:.2f} {x0 + rx:.2f},{y0:.2f} {xa:.2f},{ya:.2f}" '
                 f'fill="{shade(color, 0.75)}" stroke="none"/>')

    # ---------------------------------------------- рисование в плоскости грани --
    def face(self, kind, r, c, z):
        """Группа с локальными координатами грани: u — вправо вдоль грани, v — вверх (в клетках).
        front: грань r=const (u вдоль +колонки), side: грань c=const (u вдоль −ряда)."""
        a = self.a
        x, y = self.P(r, c, z)
        if kind == "front":
            m = (a, a / 2, 0, -a, x, y)
        else:
            m = (a, -a / 2, 0, -a, x, y)
        return "<g transform=\"matrix({:.3f},{:.3f},{:.3f},{:.3f},{:.2f},{:.2f})\">".format(*m)

    def on_face(self, kind, r, c, z, inner):
        ns = 'vector-effect="non-scaling-stroke"'
        self.raw(self.face(kind, r, c, z) + inner.replace("NS", ns) + "</g>")

    def rect_on(self, kind, r, c, z, u, v, w, h, fill, sw=1.0):
        self.on_face(kind, r, c, z,
                     f'<rect x="{u}" y="{v}" width="{w}" height="{h}" fill="{fill}" stroke="{OUT}" stroke-width="{sw}" NS/>')

    def window(self, kind, r, c, z, u, v, w=0.28, h=0.26):
        self.on_face(kind, r, c, z,
                     f'<rect x="{u}" y="{v}" width="{w}" height="{h}" fill="#9ad7ff" stroke="{OUT}" stroke-width="1.1" NS/>'
                     f'<line x1="{u + w / 2}" y1="{v}" x2="{u + w / 2}" y2="{v + h}" stroke="#f5f5f5" stroke-width="1" NS/>'
                     f'<line x1="{u}" y1="{v + h / 2}" x2="{u + w}" y2="{v + h / 2}" stroke="#f5f5f5" stroke-width="1" NS/>')

    def door(self, kind, r, c, z, u, w=0.3, h=0.5, color="#7a4a24"):
        self.on_face(kind, r, c, z,
                     f'<rect x="{u}" y="0" width="{w}" height="{h}" fill="{color}" stroke="{OUT}" stroke-width="1.1" NS/>'
                     f'<circle cx="{u + w * 0.78}" cy="{h * 0.45}" r="{0.025}" fill="#f2c94c"/>')

    def lines_on(self, kind, r, c, z, length, height, step, color, sw=0.8):
        s = "".join(f'<line x1="0" y1="{v:.3f}" x2="{length}" y2="{v:.3f}" stroke="{color}" stroke-width="{sw}" NS/>'
                    for v in [step * i for i in range(1, int(height / step) + 1) if step * i < height])
        self.on_face(kind, r, c, z, s)

    # ---------------------------------------------------------------- мелочи --
    def smoke(self, r, c, z):
        x, y = self.P(r, c, z)
        a = self.a
        for i, (dx, dy, rr) in enumerate([(0.05, -0.25, 0.13), (0.2, -0.55, 0.17), (0.1, -0.9, 0.2)]):
            self.raw(f'<circle cx="{x + dx * a:.2f}" cy="{y + dy * a:.2f}" r="{rr * a:.2f}" fill="#eceff1" '
                     f'fill-opacity="{0.85 - i * 0.2:.2f}" stroke="#b0bec5" stroke-width="0.8"/>')

    def animal(self, r, c, body, head, legs=OUT, k=1.0, spots=None, fluffy=False):
        a = self.a * k
        x, y = self.P(r, c, 0.16 * k)
        for dx in (-0.12, 0.1):
            self.line((x + dx * a, y + 0.05 * a), (x + dx * a, y + 0.16 * a), legs, 1.6)
        if fluffy:
            for dx, dy in [(-0.12, 0), (0, -0.05), (0.12, 0), (-0.05, 0.04), (0.07, 0.04)]:
                self.raw(f'<circle cx="{x + dx * a:.2f}" cy="{y + dy * a:.2f}" r="{0.1 * a:.2f}" fill="{body}" '
                         f'stroke="{OUT}" stroke-width="0.9"/>')
        else:
            self.raw(f'<ellipse cx="{x:.2f}" cy="{y:.2f}" rx="{0.2 * a:.2f}" ry="{0.11 * a:.2f}" fill="{body}" '
                     f'stroke="{OUT}" stroke-width="1"/>')
        for sx, sy in spots or []:
            self.raw(f'<ellipse cx="{x + sx * a:.2f}" cy="{y + sy * a:.2f}" rx="{0.05 * a:.2f}" ry="{0.035 * a:.2f}" fill="#212121"/>')
        self.raw(f'<ellipse cx="{x + 0.21 * a:.2f}" cy="{y - 0.06 * a:.2f}" rx="{0.08 * a:.2f}" ry="{0.065 * a:.2f}" '
                 f'fill="{head}" stroke="{OUT}" stroke-width="1"/>')

    def fence(self, r0, c0, r1, c1, color="#8d6e63", hgt=0.28):
        """Забор по отрезку на земле (r0,c0)→(r1,c1): столбики и две жерди."""
        n = max(2, int(math.hypot(r1 - r0, c1 - c0) / 0.35) + 1)
        for i in range(n):
            t = i / (n - 1)
            r, c = r0 + (r1 - r0) * t, c0 + (c1 - c0) * t
            self.line(self.P(r, c, 0), self.P(r, c, hgt), shade(color, 0.7), 2.2)
        for zz in (hgt * 0.45, hgt * 0.9):
            self.line(self.P(r0, c0, zz), self.P(r1, c1, zz), color, 1.8)

    def svg(self):
        W, H = 256, math.ceil(self.H)
        body = "\n  ".join(self.el)
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W * 2}" height="{H * 2}">\n'
                f'  {body}\n</svg>\n')


GRASS = "#8bc34a"
DIRT = "#b39a6b"
GRAVEL = "#a7a39b"


# ======================================================================= здания ==
def house():
    b = B(2, 3, 2.0)
    b.plate(GRASS)
    wall, roof = "#ecd9b0", "#c0392b"
    b.box(0.35, 0.3, 2.6, 1.7, 0.06, 0.95, wall)
    b.lines_on("side", 2.6, 1.7, 0.06, 2.25, 0.89, 0.15, shade(wall, 0.6), 0.6)
    b.door("front", 2.6, 0.3, 0.06, 0.55, 0.3, 0.55)
    b.window("side", 2.6, 1.7, 0.06, 0.35, 0.38)
    b.window("side", 2.6, 1.7, 0.06, 1.45, 0.38)
    b.gable(0.35, 0.3, 2.6, 1.7, 0.95, 1.6, roof, wall, axis="r")
    b.window("front", 2.6, 0.3, 0.95, 0.55, 0.12, 0.3, 0.22)
    b.box(1.0, 1.15, 1.25, 1.4, 1.2, 1.85, "#8d6e63")
    b.smoke(1.12, 1.27, 1.85)
    b.ellipse_ground(2.85, 1.3, 0.12, 0.06, "#e57373", sw=0.8)
    return b


def warehouse():
    b = B(5, 5, 2.6)
    b.plate(GRAVEL)
    wall, roof = "#8fa5b8", "#5d6d7e"
    b.box(0.35, 0.35, 3.8, 4.65, 0.06, 1.55, wall)
    b.on_face("side", 3.8, 4.65, 0.06, "".join(
        f'<line x1="{u / 5:.2f}" y1="0" x2="{u / 5:.2f}" y2="1.49" stroke="{shade(wall, 0.6)}" stroke-width="0.7" NS/>'
        for u in range(1, 18)))
    b.on_face("front", 3.8, 0.35, 0.06,
              f'<rect x="1.5" y="0" width="1.3" height="1.05" fill="#4b5a69" stroke="{OUT}" stroke-width="1.2" NS/>'
              + "".join(f'<line x1="1.5" y1="{v / 10:.2f}" x2="2.8" y2="{v / 10:.2f}" stroke="#6b7b8a" stroke-width="0.8" NS/>'
                        for v in range(1, 10))
              + f'<rect x="1.4" y="1.05" width="1.5" height="0.08" fill="#f2c94c" stroke="{OUT}" stroke-width="0.8" NS/>')
    for u in (0.5, 3.5):
        b.window("front", 3.8, 0.35, 0.06, u, 0.95, 0.4, 0.25)
    b.gable(0.35, 0.35, 3.8, 4.65, 1.55, 2.35, roof, wall, axis="c")
    for r0, c0, z0 in [(4.1, 0.6, 0.06), (4.1, 1.05, 0.06), (4.1, 0.8, 0.46), (4.15, 3.6, 0.06)]:
        b.box(r0, c0, r0 + 0.4, c0 + 0.4, z0, z0 + 0.4, "#c8a165")
    return b


def barn():
    b = B(2, 2, 1.7)
    b.plate(DIRT)
    wall, roof = "#b23a2e", "#4e342e"
    b.box(0.25, 0.25, 1.7, 1.75, 0.06, 0.9, wall)
    b.on_face("front", 1.7, 0.25, 0.06,
              f'<rect x="0.45" y="0" width="0.6" height="0.62" fill="#7b241c" stroke="#fafafa" stroke-width="1.6" NS/>'
              f'<line x1="0.45" y1="0" x2="1.05" y2="0.62" stroke="#fafafa" stroke-width="1.4" NS/>'
              f'<line x1="1.05" y1="0" x2="0.45" y2="0.62" stroke="#fafafa" stroke-width="1.4" NS/>')
    b.window("side", 1.7, 1.75, 0.06, 0.55, 0.45)
    b.gable(0.25, 0.25, 1.7, 1.75, 0.9, 1.5, roof, wall, axis="c")
    b.cyl(1.88, 1.75, 0.13, 0.06, 0.3, "#e6c76a")
    return b


def lumberjack_hut():
    b = B(2, 2, 1.5)
    b.plate("#7cb342")
    wall, roof = "#8d5a2b", "#6d8b3a"
    b.box(0.2, 0.2, 1.25, 1.45, 0.06, 0.72, wall)
    b.lines_on("front", 1.25, 0.2, 0.06, 1.25, 0.66, 0.13, shade(wall, 0.55))
    b.lines_on("side", 1.25, 1.45, 0.06, 1.05, 0.66, 0.13, shade(wall, 0.55))
    b.door("front", 1.25, 0.2, 0.06, 0.45, 0.28, 0.46)
    b.window("side", 1.25, 1.45, 0.06, 0.4, 0.3, 0.24, 0.2)
    b.gable(0.2, 0.2, 1.25, 1.45, 0.72, 1.2, roof, wall, axis="c")
    b.box(1.45, 0.25, 1.85, 1.1, 0.06, 0.38, "#a0522d")
    b.on_face("side", 1.85, 1.1, 0.06, "".join(
        f'<circle cx="{u}" cy="{v}" r="0.07" fill="#deb887" stroke="{OUT}" stroke-width="0.8" NS/>'
        for u, v in [(0.1, 0.08), (0.25, 0.08), (0.175, 0.22)]))
    b.cyl(1.6, 1.6, 0.16, 0.06, 0.25, "#8d6e63", "#e3c08a")
    x, y = b.P(1.6, 1.6, 0.25)
    b.line((x - 2, y), (x + 0.25 * b.a, y - 0.35 * b.a), "#6d4c41", 2.2)
    b.poly([(x + 0.18 * b.a, y - 0.4 * b.a), (x + 0.34 * b.a, y - 0.36 * b.a), (x + 0.3 * b.a, y - 0.24 * b.a)], "#b0bec5", sw=1)
    return b


def quarry():
    b = B(3, 3, 1.8)
    b.plate(GRAVEL)
    b.box(0.15, 0.15, 2.3, 2.6, 0.06, 0.35, "#9e9e9e")
    b.box(0.15, 0.15, 1.6, 1.9, 0.35, 0.7, "#8a8a8a")
    b.box(0.15, 0.15, 0.95, 1.1, 0.7, 1.05, "#787878")
    for r, c, z in [(1.9, 2.0, 0.35), (1.3, 1.3, 0.7), (0.7, 0.8, 1.05)]:
        b.ellipse_ground(r, c, 0.07, z, "#6f6f6f", sw=0.6)
    b.box(2.0, 0.25, 2.3, 0.55, 0.35, 0.6, "#cfcfcf")
    b.line(b.P(2.45, 2.55, 0.06), b.P(2.45, 2.55, 1.4), "#5d4037", 3)
    b.line(b.P(2.45, 2.55, 1.35), b.P(2.0, 1.9, 1.25), "#5d4037", 2.4)
    b.line(b.P(2.0, 1.9, 1.25), b.P(2.0, 1.9, 0.75), "#424242", 1)
    b.box(1.92, 1.82, 2.08, 1.98, 0.55, 0.72, "#d6d6d6")
    b.box(2.45, 0.6, 2.8, 1.25, 0.12, 0.38, "#6d4c41")
    b.box(2.5, 0.68, 2.75, 1.17, 0.38, 0.48, "#bdbdbd", top="#cfcfcf")
    b.on_face("front", 2.8, 0.6, 0.12, "".join(
        f'<circle cx="{u}" cy="0" r="0.09" fill="#37474f" stroke="{OUT}" stroke-width="0.8" NS/>' for u in (0.15, 0.5)))
    return b


def mine():
    b = B(3, 3, 1.7)
    b.plate("#9c8a72")
    rock = "#7b6a58"
    b.box(0.1, 0.1, 2.25, 2.7, 0.06, 0.85, rock)
    b.box(0.1, 0.1, 1.5, 1.9, 0.85, 1.35, shade(rock, 0.9))
    b.box(0.1, 0.1, 0.8, 1.0, 1.35, 1.6, shade(rock, 0.82))
    b.on_face("front", 2.25, 0.1, 0.06,
              f'<rect x="0.85" y="0" width="0.75" height="0.62" fill="#141414" stroke="{OUT}" stroke-width="1" NS/>'
              f'<rect x="0.8" y="0" width="0.1" height="0.68" fill="#8d6e63" stroke="{OUT}" stroke-width="1" NS/>'
              f'<rect x="1.55" y="0" width="0.1" height="0.68" fill="#8d6e63" stroke="{OUT}" stroke-width="1" NS/>'
              f'<rect x="0.75" y="0.62" width="0.95" height="0.1" fill="#8d6e63" stroke="{OUT}" stroke-width="1" NS/>'
              f'<circle cx="1.85" cy="0.5" r="0.06" fill="#ffb300" stroke="{OUT}" stroke-width="0.8" NS/>')
    for c in (1.08, 1.42):
        b.line(b.P(2.25, c, 0.07), b.P(2.95, c, 0.07), "#5d4037", 1.6)
    for r in (2.4, 2.6, 2.8):
        b.line(b.P(r, 1.0, 0.07), b.P(r, 1.5, 0.07), "#795548", 1.4)
    b.box(2.4, 1.0, 2.8, 1.5, 0.1, 0.38, "#607d8b")
    x, y = b.P(2.6, 1.25, 0.38)
    for dx, dy, col in [(-0.1, 0, "#424242"), (0.08, -0.02, "#5d4037"), (0, -0.07, "#ff8f00")]:
        b.raw(f'<circle cx="{x + dx * b.a:.2f}" cy="{y + dy * b.a:.2f}" r="{0.07 * b.a:.2f}" fill="{col}" stroke="{OUT}" stroke-width="0.8"/>')
    return b


def water_mill():
    b = B(2, 2, 1.6)
    b.plate(GRASS)
    b.box(0.0, 1.5, 2.0, 2.0, 0.0, 0.07, "#4fa3e0", top="#64b5f6", sw=0.8)
    wall, roof = "#d7ccc8", "#8d4e2a"
    b.box(0.3, 0.2, 1.6, 1.38, 0.06, 0.8, wall)
    b.door("front", 1.6, 0.2, 0.06, 0.4, 0.28, 0.45)
    b.window("front", 1.6, 0.2, 0.06, 0.8, 0.4, 0.22, 0.2)
    b.gable(0.3, 0.2, 1.6, 1.38, 0.8, 1.3, roof, wall, axis="r")
    spokes = "".join(
        f'<line x1="0" y1="0" x2="{0.45 * math.cos(t):.3f}" y2="{0.45 * math.sin(t):.3f}" stroke="#5d4037" stroke-width="1.4" NS/>'
        for t in [i * math.pi / 4 for i in range(8)])
    paddles = "".join(
        f'<rect x="{0.42 * math.cos(t) - 0.05:.3f}" y="{0.42 * math.sin(t) - 0.05:.3f}" width="0.1" height="0.1" '
        f'fill="#8d6e63" stroke="{OUT}" stroke-width="0.8" NS/>'
        for t in [i * math.pi / 4 for i in range(8)])
    b.on_face("side", 0.95, 1.55, 0.45,
              f'<circle cx="0" cy="0" r="0.45" fill="none" stroke="#5d4037" stroke-width="3" NS/>' + spokes + paddles
              + f'<circle cx="0" cy="0" r="0.07" fill="#4e342e" NS/>')
    return b


def sawmill():
    b = B(3, 2, 1.7)
    b.plate(DIRT)
    for r, c in [(0.3, 0.3), (0.3, 2.3), (1.42, 0.3), (1.42, 2.3)]:
        b.box(r, c, r + 0.09, c + 0.09, 0.06, 1.0, "#5d4037")
    b.box(0.65, 0.5, 1.1, 2.1, 0.06, 0.42, "#a1887f")
    b.box(0.75, 0.6, 1.0, 2.0, 0.42, 0.62, "#8d5a2b")
    b.on_face("front", 0.95, 1.3, 0.55,
              f'<circle cx="0" cy="0" r="0.26" fill="#cfd8dc" stroke="{OUT}" stroke-width="1" NS/>'
              f'<circle cx="0" cy="0" r="0.05" fill="#607d8b" NS/>')
    b.gable(0.3, 0.3, 1.51, 2.39, 1.0, 1.45, "#8d6e63", "#8d6e63", axis="c")
    for i in range(3):
        b.box(1.62, 0.35, 1.92, 1.65, 0.06 + i * 0.12, 0.18 + i * 0.12, "#deb887")
    return b


def stonecutter_hut():
    b = B(2, 2, 1.5)
    b.plate(GRAVEL)
    wall, roof = "#a0a4a8", "#546e7a"
    b.box(0.25, 0.25, 1.3, 1.75, 0.06, 0.75, wall)
    for kind, r, c, length in [("front", 1.3, 0.25, 1.5), ("side", 1.3, 1.75, 1.05)]:
        b.lines_on(kind, r, c, 0.06, length, 0.69, 0.17, shade(wall, 0.6))
    b.door("front", 1.3, 0.25, 0.06, 0.55, 0.3, 0.48, "#6d4c41")
    b.window("side", 1.3, 1.75, 0.06, 0.4, 0.32, 0.24, 0.2)
    b.gable(0.25, 0.25, 1.3, 1.75, 0.75, 1.2, roof, wall, axis="c")
    for r0, c0, z0 in [(1.45, 0.3, 0.06), (1.45, 0.75, 0.06), (1.45, 0.52, 0.36), (1.5, 1.35, 0.06)]:
        b.box(r0, c0, r0 + 0.35, c0 + 0.35, z0, z0 + 0.3, "#d5d8da")
    return b


def blacksmith():
    b = B(3, 3, 2.4)
    b.plate(GRAVEL)
    wall, roof = "#6f6a66", "#3e2723"
    b.box(0.3, 0.3, 2.0, 2.4, 0.06, 1.0, wall)
    b.lines_on("front", 2.0, 0.3, 0.06, 2.1, 0.94, 0.2, shade(wall, 0.65))
    b.on_face("front", 2.0, 0.3, 0.06,
              f'<rect x="0.5" y="0.12" width="0.7" height="0.45" fill="#ff8f00" stroke="{OUT}" stroke-width="1.2" NS/>'
              f'<rect x="0.6" y="0.17" width="0.5" height="0.2" fill="#ffd54f" NS/>')
    b.door("side", 2.0, 2.4, 0.06, 0.5, 0.35, 0.6, "#4e342e")
    b.gable(0.3, 0.3, 2.0, 2.4, 1.0, 1.6, roof, wall, axis="c")
    b.box(0.6, 1.75, 1.0, 2.15, 0.9, 2.05, "#5a4a42")
    b.ellipse_ground(0.8, 1.95, 0.12, 2.05, "#ff7043", sw=0.8)
    b.smoke(0.8, 1.95, 2.05)
    b.box(2.3, 1.0, 2.5, 1.45, 0.06, 0.2, "#424242")
    b.box(2.25, 0.9, 2.55, 1.6, 0.2, 0.34, "#546e7a")
    return b


def mill():
    b = B(2, 2, 2.6)
    b.plate(GRASS)
    b.box(0.55, 0.55, 1.45, 1.45, 0.06, 1.45, "#f2e3c4")
    b.door("front", 1.45, 0.55, 0.06, 0.3, 0.3, 0.45)
    b.window("side", 1.45, 1.45, 0.06, 0.32, 0.8, 0.24, 0.22)
    b.cone(1.0, 1.0, 0.6, 1.45, 2.4, "#8d4e2a")
    blades = "".join(
        f'<g transform="rotate({ang})"><rect x="0.06" y="-0.09" width="0.85" height="0.18" fill="#fafafa" '
        f'stroke="{OUT}" stroke-width="1" NS/>'
        + "".join(f'<line x1="{0.06 + 0.17 * k:.2f}" y1="-0.09" x2="{0.06 + 0.17 * k:.2f}" y2="0.09" stroke="#9e9e9e" stroke-width="0.7" NS/>'
                  for k in range(1, 5))
        + "</g>"
        for ang in (20, 110, 200, 290))
    b.on_face("front", 1.5, 1.0, 1.35, blades + f'<circle cx="0" cy="0" r="0.08" fill="#5d4037" stroke="{OUT}" stroke-width="1" NS/>')
    return b


def bakery():
    b = B(3, 3, 2.1)
    b.plate("#c8b08a")
    wall, roof = "#f3d9a4", "#d35400"
    b.box(0.3, 0.3, 2.2, 2.5, 0.06, 1.0, wall)
    b.on_face("front", 2.2, 0.3, 0.06,
              f'<rect x="0.25" y="0.15" width="0.8" height="0.45" fill="#9ad7ff" stroke="{OUT}" stroke-width="1.2" NS/>'
              f'<ellipse cx="0.65" cy="0.32" rx="0.22" ry="0.09" fill="#d4a056" stroke="{OUT}" stroke-width="0.9" NS/>'
              + "".join(f'<rect x="{0.2 + i * 0.18:.2f}" y="0.62" width="0.18" height="0.12" fill="{c}" stroke="{OUT}" stroke-width="0.8" NS/>'
                        for i, c in enumerate(["#e53935", "#fafafa"] * 3))
              + f'<rect x="1.35" y="0" width="0.36" height="0.6" fill="#7a4a24" stroke="{OUT}" stroke-width="1.1" NS/>'
              + f'<ellipse cx="1.53" cy="0.78" rx="0.2" ry="0.1" fill="#d4a056" stroke="{OUT}" stroke-width="1" NS/>')
    b.window("side", 2.2, 2.5, 0.06, 0.4, 0.4)
    b.window("side", 2.2, 2.5, 0.06, 1.2, 0.4)
    b.gable(0.3, 0.3, 2.2, 2.5, 1.0, 1.65, roof, wall, axis="r")
    b.box(0.8, 1.9, 1.1, 2.2, 1.2, 1.85, "#8d6e63")
    b.smoke(0.95, 2.05, 1.85)
    return b


def sauce_factory():
    b = B(4, 3, 2.3)
    b.plate("#b0b0b0")
    wall, roof = "#b5533c", "#6d3a2c"
    b.box(0.3, 0.3, 2.4, 2.6, 0.06, 1.05, wall)
    b.lines_on("front", 2.4, 0.3, 0.06, 2.3, 0.99, 0.12, shade(wall, 0.7), 0.5)
    for u in (0.2, 0.75):
        b.window("front", 2.4, 0.3, 0.06, u, 0.5, 0.36, 0.3)
    b.door("front", 2.4, 0.3, 0.06, 1.35, 0.45, 0.6, "#5d4037")
    b.on_face("front", 2.4, 0.3, 0.06,
              f'<circle cx="2.0" cy="0.72" r="0.18" fill="#e53935" stroke="{OUT}" stroke-width="1" NS/>'
              f'<path d="M1.95,0.88 L2.0,0.97 L2.06,0.88 Z" fill="#43a047" stroke="{OUT}" stroke-width="0.7" NS/>')
    b.gable(0.3, 0.3, 2.4, 2.6, 1.05, 1.6, roof, wall, axis="c")
    b.cyl(0.75, 0.75, 0.12, 1.2, 2.1, "#9e9e9e")
    for r in (0.9, 2.05):
        b.cyl(r, 3.3, 0.36, 0.06, 1.3, "#e53935", "#ef9a9a")
    b.line(b.P(1.4, 2.6, 0.8), b.P(1.4, 3.05, 0.8), "#757575", 3)
    return b


def butter_factory():
    b = B(4, 3, 2.2)
    b.plate("#cfd8dc")
    wall, roof = "#f5f0e1", "#1e88e5"
    b.box(0.3, 0.3, 2.4, 2.6, 0.06, 1.0, wall)
    for u in (0.2, 0.75):
        b.window("front", 2.4, 0.3, 0.06, u, 0.45, 0.36, 0.3)
    b.door("front", 2.4, 0.3, 0.06, 1.3, 0.45, 0.6, "#455a64")
    b.on_face("front", 2.4, 0.3, 0.06,
              f'<rect x="1.8" y="0.55" width="0.38" height="0.22" fill="#ffe082" stroke="{OUT}" stroke-width="1" NS/>'
              f'<rect x="1.8" y="0.55" width="0.38" height="0.07" fill="#ffca28" stroke="{OUT}" stroke-width="0.7" NS/>')
    b.gable(0.3, 0.3, 2.4, 2.6, 1.0, 1.55, roof, wall, axis="c")
    for r in (0.85, 2.0):
        b.cyl(r, 3.3, 0.38, 0.06, 1.45, "#eceff1")
        b.cone(r, 3.3, 0.38, 1.45, 1.85, "#90a4ae")
    b.cyl(2.7, 1.85, 0.1, 0.06, 0.32, "#b0bec5", "#eceff1")
    return b


def chicken_coop():
    b = B(2, 2, 1.4)
    b.plate("#e6c76a")
    b.fence(0.05, 1.95, 1.95, 1.95)
    for r, c in [(1.0, 0.3), (1.0, 1.25), (0.3, 1.25)]:
        b.box(r, c, r + 0.07, c + 0.07, 0.06, 0.3, "#5d4037")
    b.box(0.3, 0.3, 1.05, 1.3, 0.3, 0.75, "#c97b4a")
    b.on_face("front", 1.05, 0.3, 0.3,
              f'<rect x="0.4" y="0.02" width="0.2" height="0.22" fill="#3e2723" stroke="{OUT}" stroke-width="1" NS/>')
    b.poly([b.P(1.05, 0.7, 0.3), b.P(1.05, 0.9, 0.3), b.P(1.5, 0.9, 0.06), b.P(1.5, 0.7, 0.06)], "#a1887f", sw=1)
    b.gable(0.3, 0.3, 1.05, 1.3, 0.75, 1.1, "#8e3b2b", "#c97b4a", axis="c")
    b.fence(1.95, 0.05, 1.95, 1.95)
    for r, c in [(1.35, 1.35), (1.55, 0.45), (1.7, 1.15)]:
        b.animal(r, c, "#fafafa", "#fafafa", "#f9a825", k=0.7)
        x, y = b.P(r, c, 0.16 * 0.7)
        b.raw(f'<circle cx="{x + 0.16 * b.a:.2f}" cy="{y - 0.1 * b.a:.2f}" r="{0.03 * b.a:.2f}" fill="#e53935"/>')
    return b


def pigsty():
    b = B(3, 3, 1.4)
    b.plate("#8d6e4a")
    b.ellipse_ground(1.9, 1.5, 0.45, 0.07, "#5d4033", sw=0.8)
    b.box(0.25, 0.25, 1.2, 2.0, 0.06, 0.7, "#c48b5a")
    b.on_face("front", 1.2, 0.25, 0.06,
              f'<rect x="0.6" y="0" width="0.4" height="0.42" fill="#3e2723" stroke="{OUT}" stroke-width="1" NS/>')
    b.gable(0.25, 0.25, 1.2, 2.0, 0.7, 1.05, "#6d4c41", "#c48b5a", axis="c")
    b.fence(0.1, 2.85, 2.85, 2.85)
    for r, c in [(1.55, 0.7), (2.2, 1.0), (1.65, 2.2)]:
        b.animal(r, c, "#f8a5b8", "#f48fb1", "#c2185b")
    b.fence(2.85, 0.1, 2.85, 2.85)
    return b


def cowshed():
    b = B(4, 4, 2.4)
    b.plate(DIRT)
    wall, roof = "#c62828", "#455a64"
    b.box(0.3, 0.3, 2.5, 2.9, 0.06, 1.1, wall)
    b.on_face("front", 2.5, 0.3, 0.06,
              f'<rect x="0.9" y="0" width="0.8" height="0.8" fill="#8e1c1c" stroke="#fafafa" stroke-width="1.8" NS/>'
              f'<line x1="0.9" y1="0" x2="1.7" y2="0.8" stroke="#fafafa" stroke-width="1.5" NS/>'
              f'<line x1="1.7" y1="0" x2="0.9" y2="0.8" stroke="#fafafa" stroke-width="1.5" NS/>')
    for u in (0.4, 1.3):
        b.window("side", 2.5, 2.9, 0.06, u, 0.55, 0.3, 0.25)
    b.gable(0.3, 0.3, 2.5, 2.9, 1.1, 1.85, roof, wall, axis="c")
    b.cyl(0.9, 3.4, 0.42, 0.06, 1.9, "#b0bec5")
    b.cone(0.9, 3.4, 0.42, 1.9, 2.25, "#78909c")
    b.fence(3.85, 0.15, 3.85, 3.85)
    for r, c in [(3.0, 1.0), (3.3, 2.3), (2.9, 3.3)]:
        b.animal(r, c, "#fafafa", "#fafafa", "#424242", k=1.25, spots=[(-0.08, -0.02), (0.07, 0.03)])
    return b


def sheepfold():
    b = B(3, 3, 1.4)
    b.plate(GRASS)
    b.box(0.25, 0.25, 1.2, 1.8, 0.06, 0.65, "#bca07a")
    b.on_face("front", 1.2, 0.25, 0.06,
              f'<rect x="0.55" y="0" width="0.38" height="0.4" fill="#4e342e" stroke="{OUT}" stroke-width="1" NS/>')
    b.gable(0.25, 0.25, 1.2, 1.8, 0.65, 1.0, "#5d4037", "#bca07a", axis="c")
    b.box(0.1, 2.75, 2.75, 2.92, 0.06, 0.28, "#9e9e9e", sw=1)
    for r, c in [(1.6, 0.6), (1.5, 1.6), (2.2, 1.1), (2.25, 2.1)]:
        b.animal(r, c, "#fafafa", "#424242", "#424242", fluffy=True)
    b.box(2.75, 0.1, 2.92, 2.92, 0.06, 0.28, "#9e9e9e", sw=1)
    return b


BUILDINGS = {
    "house": house, "warehouse": warehouse, "barn": barn,
    "lumberjack_hut": lumberjack_hut, "quarry": quarry, "mine": mine, "water_mill": water_mill,
    "sawmill": sawmill, "stonecutter_hut": stonecutter_hut, "blacksmith": blacksmith, "mill": mill,
    "bakery": bakery, "sauce_factory": sauce_factory, "butter_factory": butter_factory,
    "chicken-coop": chicken_coop, "pigsty": pigsty, "cowshed": cowshed, "sheepfold": sheepfold,
}

if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    for slug, fn in BUILDINGS.items():
        with open(os.path.join(OUT_DIR, f"{slug}.svg"), "w", encoding="utf-8") as f:
            f.write(fn().svg())
    print("generated", len(BUILDINGS))
