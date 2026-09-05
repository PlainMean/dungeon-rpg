// Pure map access. Parses a map's tile-CSV into a grid and answers collision/encounter
// queries. No rendering, no Phaser — this is rule logic used by movement.

import type { Content } from "../content/schemas";
import type { Vec2 } from "./types";

/** Minimal fields parseMap needs. Generated floors and static maps both satisfy it. */
export type MapLike = {
  id: string;
  name?: string;
  width: number;
  height: number;
  tiles: string;
  spawn: { x: number; y: number };
  stairs?: Array<{ x: number; y: number; to: string }>;
  npcs?: Array<{ id: string; x: number; y: number; sprite: string; facing: string }>;
  chests?: Array<{ x: number; y: number; items: Array<{ id: string; count: number }> }>;
  signposts?: Array<{ x: number; y: number; text: string }>;
  encounterTileCategories?: string[];
  encounterStepChance?: number;
  music?: string;
  [k: string]: unknown;
};

export interface ParsedMap {
  data: MapLike;
  grid: string[][]; // [y][x] tile id
}

/**
 * Single-char map codes -> content tile ids. Overworld and generated floors both encode
 * with these so parseMap can normalize both to content-tile names.
 */
export const CHAR_TO_TILE: Record<string, string> = {
  g: "grass",
  G: "tallgrass",
  T: "forest",
  "~": "water",
  "#": "wall",
  ".": "vfloor",
  R: "road",
  v: "stairs_down",
  "^": "stairs_up",
  d: "dfloor",
  D: "dwall",
  s: "sand",
};

/** Parse a map's CSV tile string into a 2D grid of content tile ids. O(n). */
export function parseMap(data: MapLike): ParsedMap {
  const decode = (raw: string): string => CHAR_TO_TILE[raw] ?? raw;
  if (data.tiles.startsWith("[")) {
    // tolerate JSON array form
    const arr = JSON.parse(data.tiles) as string[];
    const grid: string[][] = [];
    for (let y = 0; y < data.height; y++) {
      grid.push(arr.slice(y * data.width, (y + 1) * data.width).map(decode));
    }
    return { data, grid };
  }
  const parts = data.tiles.split(",");
  const grid: string[][] = [];
  for (let y = 0; y < data.height; y++) {
    grid.push(parts.slice(y * data.width, (y + 1) * data.width).map(decode));
  }
  return { data, grid };
}

export function tileAt(pm: ParsedMap, x: number, y: number): string {
  if (x < 0 || y < 0 || x >= pm.data.width || y >= pm.data.height) return "water"; // out of bounds = solid
  return pm.grid[y][x];
}

export function isSolid(pm: ParsedMap, content: Content, x: number, y: number): boolean {
  const tile = tileAt(pm, x, y);
  const def = content.tiles[tile];
  return !def || def.solid;
}

export function inBounds(pm: ParsedMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < pm.data.width && y < pm.data.height;
}

export function isWalkable(pm: ParsedMap, content: Content, x: number, y: number): boolean {
  return inBounds(pm, x, y) && !isSolid(pm, content, x, y);
}

/** Does stepping on this tile risk a random encounter? */
export function isEncounterTile(pm: ParsedMap, content: Content, x: number, y: number): boolean {
  const tile = tileAt(pm, x, y);
  const def = content.tiles[tile];
  return !!def?.encounter;
}

export const DIR_DELTA: Record<string, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function facingTarget(pos: Vec2, facing: string): Vec2 {
  const d = DIR_DELTA[facing] ?? DIR_DELTA.down;
  return { x: pos.x + d.x, y: pos.y + d.y };
}