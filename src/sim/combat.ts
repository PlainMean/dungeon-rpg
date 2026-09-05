// Turn-based combat engine. Pure: takes copies of hero/battle and returns new copies.
// All randomness flows through the rng threaded from state.

import type { Content } from "../content/schemas";
import type { Rng } from "./prng";
import type { BattleState, EnemyInstance, Hero, InventoryItem } from "./types";
import { chance, nextInt } from "./prng";

export interface BattleReward {
  xp: number;
  gold: number;
  drops: Array<{ id: string; count: number }>;
}

export interface BattleStepResult {
  battle: BattleState;
  hero: Hero;
  inventory: InventoryItem[];
  victory: boolean;
  defeat: boolean;
}

function cloneEnemies(enemies: EnemyInstance[]): EnemyInstance[] {
  return enemies.map((e) => ({ ...e }));
}

function physDamage(rng: Rng, atk: number, def: number): number {
  let dmg = Math.max(1, atk - def) + nextInt(rng, -2, 2);
  if (chance(rng, 0.1)) dmg = Math.floor(dmg * 1.5);
  return Math.max(1, dmg);
}

function firstLiving(enemies: EnemyInstance[]): number {
  return enemies.findIndex((e) => e.alive);
}

export function enemiesAlive(b: BattleState): boolean {
  return b.enemies.some((e) => e.alive);
}

/**
 * Apply one player battle action. Returns {r,battle,hero,inventory,victory,defeat}.
 * It resolves the full player action AND then the enemy turn, then recomputes phase.
 */
export function stepBattle(
  b: BattleState,
  hero: Hero,
  inventory: InventoryItem[],
  content: Content,
  action:
    | { type: "attack" }
    | { type: "guard" }
    | { type: "skill"; skillId: string; target: number }
    | { type: "useItem"; itemId: string },
  rng: Rng,
): BattleStepResult {
  let battle: BattleState = { ...b, enemies: cloneEnemies(b.enemies), log: [], selectedAction: null };
  let h: Hero = { ...hero };
  let inv: InventoryItem[] = inventory.map((it) => ({ ...it }));
  let victory = false;
  let defeat = false;

  const guardPlayer = action.type === "guard";

  // --- player action ---
  if (action.type === "attack") {
    const idx = firstLiving(battle.enemies);
    const e = battle.enemies[idx];
    const dmg = physDamage(rng, effectiveAtk(h, content), e.def);
    e.hp = Math.max(0, e.hp - dmg);
    e.alive = e.hp > 0;
    battle.enemies = [...battle.enemies];
    battle.log.push(`You strike the ${e.name} for ${dmg} damage.`);
  } else if (action.type === "guard") {
    battle.log.push("You brace behind your guard.");
    battle.selectedAction = "guard";
  } else if (action.type === "skill") {
    const skill = content.skills[action.skillId];
    if (skill && h.mp >= skill.mpCost) {
      h = { ...h, mp: h.mp - skill.mpCost };
      if (skill.kind === "magic") {
        const idx = action.target >= 0 && action.target < battle.enemies.length ? action.target : firstLiving(battle.enemies);
        if (idx >= 0) {
          const e = battle.enemies[idx];
          const atk = effectiveAtk(h, content);
          let dmg = Math.max(1, skill.power + Math.floor(atk / 2) - e.def) + nextInt(rng, -2, 2);
          dmg = Math.max(1, dmg);
          e.hp = Math.max(0, e.hp - dmg);
          e.alive = e.hp > 0;
          battle.enemies = [...battle.enemies];
          battle.log.push(`${skill.name} sears the ${e.name} for ${dmg}.`);
        }
      } else if (skill.kind === "heal") {
        const heal = Math.min(h.base.maxHp - h.hp, skill.healHp ?? 0);
        h = { ...h, hp: h.hp + heal };
        battle.log.push(`${skill.name} restores ${heal} HP.`);
      } else {
        battle.log.push(`${skill.name} shines.`);
      }
    } else {
      battle.log.push("Not enough MP!");
      victory = false;
      // no-op turn
    }
  } else if (action.type === "useItem") {
    const item = content.items[action.itemId];
    if (item && inv.some((it) => it.id === action.itemId && it.count > 0)) {
      inv = inv
        .map((it) => (it.id === action.itemId ? { ...it, count: it.count - 1 } : it))
        .filter((it) => it.count > 0);
      const healHp = item.healHp ?? 0;
      const healMp = item.healMp ?? 0;
      const hpGain = Math.min(h.base.maxHp - h.hp, healHp);
      const mpGain = Math.min(h.base.maxMp - h.mp, healMp);
      h = { ...h, hp: h.hp + hpGain, mp: h.mp + mpGain };
      battle.log.push(`You use ${item.name}.`);
    } else {
      battle.log.push("No such item.");
    }
  }

  // --- victory check after player action ---
  if (!enemiesAlive(battle)) {
    victory = true;
    battle.phase = "victory";
    return { battle, hero: h, inventory: inv, victory, defeat };
  }

  // --- enemy turn (guarding halves incoming) ---
  for (const e of battle.enemies) {
    if (!e.alive) continue;
    let dmg: number;
    const useSkill = e.skillIds.length > 0 && chance(rng, 0.35);
    if (useSkill) {
      const skill = content.skills[e.skillIds[0]];
      dmg = Math.max(1, (skill?.power ?? 8) - effectiveDef(h, content)) + nextInt(rng, -2, 2);
      battle.log.push(`${e.name} weaves dark magic for ${dmg} damage.`);
    } else {
      dmg = physDamage(rng, e.atk, effectiveDef(h, content));
      battle.log.push(`${e.name} attacks for ${dmg} damage.`);
    }
    if (guardPlayer) dmg = Math.max(1, Math.floor(dmg / 2));
    h = { ...h, hp: Math.max(0, h.hp - dmg) };
  }

  if (h.hp <= 0) {
    defeat = true;
    battle.phase = "defeat";
  } else {
    battle.phase = "player_select";
  }
  return { battle, hero: h, inventory: inv, victory, defeat };
}

