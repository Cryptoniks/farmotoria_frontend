/**
 * Isometric grid math utilities for the farm game.
 * Converts between grid coordinates and isometric screen coordinates.
 */

export const TILE_W = 16;
export const TILE_H = 8;
export const CHUNK_SIZE = 10;
export const MAX_SIZE = 250;
export const START_UNLOCKED = 50;
export const DEBUG_BUILDING_BOX = typeof import !== 'undefined' && import.meta?.env?.DEV;
export const DRAG_THRESHOLD_PX = 6;

/** Convert grid row/col to isometric screen position (top corner) */
export function gridToIsoTop(row, col) {
  const x = (col - row) * (TILE_W / 2);
  const y = (col + row) * (TILE_H / 2);
  return { x, y };
}

/** Convert grid row/col to isometric screen position (center) */
export function gridToIsoCenter(row, col) {
  const p = gridToIsoTop(row, col);
  return { x: p.x + TILE_W / 2, y: p.y + TILE_H / 2 };
}

/** Convert isometric screen position to grid row/col */
export function isoToGrid(x, y) {
  const col = (y / (TILE_H / 2) + x / (TILE_W / 2)) / 2;
  const row = (y / (TILE_H / 2) - x / (TILE_W / 2)) / 2;
  return { row, col };
}

/** Generate chunk key from row/col */
export function chunkKey(cr, cc) {
  return `${cr},${cc}`;
}

/** Convert cell row/col to chunk row/col */
export function cellToChunk(row, col, chunkSize = CHUNK_SIZE) {
  return [Math.floor(row / chunkSize), Math.floor(col / chunkSize)];
}

/** Check if two rectangles overlap */
export function rectsOverlap(a_row, a_col, a_w, a_h, b_row, b_col, b_w, b_h) {
  return !(
    a_col + a_w <= b_col ||
    b_col + b_w <= a_col ||
    a_row + a_h <= b_row ||
    b_row + b_h <= a_row
  );
}

/** Clamp value between min and max */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Get building dimensions (handles w/h or width/height properties) */
export function getBuildingDimensions(building) {
  return {
    w: Number(building.w ?? building.width ?? 1),
    h: Number(building.h ?? building.height ?? 1),
  };
}

/** Find building at grid position */
export function findBuildingAtCell(buildings, row, col) {
  for (const b of buildings) {
    const { w, h } = getBuildingDimensions(b);
    if (row >= b.row && row < b.row + h && col >= b.col && col < b.col + w) {
      return b;
    }
  }
  return null;
}

/** Check if a cell is unlocked */
export function isCellUnlocked(unlockedChunks, row, col, chunkSize = CHUNK_SIZE) {
  if (!unlockedChunks || unlockedChunks.size === 0) {
    return row >= 0 && col >= 0 && row < START_UNLOCKED && col < START_UNLOCKED;
  }
  const [cr, cc] = cellToChunk(row, col, chunkSize);
  return unlockedChunks.has(chunkKey(cr, cc));
}

/** Check if building can be placed at position */
export function canPlaceAt(buildings, row, col, w, h, unlockedChunks, chunkSize = CHUNK_SIZE) {
  if (row < 0 || col < 0) return false;
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      if (!isCellUnlocked(unlockedChunks, r, c, chunkSize)) return false;
    }
  }
  for (const b of buildings) {
    const { w: bw, h: bh } = getBuildingDimensions(b);
    if (rectsOverlap(row, col, w, h, b.row, b.col, bw, bh)) return false;
  }
  return true;
}
