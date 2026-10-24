/**
 * IsoFarmRenderer - PixiJS rendering component for the isometric farm.
 * Рисует поле, чанки, здания и грядки; обрабатывает панораму, зум и клики.
 * Вся игровая логика (API) — в useIsoFarmEngine, сюда приходят только данные и колбэки.
 */

import React, { useRef, useEffect } from "react";
import * as PIXI from "pixi.js";
import {
  gridToIsoTop,
  isoToGrid,
  chunkKey,
  rectsOverlap,
  clamp,
  getBuildingDimensions,
  findBuildingAtCell,
  isCellUnlocked,
  CHUNK_SIZE,
  MAX_SIZE,
  START_UNLOCKED,
  TILE_W,
  TILE_H,
  DRAG_THRESHOLD_PX,
  DEBUG_BUILDING_BOX,
} from "./isoUtils";
import { buildingIcons } from "../../assets/buildings";
import { appearanceKey, hasBuildingArt, renderBuildingSvg, svgToDataUrl } from "./buildingArt";
import { buildAnimatedBuilding, loadBuildingAnimation } from "./buildingAnimation";
import { CHUNK_COLORS, SCENERY_ART, chunkDecor, chunkKind, fenceEdges, grassShade, ownedDecor, wildBounds, wildDecor } from "./scenery";
import { isPlotReady, msUntilNextReady } from "./plots";

const WILD_MARGIN = 12; // ширина лесного кольца вокруг поля, клеток

const MIN_ZOOM = 0.75; // дальше не отдаляем (ещё и так, чтобы карта всегда заполняла экран)
const MAX_ZOOM = 6;
const START_ZOOM = 2;

// Цвета зданий без картинки — по типу здания
const TYPE_COLORS = {
  field: 0x8d6e4a,
  agroproduction: 0xd8b56a,
  extraction: 0x9e9e9e,
  processing: 0xb08850,
  production: 0xc0604a,
};