export function effectiveAtk(hero: Hero, content: Content): number {
  const w = hero.weapon ? content.items[hero.weapon] : undefined;
  return hero.base.baseAtk + (w?.atkBonus ?? 0);
}
export function effectiveDef(hero: Hero, content: Content): number {
  const a = hero.armor ? content.items[hero.armor] : undefined;
  return hero.base.baseDef + (a?.defBonus ?? 0);
}

export function computeReward(battle: BattleState, content: Content): BattleReward {
  let xp = 0, gold = 0;
  const drops: Array<{ id: string; count: number }> = [];
  for (const e of battle.enemies) {
    const def = content.enemies[e.id];
    if (!def) continue;
    xp += def.xp;
    gold += def.gold;
    for (const d of def.drops) {
      void e;
      drops.push({ id: d.id, count: 1 });
    }
  }
  return { xp, gold, drops };
}

/** Build a battle from an encounter id. Uses rng; deterministic per position of rng. */
export function startBattle(
  encounterId: string,
  _atFloor: number,
  content: Content,
  rng: Rng,
): BattleState {
  const table = content.encounters[encounterId];
  if (!table) throw new Error(`Unknown encounter: ${encounterId}`);
  const count = nextInt(rng, table.countMin, table.countMax);
  const entries = Object.entries(table.weights);
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = nextInt(rng, 0, total - 1);
    for (const [id, w] of entries) {
      if (roll < w) { ids.push(id); break; }
      roll -= w;
    }
  }
  const enemies: EnemyInstance[] = ids.map((id) => {
    const def = content.enemies[id];
    return {
      id,
      name: def.name,
      hp: def.hp,
      maxHp: def.hp,
      atk: def.atk,
      def: def.def,
      speed: def.speed,
      xp: def.xp,
      gold: def.gold,
      drops: def.drops,
      skillIds: def.skillIds ?? [],
      alive: true,
      ho: true,
    };
  });
  return {
    enemyIds: ids,
    enemies,
    phase: "player_select",
    turnActor: "player",
    log: [`A ${ids.map((i) => content.enemies[i].name).join(" and ")} blocks your path!`],
    selectedAction: null,
    selectedTarget: 0,
    selectedSkill: null,
    usedItem: null,
    pendingReward: null,
  };
}