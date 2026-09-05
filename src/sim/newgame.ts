// Builds the initial GameState for a fresh run from an explicit seed (deterministic),
// and loadWorld() that merges generated dungeon floors into the static content bundle.
// Seeds are chosen by the renderer/UI, never by sim logic (keeps sim delivery-deterministic).

import type { Content } from "../content/schemas";
import type { GameState } from "./types";
import { loadContent } from "./content";
import { generateFloors } from "./dungeon";
import { seedRng } from "./prng";
import type { Rng } from "./prng";

/** Static content PLUS the three generated dungeon floors for the given seed. */
export function loadWorld(seed: number): Content {
  const content = loadContent();
  const floors = generateFloors(seed, content);
  const maps = { ...content.maps };
  for (const f of floors) maps[f.id] = f;
  return { ...content, maps };
}

// Generation is deterministic for a (seed, floors) pair; cache by seed so identical runs
// reuse the same layout and don't re-consume RNG during play.
const worldCache = new Map<number, Content>();
export function cachedWorld(seed: number): Content {
  const hit = worldCache.get(seed);
  if (hit) return hit;
  const w = loadWorld(seed);
  worldCache.set(seed, w);
  return w;
}

export function newGame(seed: number): GameState {
  const content = loadContent();
  const map = content.maps.overworld;
  const rng: Rng = seedRng(seed);
  const startRow = content.levels.find((l) => l.level === 1)!;
  const hero = {
    name: "Kellan",
    level: 1,
    xp: 0,
    hp: startRow.maxHp,
    mp: startRow.maxMp,
    base: { baseAtk: startRow.atk, baseDef: startRow.def, maxHp: startRow.maxHp, maxMp: startRow.maxMp },
    weapon: null,
    armor: null,
    skills: [...startRow.learns],
  };
  const inventory = [
    { id: "potion", count: 2, equipped: false },
    { id: "herb", count: 2, equipped: false },
  ];
  return {
    version: 1,
    seed,
    rng,
    tick: 0,
    mode: "field",
    hero,
    inventory,
    gold: 30,
    field: { mapId: "overworld", pos: { ...map.spawn }, facing: "down", anim: null, stepsOnGrass: 0 },
    battle: null,
    dialogue: null,
    shop: null,
    quest: { id: "mainquest", stage: "none", dungeonCleared: false, hasSunstone: false },
    flags: {},
    floor: -1,
    message: "Welcome to Sunvale.",
    isNewGame: true,
    victoryAt: null,
  };
}