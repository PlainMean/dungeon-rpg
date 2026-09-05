// Deterministic dungeon floor generation. Floors are OverworldMapData compatible so the
// rest of the sim treats them like any map. Generation uses a seeded RNG so a given run
// seed always yields the same three floors. Solvability is enforced by BFS.

import type { OverworldMapData, Content } from "../content/schemas";
import type { Rng } from "./prng";
import { chance } from "./prng";
import { parseMap, isWalkable } from "./map";
import type { MapLike, ParsedMap } from "./map";

const FW = 20;
const FH = 14;

function bfsReachable(
  content: Content, pm: ParsedMap,
  spawn: { x: number; y: number }, goal: { x: number; y: number },
): boolean {
  const visited = new Set<string>([`${spawn.x},${spawn.y}`]);
  const queue = [{ ...spawn }];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.x === goal.x && cur.y === goal.y) return true;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && isWalkable(pm, content, nx, ny)) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return false;
}

function gridToTiles(g: string[][]): string {
  return g.map((r) => r.join("")).join("").split("").join(",");
}

function floorIndexToId(i: number): string {
  return `floor${i + 1}`;
}
function floorIndexToName(i: number): string {
  return ["The Sunken Crypt — Floor 1", "The Sunken Crypt — Floor 2", "The Sunken Crypt — Throne"][i];
}

export function generateFloor(floorIndex: number, rng: Rng, content: Content): OverworldMapData {
  const attemptLimit = 40;
  const spawn = { x: 1, y: 1 };
  const goal = { x: FW - 2, y: FH - 2 };
  const name = floorIndexToName(floorIndex);
  const id = floorIndexToId(floorIndex);

  for (let attempt = 0; attempt < attemptLimit; attempt++) {
    const g: string[][] = Array.from({ length: FH }, () => Array.from({ length: FW }, () => "d"));
    for (let x = 0; x < FW; x++) { g[0][x] = "D"; g[FH - 1][x] = "D"; }
    for (let y = 0; y < FH; y++) { g[y][0] = "D"; g[y][FW - 1] = "D"; }
    // interior pillars with occasional corridor breaks
    for (let y = 2; y < FH - 2; y += 2) {
      for (let x = 2; x < FW - 2; x += 2) {
        if (chance(rng, 0.45)) {
          g[y][x] = "D";
          if (chance(rng, 0.4)) g[y][x + 1] = "D";
        }
      }
    }
    // spawn + goal stay open
    g[spawn.y][spawn.x] = "d";
    g[goal.y][goal.x] = "^";

    const data: MapLike = {
      id, name, width: FW, height: FH, tiles: gridToTiles(g), spawn,
      stairs: [{ x: goal.x, y: goal.y, to: floorIndex === 2 ? "overworld" : floorIndexToId(floorIndex + 1) }],
      encounterTileCategories: ["dungeon_floor"],
      encounterStepChance: 0.35,
      ...(floorIndex === 2 ? { bossExitX: goal.x, bossExitY: goal.y } : {}),
    };
    const pm = parseMap(data);
    if (bfsReachable(content, pm, spawn, goal)) {
      return data as OverworldMapData;
    }
  }
  // Defensive fallback: a fully open floor (guaranteed solvable). Shouldn't happen.
  const g: string[][] = Array.from({ length: FH }, () => Array.from({ length: FW }, () => "d"));
  for (let x = 0; x < FW; x++) { g[0][x] = "D"; g[FH - 1][x] = "D"; }
  for (let y = 0; y < FH; y++) { g[y][0] = "D"; g[y][FW - 1] = "D"; }
  g[spawn.y][spawn.x] = "d";
  g[goal.y][goal.x] = "^";
  return {
    id, name, width: FW, height: FH, tiles: gridToTiles(g), spawn,
    stairs: [{ x: goal.x, y: goal.y, to: floorIndex === 2 ? "overworld" : floorIndexToId(floorIndex + 1) }],
  } as OverworldMapData;
}

/** Generate all three floors deterministically from the run seed (cached across calls). */
const floorCache = new Map<number, OverworldMapData[]>();
export function generateFloors(seed: number, content: Content): OverworldMapData[] {
  const hit = floorCache.get(seed);
  if (hit) return hit;
  const rng: Rng = { state: seed >>> 0, calls: 0 };
  const floors = [0, 1, 2].map((i) => generateFloor(i, rng, content));
  floorCache.set(seed, floors);
  return floors;
}

/** Encounter categories + chance a map declares (floors and overworld). */
export function encounterSetup(m: MapLike): { categories: string[]; chance: number } {
  return {
    categories: m.encounterTileCategories ?? ["dungeon_floor"],
    chance: m.encounterStepChance ?? 0.3,
  };
}