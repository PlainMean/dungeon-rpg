// Central invariant checks over GameState. These must hold for ALL inputs after ANY command
// sequence. Shared by the fast-check property test and the soak fuzzer.

import type { GameState } from "./types";
import { cachedWorld } from "./newgame";
import { parseMap } from "./map";
import { INVENTORY_CAPACITY } from "./inventory";

export interface InvariantViolation {
  when: string;
  detail: string;
}

/** Returns a list of violations (empty = all invariants hold). Pure & deterministic. */
export function checkInvariants(s: GameState): InvariantViolation[] {
  const v: InvariantViolation[] = [];
  const push = (when: string, detail: string) => v.push({ when, detail });

  // HP / MP bounds
  if (s.hero.hp < 0 || s.hero.hp > s.hero.base.maxHp) push("hero.hp", `hp=${s.hero.hp} max=${s.hero.base.maxHp}`);
  if (s.hero.mp < 0 || s.hero.mp > s.hero.base.maxMp) push("hero.mp", `mp=${s.hero.mp} max=${s.hero.base.maxMp}`);

  // inventory capacity
  if (s.inventory.length > INVENTORY_CAPACITY) push("inventory.size", `${s.inventory.length}>${INVENTORY_CAPACITY}`);
  for (const it of s.inventory) {
    if (it.count < 0) push("inventory.count", `${it.id}:${it.count}`);
  }
  // no duplicate item ids
  const seen = new Set<string>();
  for (const it of s.inventory) {
    if (seen.has(it.id)) push("inventory.dupe", it.id);
    seen.add(it.id);
  }

  // gold non-negative
  if (s.gold < 0) push("gold", `${s.gold}`);

  // position inside bounds and off solid tiles (only relevant in field/dialogue/shop/menu/victory)
  if (s.mode !== "gameover") {
    const world = cachedWorld(s.seed);
    const map = world.maps[s.field.mapId];
    if (map) {
      const pm = parseMap(map);
      const { x, y } = s.field.pos;
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
        push("pos.bounds", `${x},${y} in ${s.field.mapId}`);
      } else {
        const tile = world.tiles[pm.grid[y][x]];
        if (tile && tile.solid) push("pos.solid", `standing on ${tile.category} at ${x},${y}`);
      }
    }
  }

  // quest stages only from the known set
  if (!["none", "accepted", "dungeon_cleared", "complete"].includes(s.quest.stage)) {
    push("quest.stage", s.quest.stage);
  }
  // tick monotonically increases and rng calls increase
  if (s.tick < 0) push("tick", `${s.tick}`);

  return v;
}