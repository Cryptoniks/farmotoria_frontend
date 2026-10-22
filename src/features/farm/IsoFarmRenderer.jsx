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

const MIN_ZOOM = 0.4;
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

  const {
    fieldCfg, chunks, buildings, plots, availableChunks, coins,
    buildingToPlace, selected, movingBuilding, moveMode, moveChanges,
  } = props;

  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    drawRef.current?.();
  }, [fieldCfg, chunks, buildings, plots, availableChunks, coins, moveChanges, moveMode]);

  useEffect(() => {
    drawGhostRef.current?.();
  }, [buildingToPlace, selected, movingBuilding, moveMode]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = null;

    async function initPixi() {
      const host = hostRef.current;
      if (!host) return;

      const app = new PIXI.Application();
      await app.init({
        resizeTo: host,
        backgroundColor: 0x2b2b2b,
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
      const chunkLayer = new PIXI.Container();
      const buildingsLayer = new PIXI.Container();
      const ghostLayer = new PIXI.Container();
      buildingsLayer.sortableChildren = true;
      world.addChild(groundLayer, chunkLayer, buildingsLayer, ghostLayer);

      const ghost = new PIXI.Graphics();
      ghostLayer.addChild(ghost);

      const view = {
        hoverCell: null,
        pickedId: null, // здание, выбранное в режиме перемещения
        cameraReady: false,
      };

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
      }

      // -------------------------------------------------------------- draw --
      function clearLayer(layer) {
        for (const child of layer.removeChildren()) child.destroy({ children: true });
      }

      function drawGround() {
        clearLayer(groundLayer);
        const { chunkSize, maxSize } = cfg();
        const g = new PIXI.Graphics();

        // Всё поле до максимального размера — закрытая земля
        const all = footprint(0, 0, maxSize, maxSize);
        g.poly(poly(all.top, all.right, all.bottom, all.left)).fill({ color: 0x3d3d3d });

        // Купленные чанки — трава с сеткой клеток
        const owned = propsRef.current.chunks || [];
        for (const ch of owned) {
          const f = footprint(ch.chunk_row * chunkSize, ch.chunk_col * chunkSize, chunkSize, chunkSize);
          g.poly(poly(f.top, f.right, f.bottom, f.left)).fill({ color: 0x7cc36a });
        }
        for (const ch of owned) {
          const r0 = ch.chunk_row * chunkSize;
          const c0 = ch.chunk_col * chunkSize;
          for (let i = 0; i <= chunkSize; i++) {
            const a = gridToIsoTop(r0 + i, c0);
            const b = gridToIsoTop(r0 + i, c0 + chunkSize);
            const c = gridToIsoTop(r0, c0 + i);
            const d = gridToIsoTop(r0 + chunkSize, c0 + i);
            g.moveTo(a.x, a.y).lineTo(b.x, b.y);
            g.moveTo(c.x, c.y).lineTo(d.x, d.y);
          }
        }
        g.stroke({ width: 0.5, color: 0x000000, alpha: 0.12 });
        groundLayer.addChild(g);
      }

      function drawAvailableChunks() {
        clearLayer(chunkLayer);
        const { chunkSize } = cfg();
        const { availableChunks: list = [], coins: money = 0 } = propsRef.current;
        const g = new PIXI.Graphics();
        for (const ch of list) {
          const f = footprint(ch.chunk_row * chunkSize, ch.chunk_col * chunkSize, chunkSize, chunkSize);
          g.poly(poly(f.top, f.right, f.bottom, f.left))
            .fill({ color: 0xffd54f, alpha: 0.08 })
            .stroke({ width: 1, color: 0xffd54f, alpha: 0.5 });
        }
        chunkLayer.addChild(g);

        for (const ch of list) {
          const center = gridToIsoTop((ch.chunk_row + 0.5) * chunkSize, (ch.chunk_col + 0.5) * chunkSize);
          const label = makeLabel(`+ ${ch.cost}`, 32);
          label.style.fill = money >= ch.cost ? 0xffe082 : 0xbdbdbd;
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
        const texture = textures[b.slug];

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

          const plots = (propsRef.current.plots || []).filter((p) => p.building_id === b.id);
          if (plots.length) {
            const ready = plots.some((p) => p.is_ready || p.status === "ready");
            const icon = makeLabel(ready ? "🧺" : "🌱", 40);
            const c = gridToIsoTop(b.row + h / 2, b.col + w / 2);
            icon.position.set(c.x, c.y - 2);
            node.addChild(icon);
          }
        } else if (texture) {
          const sprite = new PIXI.Sprite(texture);
          const width = (w + h) * (TILE_W / 2);
          sprite.anchor.set(0.5, 1);
          sprite.scale.set(width / texture.width);
          sprite.position.set((f.left.x + f.right.x) / 2, f.bottom.y);
          node.addChild(sprite);
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

      function drawBuildings() {
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
        if (!target || !cell) return;
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

      drawRef.current = drawAll;
      drawGhostRef.current = () => {
        if (!propsRef.current.moveMode) view.pickedId = null;
        drawGhost();
      };
      centerCamera();
      drawAll();

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

        const chunk = availableChunkAt(cell.row, cell.col);
        if (chunk) {
          if ((p.coins ?? 0) < chunk.cost) {
            alert(`Недостаточно монет: участок стоит ${chunk.cost}`);
          } else if (confirm(`Купить участок за ${chunk.cost} монет?`)) {
            p.onBuyChunk?.(chunk.chunk_row, chunk.chunk_col);
          }
        }
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
        const next = clamp(old * (e.deltaY < 0 ? 1.15 : 1 / 1.15), MIN_ZOOM, MAX_ZOOM);
        // Зум относительно точки под курсором
        world.position.set(
          sx - ((sx - world.position.x) / old) * next,
          sy - ((sy - world.position.y) / old) * next
        );
        world.scale.set(next);
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
