/**
 * IsoFarmRenderer - PixiJS rendering component for the isometric farm.
 * Handles all PixiJS initialization, rendering, and game loop.
 */

import React, { useRef, useEffect } from "react";
import * as PIXI from "pixi.js";
import {
  gridToIsoTop,
  gridToIsoCenter,
  isoToGrid,
  chunkKey,
  cellToChunk,
  rectsOverlap,
  clamp,
  getBuildingDimensions,
  findBuildingAtCell,
  isCellUnlocked as checkIsCellUnlocked,
  CHUNK_SIZE,
  MAX_SIZE,
  START_UNLOCKED,
  TILE_W,
  TILE_H,
  DRAG_THRESHOLD_PX,
} from "./isoUtils";

const IsoFarmRenderer = ({
  fieldCfg,
  chunks,
  buildings,
  plots,
  availableChunks,
  coins,
  hoveredBuilding,
  setHoveredBuilding,
  selected,
  buildingToPlace,
  movingBuilding,
  moveMode,
  onPlantSeed,
  onHarvest,
  onRemoveBuilding,
  onBuyChunk,
  onPlaceBuilding,
  onMoveBuilding,
}) => {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const worldRef = useRef(null);
  const tileTexRef = useRef(null);
  const lockedTexRef = useRef(null);
  const tilePoolRef = useRef(new Map());
  const tileVisibleRef = useRef(new Set());
  const buildingSpriteRef = useRef(new Map());
  const fieldSpriteRef = useRef(new Map());
  const fieldOverlayRef = useRef(new Map());
  const unlockedSetRef = useRef(new Set());
  const buildingsRef = useRef([]);
  const selectedRef = useRef(null);
  const availableChunksRef = useRef([]);
  const coinsRef = useRef(0);
  const plotsRef = useRef([]);
  const buildingToPlaceRef = useRef(null);
  const moveModeRef = useRef(false);
  const movingBuildingRef = useRef(null);
  const syncBuildingsRef = useRef(null);
  const syncFieldsRef = useRef(null);

  // Update refs when state changes
  useEffect(() => {
    unlockedSetRef.current = new Set(chunks.map((ch) => chunkKey(ch.chunk_row, ch.chunk_col)));
  }, [chunks]);

  useEffect(() => {
    buildingsRef.current = buildings;
  }, [buildings]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    availableChunksRef.current = availableChunks;
  }, [availableChunks]);

  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  useEffect(() => {
    plotsRef.current = plots;
  }, [plots]);

  useEffect(() => {
    buildingToPlaceRef.current = buildingToPlace;
  }, [buildingToPlace]);

  useEffect(() => {
    moveModeRef.current = moveMode;
  }, [moveMode]);

  useEffect(() => {
    movingBuildingRef.current = movingBuilding;
  }, [movingBuilding]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = null;

    async function initPixi() {
      if (!hostRef.current) return;

      const width = Math.max(200, hostRef.current.clientWidth);
      const height = Math.max(200, hostRef.current.clientHeight);

      const app = new PIXI.Application();
      await app.init({
        width,
        height,
        backgroundColor: 0x2b2b2b,
        antialias: true,
      });

      if (cancelled) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(app.canvas);

      const world = new PIXI.Container();
      worldRef.current = world;
      app.stage.addChild(world);

      const tilesLayer = new PIXI.Container();
      const fieldsLayer = new PIXI.Container();
      const fieldOverlayLayer = new PIXI.Container();
      const buildingsLayer = new PIXI.Container();
      const ghostLayer = new PIXI.Container();
      const buyButtonsLayer = new PIXI.Container();

      world.sortableChildren = true;
      tilesLayer.zIndex = 0;
      fieldsLayer.zIndex = 5;
      fieldOverlayLayer.zIndex = 6;
      buildingsLayer.zIndex = 10;
      ghostLayer.zIndex = 20;
      buyButtonsLayer.zIndex = 30;
      buildingsLayer.sortableChildren = true;

      world.addChild(tilesLayer);
      world.addChild(fieldsLayer);
      world.addChild(fieldOverlayLayer);
      world.addChild(buildingsLayer);
      world.addChild(ghostLayer);
      world.addChild(buyButtonsLayer);

      // Tile textures
      const grass = new PIXI.Graphics();
      grass.beginFill(0x7cc36a);
      grass.lineStyle(1, 0x000000, 0.12);
      grass.moveTo(TILE_W / 2, 0);
      grass.lineTo(TILE_W, TILE_H / 2);
      grass.lineTo(TILE_W / 2, TILE_H);
      grass.lineTo(0, TILE_H / 2);
      grass.closePath();
      grass.endFill();
      tileTexRef.current = app.renderer.generateTexture(grass);

      const locked = new PIXI.Graphics();
      locked.beginFill(0x444444);
      locked.lineStyle(1, 0x000000, 0.15);
      locked.moveTo(TILE_W / 2, 0);
      locked.lineTo(TILE_W, TILE_H / 2);
      locked.lineTo(TILE_W / 2, TILE_H);
      locked.lineTo(0, TILE_H / 2);
      locked.closePath();
      locked.endFill();
      lockedTexRef.current = app.renderer.generateTexture(locked);

      world.scale.set(1);
      {
        const p = gridToIsoCenter(50, 50);
        world.position.set(app.renderer.width / 2 - p.x, app.renderer.height / 2 - p.y);
      }

      function getCfg() {
        return fieldCfg || {
          chunk_size: CHUNK_SIZE,
          max_size: MAX_SIZE,
        };
      }

      function screenToWorld(sx, sy) {
        return {
          x: (sx - world.position.x) / world.scale.x,
          y: (sy - world.position.y) / world.scale.y,
        };
      }

      function worldToCell(wx, wy) {
        const g = isoToGrid(wx, wy);
        return { row: Math.floor(g.row), col: Math.floor(g.col) };
      }

      function isCellUnlocked(row, col) {
        const cfg = getCfg();
        const cs = cfg.chunk_size || CHUNK_SIZE;
        return checkIsCellUnlocked(unlockedSetRef.current, row, col, cs);
      }

      function canPlaceAt(row, col, w, h) {
        const cfg = getCfg();
        if (row < 0 || col < 0) return false;
        if (row + h > cfg.max_size || col + w > cfg.max_size) return false;
        for (let r = row; r < row + h; r++) {
          for (let c = col; c < col + w; c++) {
            if (!isCellUnlocked(r, c)) return false;
          }
        }
        for (const b of buildingsRef.current) {
          const { w: bw, h: bh } = getBuildingDimensions(b);
          if (rectsOverlap(row, col, w, h, b.row, b.col, bw, bh)) return false;
        }
        return true;
      }

      // ... (continues in next part)
    }

    initPixi();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  return <div ref={hostRef} style={{ width: "100%", height: "100%" }} />;
};

export default IsoFarmRenderer;
