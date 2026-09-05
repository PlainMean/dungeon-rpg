// Pure save/load. serialize()/deserialize() do no I/O — the renderer owns localStorage.
// State is a single JSON object, so round-trip is structurally exact; deserialize also
// sanity-clamps any corrupted value so a bad save can't wedge the sim.

import type { GameState } from "./types";

// localStorage keys are chosen by the renderer adapter; these constants live here so both
// layers agree (string constants are not I/O).
export const SAVE_KEY = "dungeon-rpg.save.v1";

/** JSON.stringify the state. Never throws for our plain-object state. */
export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

/** Parse a save string back into a GameState, defending against corruption. */
export function deserialize(json: string): GameState {
  const obj = JSON.parse(json) as GameState;
  if (!obj || typeof obj !== "object" || obj.version !== 1 || obj.seed === undefined || !obj.hero || !obj.field) {
    throw new Error("Save file is not a valid dungeon-rpg save.");
  }
  // clamp out-of-range health
  const hero = { ...obj.hero };
  hero.hp = clampInt(hero.hp, 0, hero.base.maxHp);
  hero.mp = clampInt(hero.mp, 0, hero.base.maxMp);
  hero.xp = clampInt(hero.xp, 0, 1e9);
  const inv = Array.isArray(obj.inventory) ? obj.inventory.map((it) => ({
    id: String(it.id), count: Math.max(0, it.count | 0), equipped: !!it.equipped,
  })) : [];
  const field = {
    ...obj.field,
    pos: { x: obj.field.pos?.x | 0, y: obj.field.pos?.y | 0 },
  };
  return { ...obj, hero, inventory: inv, field };
}

function clampInt(n: unknown, lo: number, hi: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}