function shade(color, k) {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * k));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * k));
  const b = Math.min(255, Math.round((color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

/** Углы ромба прямоугольника клеток: верх, право, низ, лево */
function footprint(row, col, w, h) {
  const top = gridToIsoTop(row, col);
  const right = gridToIsoTop(row, col + w);
  const bottom = gridToIsoTop(row + h, col + w);
  const left = gridToIsoTop(row + h, col);
  return { top, right, bottom, left };
}

function poly(...points) {
  return points.flatMap((p) => [p.x, p.y]);
}

function lift(p, dy) {
  return { x: p.x, y: p.y - dy };
}

/** Здания с учётом несохранённых перемещений */
function effectiveBuildings(buildings, moveChanges) {
  if (!moveChanges || Object.keys(moveChanges).length === 0) return buildings;
  return buildings.map((b) => {
    const ch = moveChanges[b.id];
    return ch ? { ...b, row: ch.newRow, col: ch.newCol } : b;
  });
}

function makeLabel(text, size = 28) {
  const label = new PIXI.Text({
    text,
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: size,
      fontWeight: "bold",
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 4 },
    },
  });
  label.anchor.set(0.5);
  label.scale.set(0.25); // крупный шрифт + уменьшение = чёткий текст при зуме
  return label;
}

const IsoFarmRenderer = (props) => {
  const hostRef = useRef(null);
  const propsRef = useRef(props);
  const drawRef = useRef(null);      // перерисовка статики (поле, здания)
  const drawGhostRef = useRef(null); // перерисовка призрака под курсором
  const appearanceRef = useRef(null); // подгрузка текстур выбранного игроком внешнего вида

  const {
    fieldCfg, chunks, buildings, plots, availableChunks, expansion, coins,
    buildingToPlace, selected, movingBuilding, moveMode, moveChanges, appearances,
    workingIds, animate, plantingSeed,
  } = props;

  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    drawRef.current?.();
  }, [fieldCfg, chunks, buildings, plots, availableChunks, expansion, coins, moveChanges, moveMode, workingIds, animate]);

  // Посадка созрела — сразу меняем иконку на поле, не дожидаясь опроса сервера
  useEffect(() => {
    const ms = msUntilNextReady(plots);
    if (ms == null) return undefined;
    const timer = setTimeout(() => drawRef.current?.(), ms + 50);
    return () => clearTimeout(timer);
  }, [plots]);

  useEffect(() => {
    drawGhostRef.current?.();
  }, [buildingToPlace, selected, movingBuilding, moveMode, plantingSeed, plots]);

  useEffect(() => {
    appearanceRef.current?.();
  }, [appearances]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = null;

    async function initPixi() {
      const host = hostRef.current;
      if (!host) return;

      const app = new PIXI.Application();
      await app.init({
        resizeTo: host,
        backgroundColor: 0x3f6b35,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      // Картинки зданий: slug → текстура. Отсутствующая картинка — не ошибка, будет заглушка.
      const textures = {};
      await Promise.all(
        Object.entries(buildingIcons).map(async ([slug, url]) => {
          try {
            textures[slug] = await PIXI.Assets.load(url);
          } catch (e) {
            console.warn("Не удалось загрузить картинку здания", slug, e);
          }
        })
      );

      // Пейзаж: деревья, кусты, камни, цветы
      const scenery = {};
      await Promise.all(Object.entries(SCENERY_ART).map(async ([name, art]) => {
        scenery[name] = await PIXI.Assets.load({ src: svgToDataUrl(art.svg), loadParser: "loadSVG" });
      }));

      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      host.innerHTML = "";
      host.appendChild(app.canvas);
      const canvas = app.canvas;
      canvas.style.display = "block";
      canvas.style.touchAction = "none";

      const world = new PIXI.Container();
      app.stage.addChild(world);

      const groundLayer = new PIXI.Container();
      const decorLayer = new PIXI.Container();      // деревья, кусты, камни на закрытых участках
      const ownedDecorLayer = new PIXI.Container(); // трава и цветы на купленной земле (не под зданиями)
      const wildLayer = new PIXI.Container();       // лес вокруг поля (не меняется)
      const chunkLayer = new PIXI.Container();
      const fenceBackLayer = new PIXI.Container();  // дальний забор — под зданиями
      const fenceFrontLayer = new PIXI.Container(); // ближний забор — поверх зданий
      const fxLayer = new PIXI.Container();         // эффекты (расчистка участка)
      decorLayer.sortableChildren = true;
      wildLayer.sortableChildren = true;
      // Деревья перед ближним (южным/восточным) забором: рисуются поверх забора и зданий у края
      const decorFrontLayer = new PIXI.Container();
      decorFrontLayer.sortableChildren = true;
      ownedDecorLayer.sortableChildren = true;
      const buildingsLayer = new PIXI.Container();
      const ghostLayer = new PIXI.Container();
      buildingsLayer.sortableChildren = true;
      world.addChild(groundLayer, wildLayer, decorLayer, ownedDecorLayer, fenceBackLayer, buildingsLayer, fenceFrontLayer, decorFrontLayer, chunkLayer, fxLayer, ghostLayer);

      const ghost = new PIXI.Graphics();
      ghostLayer.addChild(ghost);

      const view = {
        hoverCell: null,
        pickedId: null, // здание, выбранное в режиме перемещения
        cameraReady: false,
        anim: [], // update(t) анимированных зданий
        fx: [],   // эффекты расчистки купленных участков: { r, c, start }
        groundKey: null,
        ownedKey: null,
        ownedDecorKey: null,
      };

      // Анимации работающих зданий: ключ внешнего вида → текстуры | null (нечего анимировать) | "loading"
      const animations = {};
      function ensureAnimation(slug, look, key) {
        animations[key] = "loading";
        loadBuildingAnimation(slug, look)
          .then((anim) => { animations[key] = anim; })
          .catch((e) => { animations[key] = null; console.warn("Не удалось подготовить анимацию", slug, e); })
          .finally(() => { if (!cancelled) drawBuildings(); });
      }
      // Время одно на все здания: анимация не сбивается при перерисовке карты
      app.ticker.add(() => {
        const t = performance.now() / 1000;
        for (const update of view.anim) update(t);
        if (view.fx.length) drawFx(t);
      });

      // ----------------------------------------------------------- helpers --
      const cfg = () => {
        const f = propsRef.current.fieldCfg;
        return {
          chunkSize: f?.chunk_size || CHUNK_SIZE,
          maxSize: f?.max_size || MAX_SIZE,
        };
      };

      const unlockedSet = () =>
        new Set((propsRef.current.chunks || []).map((ch) => chunkKey(ch.chunk_row, ch.chunk_col)));

      const currentBuildings = () =>
        effectiveBuildings(propsRef.current.buildings || [], propsRef.current.moveChanges);

      function screenToCell(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const wx = (clientX - rect.left - world.position.x) / world.scale.x;
        const wy = (clientY - rect.top - world.position.y) / world.scale.y;
        const g = isoToGrid(wx, wy);
        return { row: Math.floor(g.row), col: Math.floor(g.col) };
      }

      function canPlaceAt(row, col, w, h, excludeId = null) {
        const { chunkSize, maxSize } = cfg();
        if (row < 0 || col < 0 || row + h > maxSize || col + w > maxSize) return false;
        const unlocked = unlockedSet();
        for (let r = row; r < row + h; r++) {
          for (let c = col; c < col + w; c++) {
            if (!isCellUnlocked(unlocked, r, c, chunkSize)) return false;
          }
        }
        for (const b of currentBuildings()) {
          if (b.id === excludeId) continue;
          const { w: bw, h: bh } = getBuildingDimensions(b);
          if (rectsOverlap(row, col, w, h, b.row, b.col, bw, bh)) return false;
        }
        return true;
      }

      /** Что сейчас «держит» курсор: { w, h, excludeId, building } или null */
      function ghostTarget() {
        const p = propsRef.current;
        if (p.movingBuilding) {
          return { ...getBuildingDimensions(p.movingBuilding), excludeId: p.movingBuilding.id, building: p.movingBuilding };
        }
        if (p.moveMode) {
          const picked = currentBuildings().find((b) => b.id === view.pickedId);
          return picked ? { ...getBuildingDimensions(picked), excludeId: picked.id, building: picked } : null;
        }
        const placing = p.buildingToPlace || p.selected;
        return placing ? { ...getBuildingDimensions(placing), excludeId: null, building: placing } : null;
      }

      function availableChunkAt(row, col) {
        const { chunkSize } = cfg();
        const cr = Math.floor(row / chunkSize);
        const cc = Math.floor(col / chunkSize);
        return (propsRef.current.availableChunks || []).find(
          (ch) => ch.chunk_row === cr && ch.chunk_col === cc
        );
      }

      // ------------------------------------------------------------ camera --
      function centerCamera() {
        const { chunkSize } = cfg();
        const list = propsRef.current.chunks || [];
        const built = propsRef.current.buildings || [];
        let minR = 0, minC = 0, maxR = START_UNLOCKED, maxC = START_UNLOCKED;
        if (built.length) {
          // Показываем то, что уже построено (у нового игрока — стартовые здания в верхнем углу)
          minR = Math.min(...built.map((b) => b.row));
          minC = Math.min(...built.map((b) => b.col));
          maxR = Math.max(...built.map((b) => b.row + getBuildingDimensions(b).h));
          maxC = Math.max(...built.map((b) => b.col + getBuildingDimensions(b).w));
        } else if (list.length) {
          minR = Math.min(...list.map((c) => c.chunk_row)) * chunkSize;
          minC = Math.min(...list.map((c) => c.chunk_col)) * chunkSize;
          maxR = (Math.max(...list.map((c) => c.chunk_row)) + 1) * chunkSize;
          maxC = (Math.max(...list.map((c) => c.chunk_col)) + 1) * chunkSize;
        }
        const center = gridToIsoTop((minR + maxR) / 2, (minC + maxC) / 2);
        world.scale.set(START_ZOOM);
        world.position.set(
          app.screen.width / 2 - center.x * START_ZOOM,
          app.screen.height / 2 - center.y * START_ZOOM
        );
        clampCamera();
      }

      /** Экран не выходит за кромку леса вокруг поля: за краем карты ничего пустого не видно. */
      const minZoom = () => {
        const b = wildBounds(cfg().maxSize, WILD_MARGIN);
        return Math.max(MIN_ZOOM, app.screen.width / (b.x1 - b.x0), app.screen.height / (b.y1 - b.y0));
      };
      function clampCamera() {
        const { maxSize } = cfg();
        const b = wildBounds(maxSize, WILD_MARGIN);
        if (world.scale.x < minZoom()) world.scale.set(minZoom());
        const k = world.scale.x;
        // 1) центр экрана — над полем (не уводим поле за край ради леса в углах ромба)
        const g = isoToGrid((app.screen.width / 2 - world.position.x) / k, (app.screen.height / 2 - world.position.y) / k);
        const p = gridToIsoTop(clamp(g.row, 0, maxSize), clamp(g.col, 0, maxSize));
        world.position.set(app.screen.width / 2 - p.x * k, app.screen.height / 2 - p.y * k);
        // 2) экран целиком внутри кромки леса — пустого фона не видно
        const fit = (pos, size, lo, hi) => clamp(pos, size - hi * k, -lo * k); // экран [0, size] внутри [lo, hi] мира
        world.position.set(
          fit(world.position.x, app.screen.width, b.x0, b.x1),
          fit(world.position.y, app.screen.height, b.y0, b.y1),
        );
      }

      // -------------------------------------------------------------- draw --
      function clearLayer(layer) {
        for (const child of layer.removeChildren()) child.destroy({ children: true });
      }

      const ownedSet = () => new Set((propsRef.current.chunks || []).map((ch) => chunkKey(ch.chunk_row, ch.chunk_col)));
      const gridVisible = () => {
        const p = propsRef.current;
        return Boolean(p.buildingToPlace || p.selected || p.movingBuilding || p.moveMode);
      };

      function sceneryPiece(layer, item) {
        const tex = scenery[item.art];
        if (!tex) return;
        const s = new PIXI.Sprite(tex);
        const p = gridToIsoTop(item.r, item.c);
        s.anchor.set(0.5, 54 / 56);
        s.scale.set((SCENERY_ART[item.art].w * TILE_W) / tex.width);
        s.position.set(p.x, p.y);
        const k = item.tint;
        s.tint = (Math.round(255 * k) << 16) | (Math.round(255 * k) << 8) | Math.round(255 * k);
        s.zIndex = item.r + item.c;
        layer.addChild(s);
      }

      // Лес вокруг поля: раскладка считается один раз, раскладывается по слоям в drawDecor
      let wildTrees = [];
      function drawWild() {
        wildTrees = wildDecor(cfg().maxSize, WILD_MARGIN).trees;
      }

      /** Земля: лесное кольцо с холмами, закрытые участки (лес/луг/камни), купленная трава, сетка при постройке. */
      function drawGround() {
        const { chunkSize, maxSize } = cfg();
        const owned = ownedSet();
        const grid = gridVisible();
        const key = [...owned].sort().join(";") + "|" + grid + "|" + maxSize;
        if (key === view.groundKey) return;
        view.groundKey = key;
        clearLayer(groundLayer);
        const g = new PIXI.Graphics();

        const b = wildBounds(maxSize, WILD_MARGIN);
        g.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0).fill({ color: CHUNK_COLORS.wild });

        const n = Math.ceil(maxSize / chunkSize);
        for (let cr = 0; cr < n; cr++) {
          for (let cc = 0; cc < n; cc++) {
            const f = footprint(cr * chunkSize, cc * chunkSize, chunkSize, chunkSize);
            const color = owned.has(chunkKey(cr, cc)) ? CHUNK_COLORS.owned : CHUNK_COLORS[chunkKind(cr, cc)];
            g.poly(poly(f.top, f.right, f.bottom, f.left)).fill({ color });
          }
        }
        // Переливы травы на купленной земле: плавный шум блоками 2×2 клетки поверх ровной заливки
        for (const k of owned) {
          const [cr, cc] = k.split(",").map(Number);
          for (let r = cr * chunkSize; r < (cr + 1) * chunkSize; r += 2) {
            for (let c = cc * chunkSize; c < (cc + 1) * chunkSize; c += 2) {
              const f = footprint(r, c, 2, 2);
              g.poly(poly(f.top, f.right, f.bottom, f.left)).fill({ color: grassShade(r + 1, c + 1) });
            }
          }
        }
        // Рамка поля: край расчищенной земли
        const all = footprint(0, 0, maxSize, maxSize);
        g.poly(poly(all.top, all.right, all.bottom, all.left)).stroke({ width: 1, color: 0x33691e, alpha: 0.5 });

        if (grid) {
          for (const k of owned) {
            const [cr, cc] = k.split(",").map(Number);
            const r0 = cr * chunkSize;
            const c0 = cc * chunkSize;
            for (let i = 0; i <= chunkSize; i++) {
              const a = gridToIsoTop(r0 + i, c0);
              const b = gridToIsoTop(r0 + i, c0 + chunkSize);
              const c = gridToIsoTop(r0, c0 + i);
              const d = gridToIsoTop(r0 + chunkSize, c0 + i);
              g.moveTo(a.x, a.y).lineTo(b.x, b.y);
              g.moveTo(c.x, c.y).lineTo(d.x, d.y);
            }
          }
          g.stroke({ width: 0.5, color: 0x000000, alpha: 0.14 });
        }
        groundLayer.addChild(g);

        // Пейзаж и забор зависят только от купленной земли
        const ownedKey = [...owned].sort().join(";");
        if (ownedKey !== view.ownedKey) {
          // Расчистка — только для участков, купленных уже при открытой карте. Первый кадр рисуется
          // до загрузки поля (участков ещё нет), поэтому пустой прошлый набор — это не покупка.
          const before = view.ownedKey ? new Set(view.ownedKey.split(";")) : null;
          view.ownedKey = ownedKey;
          drawDecor(owned);
          drawFences(owned);
          if (before) {
            const t = performance.now() / 1000;
            for (const k of owned) {
              if (before.has(k)) continue;
              const [cr, cc] = k.split(",").map(Number);
              view.fx.push({ r: (cr + 0.5) * chunkSize, c: (cc + 0.5) * chunkSize, start: t });
            }
          }
        }
      }

      function drawDecor(owned) {
        clearLayer(decorLayer);
        clearLayer(wildLayer);
        clearLayer(decorFrontLayer);
        const { chunkSize, maxSize } = cfg();
        // Перед забором — то, что стоит южнее/восточнее купленной земли (её участок к северу или западу)
        const inFront = (r, c) => {
          const cr = Math.floor(r / chunkSize);
          const cc = Math.floor(c / chunkSize);
          return owned.has(chunkKey(cr - 1, cc)) || owned.has(chunkKey(cr, cc - 1)) || owned.has(chunkKey(cr - 1, cc - 1));
        };
        const n = Math.ceil(maxSize / chunkSize);
        for (let cr = 0; cr < n; cr++) {
          for (let cc = 0; cc < n; cc++) {
            if (owned.has(chunkKey(cr, cc))) continue;
            for (const item of chunkDecor(cr, cc, chunkSize)) {
              sceneryPiece(inFront(item.r, item.c) ? decorFrontLayer : decorLayer, item);
            }
          }
        }
        for (const t of wildTrees) sceneryPiece(inFront(t.r, t.c) ? decorFrontLayer : wildLayer, t);
      }

      /** Забор по краю купленной земли: столбики, две жерди, ворота посередине некоторых сторон. */
      function drawFences(owned) {
        clearLayer(fenceBackLayer);
        clearLayer(fenceFrontLayer);
        const { chunkSize } = cfg();
        const back = new PIXI.Graphics();
        const front = new PIXI.Graphics();
        const H = 7; // высота столбика, пикселей мира
        const up = (p, k) => ({ x: p.x, y: p.y - H * k });
        for (const e of fenceEdges(owned, chunkSize)) {
          const g = e.near ? front : back;
          const len = Math.round(Math.max(Math.abs(e.r1 - e.r0), Math.abs(e.c1 - e.c0)));
          const at = (i) => gridToIsoTop(e.r0 + ((e.r1 - e.r0) * i) / len, e.c0 + ((e.c1 - e.c0) * i) / len);
          const [g0, g1] = e.gate ? [Math.floor(len / 2) - 1, Math.floor(len / 2) + 1] : [-1, -1];
          for (let i = 0; i < len; i++) {
            if (i >= g0 && i < g1) continue;
            const a = at(i);
            const b = at(i + 1);
            for (const k of [0.45, 0.9]) g.moveTo(up(a, k).x, up(a, k).y).lineTo(up(b, k).x, up(b, k).y);
          }
          g.stroke({ width: 1.3, color: 0x8d6e63 });
          for (let i = 0; i <= len; i++) {
            if (i > g0 && i < g1) continue;
            const a = at(i);
            const gatePost = i === g0 || i === g1;
            g.moveTo(a.x, a.y).lineTo(a.x, a.y - H * (gatePost ? 1.35 : 1));
            g.stroke({ width: gatePost ? 2.6 : 1.7, color: 0x5d4037 });
          }
          if (e.gate) {
            // Ворота: две створки с перекладиной
            for (const [i0, i1] of [[g0, g0 + 1], [g0 + 1, g1]]) {
              const a = at(i0);
              const b = at(i1);
              g.poly(poly(up(a, 0.15), up(b, 0.15), up(b, 0.95), up(a, 0.95))).fill({ color: 0xa1887f }).stroke({ width: 0.8, color: 0x3e2723 });
              g.moveTo(up(a, 0.15).x, up(a, 0.15).y).lineTo(up(b, 0.95).x, up(b, 0.95).y).stroke({ width: 0.9, color: 0x5d4037 });
            }
          }
        }
        fenceBackLayer.addChild(back);
        fenceFrontLayer.addChild(front);
      }

      /** Расчистка нового участка: клубы пыли и летящие листья ~2 секунды. */
      const fxGraphics = new PIXI.Graphics();
      fxLayer.addChild(fxGraphics);
      function drawFx(t) {
        fxGraphics.clear();
        view.fx = view.fx.filter((f) => t - f.start < 2.2);
        for (const f of view.fx) {
          const p = (t - f.start) / 2.2;
          const center = gridToIsoTop(f.r, f.c);
          for (let i = 0; i < 14; i++) {
            const ang = (i / 14) * Math.PI * 2 + i;
            const dist = (20 + (i % 4) * 9) * (0.3 + p);
            const x = center.x + Math.cos(ang) * dist * 1.6;
            const y = center.y + Math.sin(ang) * dist * 0.8 - p * 18;
            fxGraphics.circle(x, y, (6 + (i % 3) * 3) * (0.6 + p)).fill({ color: 0xd7ccc8, alpha: 0.7 * (1 - p) });
            if (i % 2) fxGraphics.circle(x * 0.98 + center.x * 0.02, y - p * 30, 1.8).fill({ color: 0x7cb342, alpha: 1 - p });
          }
        }
      }

      function drawAvailableChunks() {
        clearLayer(chunkLayer);
        const { chunkSize } = cfg();
        const { availableChunks: list = [], coins: money = 0, expansion } = propsRef.current;
        const g = new PIXI.Graphics();
        for (const ch of list) {
          const f = footprint(ch.chunk_row * chunkSize, ch.chunk_col * chunkSize, chunkSize, chunkSize);
          g.poly(poly(f.top, f.right, f.bottom, f.left))
            .fill({ color: 0xffd54f, alpha: 0.08 })
            .stroke({ width: 1, color: 0xffd54f, alpha: 0.5 });
        }
        chunkLayer.addChild(g);

        // Подпись: цена в монетах, пока не исчерпан лимит по уровню; потом — участок за алмазы; потом — замок
        const coinsLeft = expansion ? expansion.coin_slots_left > 0 : true;
        const diamondsLeft = expansion ? expansion.diamond_slots_left > 0 : false;
        for (const ch of list) {
          const center = gridToIsoTop((ch.chunk_row + 0.5) * chunkSize, (ch.chunk_col + 0.5) * chunkSize);
          let text = `+ ${ch.cost}`;
          let fill = money >= ch.cost ? 0xffe082 : 0xbdbdbd;
          if (!coinsLeft && diamondsLeft) {
            text = `💎 ${expansion.diamond_price}`;
            fill = 0x90caf9;
          } else if (!coinsLeft) {
            text = `🔒 ур. ${expansion.level + 1}`;
            fill = 0xbdbdbd;
          }
          const label = makeLabel(text, 32);
          label.style.fill = fill;
          label.position.set(center.x, center.y);
          chunkLayer.addChild(label);
        }
      }

      function drawBuilding(b) {
        const { w, h } = getBuildingDimensions(b);
        const f = footprint(b.row, b.col, w, h);
        const node = new PIXI.Container();
        node.zIndex = b.row + b.col + w + h; // дальние здания рисуются раньше ближних
        const picked = b.id === view.pickedId;
        const color = TYPE_COLORS[b.building_type] ?? 0xaaaaaa;
        const look = propsRef.current.appearances?.[b.slug];
        const texture = textures[appearanceKey(b.slug, look)] || textures[b.slug];

        if (b.building_type === "field") {
          // Грядка: вспаханная земля с бороздами
          const g = new PIXI.Graphics();
          g.poly(poly(f.top, f.right, f.bottom, f.left)).fill({ color }).stroke({ width: 1, color: 0x5d4037 });
          for (let i = 1; i < h * 3; i++) {
            const a = gridToIsoTop(b.row + i / 3, b.col);
            const z = gridToIsoTop(b.row + i / 3, b.col + w);
            g.moveTo(a.x, a.y).lineTo(z.x, z.y);
          }
          g.stroke({ width: 0.6, color: 0x5d4037, alpha: 0.7 });
          node.addChild(g);

          const plot = (propsRef.current.plots || []).find((p) => p.building_id === b.id);
          if (plot) {
            const icon = makeLabel(isPlotReady(plot) ? "🧺" : "🌱", 40);
            const c = gridToIsoTop(b.row + h / 2, b.col + w / 2);
            icon.position.set(c.x, c.y - 2);
            node.addChild(icon);
          }
        } else if (texture) {
          const width = (w + h) * (TILE_W / 2);
          const place = { x: (f.left.x + f.right.x) / 2, y: f.bottom.y, width };
          // Здание работает (добыча, переработка, животные) — подставляем анимированную версию
          const p = propsRef.current;
          const key = appearanceKey(b.slug, look);
          const working = p.animate !== false && p.workingIds?.has(b.id) && hasBuildingArt(b.slug);
          if (working && animations[key] === undefined) ensureAnimation(b.slug, look, key);
          const anim = working ? animations[key] : null;
          if (anim && anim !== "loading") {
            const animated = buildAnimatedBuilding(anim, place);
            node.addChild(animated.node);
            view.anim.push(animated.update);
          } else {
            const sprite = new PIXI.Sprite(texture);
            sprite.anchor.set(0.5, 1);
            sprite.scale.set(width / texture.width);
            sprite.position.set(place.x, place.y);
            node.addChild(sprite);
          }
          if (DEBUG_BUILDING_BOX) {
            const box = new PIXI.Graphics();
            box.poly(poly(f.top, f.right, f.bottom, f.left)).stroke({ width: 0.5, color: 0xff00ff });
            node.addChild(box);
          }
        } else {
          // Нет картинки — объёмная коробка цвета типа здания с подписью
          const hgt = 6 + Math.min(w, h) * 3;
          const g = new PIXI.Graphics();
          g.poly(poly(f.left, f.bottom, lift(f.bottom, hgt), lift(f.left, hgt))).fill({ color: shade(color, 0.7) });
          g.poly(poly(f.bottom, f.right, lift(f.right, hgt), lift(f.bottom, hgt))).fill({ color: shade(color, 0.85) });
          g.poly(poly(lift(f.top, hgt), lift(f.right, hgt), lift(f.bottom, hgt), lift(f.left, hgt)))
            .fill({ color })
            .stroke({ width: 0.5, color: 0x000000, alpha: 0.35 });
          node.addChild(g);

          const label = makeLabel(b.name || b.slug, 24);
          const c = gridToIsoTop(b.row + h / 2, b.col + w / 2);
          label.position.set(c.x, c.y - hgt);
          node.addChild(label);
        }

        if (picked) {
          const outline = new PIXI.Graphics();
          outline.poly(poly(f.top, f.right, f.bottom, f.left)).stroke({ width: 1.5, color: 0x2196f3 });
          node.addChild(outline);
          node.alpha = 0.6;
        }
        return node;
      }

      function drawOwnedDecor() {
        const { chunkSize } = cfg();
        const list = currentBuildings();
        const key = (view.ownedKey || "") + "|" + list.map((b) => `${b.row},${b.col},${getBuildingDimensions(b).w},${getBuildingDimensions(b).h}`).join(";");
        if (key === view.ownedDecorKey) return;
        view.ownedDecorKey = key;
        clearLayer(ownedDecorLayer);
        const underBuilding = (r, c) => list.some((b) => {
          const { w, h } = getBuildingDimensions(b);
          return r > b.row - 0.4 && r < b.row + h + 0.3 && c > b.col - 0.4 && c < b.col + w + 0.3;
        });
        for (const k of ownedSet()) {
          const [cr, cc] = k.split(",").map(Number);
          for (const item of ownedDecor(cr, cc, chunkSize)) {
            if (!underBuilding(item.r, item.c)) sceneryPiece(ownedDecorLayer, item);
          }
        }
      }

      function drawBuildings() {
        view.anim = [];
        drawOwnedDecor();
        clearLayer(buildingsLayer);
        for (const b of currentBuildings()) buildingsLayer.addChild(drawBuilding(b));
      }

      function drawGhost() {
        ghost.clear();
        if (view.ghostNode) {
          view.ghostNode.destroy({ children: true });
          view.ghostNode = null;
        }
        const target = ghostTarget();
        const cell = view.hoverCell;
        if (!cell) return;
        // Множественный посев: подсвечиваем поле под курсором — зелёным пустое, красным уже засеянное
        if (!target && propsRef.current.plantingSeed) {
          const b = findBuildingAtCell(currentBuildings(), cell.row, cell.col);
          if (b?.building_type !== "field") return;
          const { w, h } = getBuildingDimensions(b);
          const f = footprint(b.row, b.col, w, h);
          const busy = (propsRef.current.plots || []).some((p) => p.building_id === b.id);
          const color = busy ? 0xf44336 : 0x8bc34a;
          ghost.poly(poly(f.top, f.right, f.bottom, f.left))
            .fill({ color, alpha: 0.35 })
            .stroke({ width: 1.5, color, alpha: 0.95 });
          return;
        }
        if (!target) return;
        const ok = canPlaceAt(cell.row, cell.col, target.w, target.h, target.excludeId);
        const f = footprint(cell.row, cell.col, target.w, target.h);
        const color = ok ? 0x4caf50 : 0xf44336;
        ghost.poly(poly(f.top, f.right, f.bottom, f.left))
          .fill({ color, alpha: 0.35 })
          .stroke({ width: 1, color, alpha: 0.9 });

        // Само здание полупрозрачным поверх подсветки клеток: та же картинка, что будет на карте
        const node = drawBuilding({
          ...target.building, id: -1, w: target.w, h: target.h, row: cell.row, col: cell.col,
        });
        node.alpha = 0.75;
        if (!ok) node.tint = 0xff8a80;
        ghostLayer.addChild(node);
        view.ghostNode = node;
      }

      function drawAll() {
        if (!view.cameraReady && propsRef.current.fieldCfg) {
          centerCamera();
          view.cameraReady = true;
        }
        drawGround();
        drawAvailableChunks();
        drawBuildings();
        drawGhost();
      }

      // Внешний вид, выбранный игроком: рисуем SVG по зёрнам и кэшируем текстуру (slug@c.r.d)
      async function loadAppearanceTextures() {
        const looks = Object.entries(propsRef.current.appearances || {});
        const missing = looks.filter(([slug, look]) => hasBuildingArt(slug) && !textures[appearanceKey(slug, look)]);
        if (missing.length === 0) return drawAll();
        await Promise.all(missing.map(async ([slug, look]) => {
          try {
            textures[appearanceKey(slug, look)] = await PIXI.Assets.load({
              src: svgToDataUrl(renderBuildingSvg(slug, look)),
              loadParser: "loadSVG",
            });
          } catch (e) {
            console.warn("Не удалось нарисовать внешний вид здания", slug, e);
          }
        }));
        if (!cancelled) drawAll();
      }

      drawRef.current = drawAll;
      drawGhostRef.current = () => {
        if (!propsRef.current.moveMode) view.pickedId = null;
        drawGround(); // сетка клеток видна только при постройке/перемещении
        drawGhost();
      };
      appearanceRef.current = loadAppearanceTextures;
      centerCamera();
      drawWild();
      drawAll();
      loadAppearanceTextures();

      // ------------------------------------------------------------- input --
      function updateTooltip(building, e) {
        const p = propsRef.current;
        const hoveredId = building?.id ?? null;
        if (view.hoveredId !== hoveredId) {
          view.hoveredId = hoveredId;
          p.setHoveredBuilding?.(building || null);
        }
        const tip = document.getElementById("building-tooltip");
        if (tip) {
          tip.style.left = `${e.clientX}px`;
          tip.style.top = `${e.clientY}px`;
          tip.style.opacity = building ? "1" : "0";
        }
      }

      function handleClick(cell) {
        const p = propsRef.current;
        const target = ghostTarget();

        if (p.movingBuilding) {
          if (canPlaceAt(cell.row, cell.col, target.w, target.h, target.excludeId)) {
            Promise.resolve(p.onMoveBuilding?.(p.movingBuilding.id, cell.row, cell.col)).catch(() => {});
          }
          return;
        }

        if (p.moveMode) {
          if (view.pickedId != null) {
            if (canPlaceAt(cell.row, cell.col, target.w, target.h, target.excludeId)) {
              const id = view.pickedId;
              p.setMoveChanges?.((prev) => ({ ...prev, [id]: { newRow: cell.row, newCol: cell.col } }));
            }
            view.pickedId = null;
          } else {
            view.pickedId = findBuildingAtCell(currentBuildings(), cell.row, cell.col)?.id ?? null;
          }
          drawBuildings();
          drawGhost();
          return;
        }

        if (target) {
          if (canPlaceAt(cell.row, cell.col, target.w, target.h)) p.onPlaceBuilding?.(cell.row, cell.col);
          return;
        }

        const building = findBuildingAtCell(currentBuildings(), cell.row, cell.col);
        if (building) {
          p.onBuildingClick?.(building);
          return;
        }

        // Покупка участка — через окно подтверждения в игре
        const chunk = availableChunkAt(cell.row, cell.col);
        if (chunk) p.onChunkClick?.(chunk);
      }

      const drag = { down: false, moved: false, startX: 0, startY: 0, worldX: 0, worldY: 0 };

      function onPointerDown(e) {
        if (e.button !== 0) return;
        drag.down = true;
        drag.moved = false;
        drag.startX = e.clientX;
        drag.startY = e.clientY;
        drag.worldX = world.position.x;
        drag.worldY = world.position.y;
        canvas.setPointerCapture?.(e.pointerId);
      }

      function onPointerMove(e) {
        if (drag.down) {
          const dx = e.clientX - drag.startX;
          const dy = e.clientY - drag.startY;
          if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) drag.moved = true;
          if (drag.moved) {
            world.position.set(drag.worldX + dx, drag.worldY + dy);
            clampCamera();
            canvas.style.cursor = "grabbing";
            return;
          }
        }
        const cell = screenToCell(e.clientX, e.clientY);
        const prev = view.hoverCell;
        if (!prev || prev.row !== cell.row || prev.col !== cell.col) {
          view.hoverCell = cell;
          drawGhost();
        }
        const building = findBuildingAtCell(currentBuildings(), cell.row, cell.col);
        updateTooltip(ghostTarget() ? null : building, e);
        canvas.style.cursor = building || availableChunkAt(cell.row, cell.col) || ghostTarget() ? "pointer" : "grab";
        if (propsRef.current.plantingSeed && building?.building_type !== "field") canvas.style.cursor = "grab";
      }

      function onPointerUp(e) {
        if (!drag.down) return;
        drag.down = false;
        canvas.releasePointerCapture?.(e.pointerId);
        if (!drag.moved) handleClick(screenToCell(e.clientX, e.clientY));
        canvas.style.cursor = "grab";
      }

      function onPointerLeave(e) {
        view.hoverCell = null;
        drawGhost();
        updateTooltip(null, e);
      }

      function onWheel(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const old = world.scale.x;
        const next = clamp(old * (e.deltaY < 0 ? 1.15 : 1 / 1.15), minZoom(), MAX_ZOOM);
        // Зум относительно точки под курсором
        world.position.set(
          sx - ((sx - world.position.x) / old) * next,
          sy - ((sy - world.position.y) / old) * next
        );
        world.scale.set(next);
        clampCamera();
      }

      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointerleave", onPointerLeave);
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.style.cursor = "grab";

      cleanup = () => {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointerleave", onPointerLeave);
        canvas.removeEventListener("wheel", onWheel);
        drawRef.current = null;
        drawGhostRef.current = null;
        appearanceRef.current = null;
        app.destroy(true, { children: true });
      };
    }

    initPixi().catch((e) => console.error("Pixi init error:", e));

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  return <div ref={hostRef} style={{ width: "100%", height: "100%", overflow: "hidden" }} />;
};

export default IsoFarmRenderer;
