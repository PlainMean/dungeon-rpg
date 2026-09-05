// The single pure reducer: step(state, commands) -> state. All game rules funnel through
// here. Same seed + same command sequence => byte-identical state forever. No DOM, no
// Phaser, no timers, no I/O. World content is derived deterministically from state.seed.

import type { GameState, BattleState } from "./types";
import type { Command } from "./commands";
import { DIR_DELTA, parseMap, isWalkable, tileAt } from "./map";
import { cachedWorld, newGame } from "./newgame";
import type { Content, OverworldMapData } from "../content/schemas";
import { stepBattle, startBattle } from "./combat";
import { grantXp } from "./leveling";
import { addItems, removeItems, countOf } from "./inventory";
import { chance } from "./prng";
import { encounterSetup } from "./dungeon";

/** Advance the world by one 60Hz tick, applying the given commands for this tick. */
export function step(state: GameState, commands: Command[]): GameState {
  let s: GameState = state;
  for (const cmd of commands) {
    s = processCommand({ ...s, tick: s.tick + 1 }, cmd);
  }
  return s;
}

function processCommand(s: GameState, cmd: Command): GameState {
  switch (s.mode) {
    case "field": {
      if (cmd.type === "startNewGame") return newGame(cmd.seed ?? 1);
      return fieldCommand(s, cmd);
    }
    case "battle": return battleCommand(s, cmd);
    case "dialogue": return dialogueCommand(s, cmd);
    case "shop": return shopCommand(s, cmd);
    case "menu": return menuCommand(s, cmd);
    case "gameover":
    case "victory":
      return s;
  }
}

// ------------------------------------------------------------- field
function fieldCommand(s: GameState, cmd: Command): GameState {
  switch (cmd.type) {
    case "move":
      return applyMove(s, cmd.dir);
    case "interact":
    case "confirm":
      return interact(s);
    case "toggleMenu":
      return { ...s, mode: "menu" };
    default:
      return s;
  }
}

function applyMove(s: GameState, dir: "up" | "down" | "left" | "right"): GameState {
  const world = cachedWorld(s.seed);
  const map = world.maps[s.field.mapId];
  if (!map) return s;
  const pm = parseMap(map);
  const d = DIR_DELTA[dir];
  const nx = s.field.pos.x + d.x;
  const ny = s.field.pos.y + d.y;
  let next: GameState = { ...s, field: { ...s.field, facing: dir } };
  if (!isWalkable(pm, world, nx, ny)) return next; // bump into solid tile
  const destTile = tileAt(pm, nx, ny);

  // floor3 exit is gated behind the boss
  if (s.field.mapId === "floor3" && destTile === "stairs_up" && !s.flags.bossDefeated) {
    return startBossBattle(next);
  }
  // stairs transition (overworld entrance, floor exits)
  if (destTile === "stairs_up" || destTile === "stairs_down") {
    return stepStairs(next, nx, ny, map, world);
  }

  next = { ...next, field: { ...next.field, pos: { x: nx, y: ny } } };
  // random encounter on encounter-tile categories
  const setup = encounterSetup(map);
  const tileDef = world.tiles[destTile];
  if (tileDef && setup.categories.includes(tileDef.category) && chance(s.rng, setup.chance)) {
    const table = floorEncounter(map.id);
    const battle = startBattle(table, s.floor, world, s.rng);
    next = { ...next, mode: "battle", battle };
  }
  return next;
}

function floorEncounter(mapId: string): string {
  if (mapId === "floor1") return "floor1";
  if (mapId === "floor2") return "floor2";
  if (mapId === "floor3") return "floor3";
  return "overworld";
}

// ------------------------------------------------------------- battle
function battleCommand(s: GameState, cmd: Command): GameState {
  const battle = s.battle;
  if (!battle) return s;
  const world = cachedWorld(s.seed);
  let action:
    | { type: "attack"; }
    | { type: "guard"; }
    | { type: "skill"; skillId: string; target: number }
    | { type: "useItem"; itemId: string } | null = null;
  if (cmd.type === "battleAction") action = cmd.action === "attack" ? { type: "attack" } : { type: "guard" };
  else if (cmd.type === "battleSkill") action = { type: "skill", skillId: cmd.skillId, target: cmd.target ?? 0 };
  else if (cmd.type === "battleUseItem") action = { type: "useItem", itemId: cmd.itemId };
  if (!action) return s; // battleTarget / battleBack are UI-only

  const res = stepBattle(battle, s.hero, s.inventory, world, action, s.rng);
  let next: GameState = { ...s, hero: res.hero, inventory: res.inventory, battle: res.battle };
  if (res.victory) next = applyVictory(next, res.battle);
  else if (res.defeat) next = { ...next, mode: "gameover", battle: null, message: "You have been defeated..." };
  return next;
}

function applyVictory(s: GameState, battle: BattleState): GameState {
  const world = cachedWorld(s.seed);
  let xp = 0, goldGain = 0;
  for (const e of battle.enemies) {
    const def = world.enemies[e.id];
    if (!def) continue;
    xp += def.xp;
    goldGain += def.gold;
  }
  let inv = [...s.inventory];
  const lv = grantXp(s.hero, xp, world);
  let hero = lv.hero;
  let flags = { ...s.flags };
  let quest = s.quest;
  let message = lv.leveledUp ? `You reached level ${hero.level}! +${goldGain} gold.` : `Victory! +${goldGain} gold.`;

  if (s.field.mapId === "floor3" && battle.enemies.some((e) => e.id === "boss") && !flags.bossDefeated) {
    flags = { ...flags, bossDefeated: true };
    quest = { ...quest, dungeonCleared: true, stage: "dungeon_cleared" };
    if (countOf(inv, "sunstone") === 0) inv = addItems(inv, "sunstone", 1, world).inventory;
    message = "The Dread falls! You claim the Sunstone.";
  }
  return {
    ...s,
    hero,
    gold: s.gold + goldGain,
    inventory: inv,
    flags,
    quest,
    mode: "field",
    battle: null,
    message,
    field: { ...s.field, anim: null },
  };
}

// ------------------------------------------------------------- dialogue
function dialogueCommand(s: GameState, cmd: Command): GameState {
  const d = s.dialogue;
  if (!d) return s;
  const world = cachedWorld(s.seed);
  const npc = world.npcs[d.npcId];
  const lines = d.lines;
  if (cmd.type === "dialogueNext" || cmd.type === "confirm" || cmd.type === "interact") {
    if (d.lineIndex < lines.length - 1) {
      return { ...s, dialogue: { ...d, lineIndex: d.lineIndex + 1 } };
    }
    // ---- last line ----
    // quest completion (already have the Sunstone)
    if (npc?.questId && s.quest.stage === "dungeon_cleared") {
      return {
        ...s,
        dialogue: null,
        quest: { ...s.quest, stage: "complete" },
        mode: "victory",
        victoryAt: s.tick,
        message: "The Sunstone is restored! Sunvale is saved.",
      };
    }
    // quest accept (stage none, offer on the table)
    if (npc?.questId && s.quest.stage === "none" && lines.some((l) => l.includes("accept this quest"))) {
      return {
        ...s,
        dialogue: null,
        mode: "field",
        quest: { ...s.quest, stage: "accepted" },
        message: "Quest accepted: recover the Sunstone from the Sunken Crypt.",
      };
    }
    // healer heals on close
    if (npc?.heals) {
      return { ...s, dialogue: null, mode: "field", hero: { ...s.hero, hp: s.hero.base.maxHp, mp: s.hero.base.maxMp }, message: "Your wounds are healed." };
    }
    return { ...s, dialogue: null, mode: "field" };
  }
  return s; // dialogueChoice unused in this build
}

// ------------------------------------------------------------- shop
function shopCommand(s: GameState, cmd: Command): GameState {
  if (!s.shop) return s;
  const world = cachedWorld(s.seed);
  switch (cmd.type) {
    case "shopBuy": {
      const id = cmd.itemId;
      const item = world.items[id];
      const price = item?.buy ?? 0;
      const n = cmd.count ?? 1;
      if (!s.shop.items.includes(id)) return withMessage(s, "Not for sale.");
      if (s.gold < price * n) return withMessage(s, "Not enough gold.");
      if (!s.inventory.some((it) => it.id === id) && s.inventory.length >= 20) return withMessage(s, "Inventory full.");
      const r = addItems(s.inventory, id, n, world);
      return { ...s, gold: s.gold - price * n, inventory: r.inventory, message: `Bought ${item.name}.` };
    }
    case "shopSell": {
      const id = cmd.itemId;
      const count = countOf(s.inventory, id);
      if (count <= 0) return withMessage(s, "Nothing to sell.");
      const item = world.items[id];
      const n = Math.min(cmd.count ?? 1, count);
      return { ...s, gold: s.gold + item.sell * n, inventory: removeItems(s.inventory, id, n), message: `Sold for ${item.sell * n} gold.` };
    }
    case "shopLeave":
    case "confirm":
      return { ...s, shop: null, mode: "field" };
    default:
      return s;
  }
}

function menuCommand(s: GameState, cmd: Command): GameState {
  if (cmd.type === "toggleMenu") return { ...s, mode: "field" };
  return s;
}

// ------------------------------------------------------------- interact
function interact(s: GameState): GameState {
  const world = cachedWorld(s.seed);
  const map = world.maps[s.field.mapId];
  if (!map) return s;
  const pm = parseMap(map);
  const d = DIR_DELTA[s.field.facing];
  const tx = s.field.pos.x + d.x, ty = s.field.pos.y + d.y;

  const npc = map.npcs?.find((n) => n.x === tx && n.y === ty);
  if (npc) return talkToNpc(s, npc.id, world, map);
  const sign = map.signposts?.find((n) => n.x === tx && n.y === ty);
  if (sign) return { ...s, mode: "dialogue", dialogue: { npcId: "__sign__", lineIndex: 0, lines: [sign.text] } };
  const here = tileAt(pm, s.field.pos.x, s.field.pos.y);
  if (here === "stairs_up" || here === "stairs_down") {
    const floorGate = s.field.mapId === "floor3" && here === "stairs_up" && !s.flags.bossDefeated;
    if (floorGate) return startBossBattle(s);
    return stepStairs(s, s.field.pos.x, s.field.pos.y, map, world);
  }
  return withMessage(s, null);
}

function talkToNpc(s: GameState, npcId: string, world: Content, map: OverworldMapData): GameState {
  const npc = world.npcs[npcId];
  void map;
  if (npc.shop) {
    const shop = world.shops[npc.shop];
    return { ...s, mode: "shop", shop: { name: shop.name, items: shop.items } };
  }
  let lines: string[];
  if (npc.questId) {
    const q = s.quest;
    const qd = npc.questDialogue;
    if (q.stage === "dungeon_cleared" && qd?.dungeon_cleared) lines = qd.dungeon_cleared;
    else if (q.stage === "accepted" && qd?.accepted) lines = qd.accepted;
    else if (q.stage === "complete" && qd?.complete) lines = qd.complete;
    else lines = [...npc.dialogue, q.stage === "none" ? "Will you accept this quest? (Done to accept)" : npc.dialogue[npc.dialogue.length - 1]];
  } else {
    lines = [...npc.dialogue];
  }
  return { ...s, mode: "dialogue", dialogue: { npcId, lineIndex: 0, lines } };
}

// ------------------------------------------------------------- floors
function stepStairs(s: GameState, nx: number, ny: number, map: OverworldMapData, world: Content): GameState {
  const entry = map.stairs.find((st) => st.x === nx && st.y === ny);
  const toMapId = entry ? entry.to : (map.id === "overworld" ? "floor1" : "overworld");
  const fromFloor = s.field.mapId;
  if (fromFloor === "floor3" && !s.flags.bossDefeated) return startBossBattle(s);
  const dest = world.maps[toMapId];
  if (!dest) return s;
  const destPos = { ...dest.spawn };
  const nextFloor = toMapId === "overworld" ? -1 : Number(toMapId.replace("floor", "")) - 1;
  const label = toMapId === "overworld" ? "You emerge into Sunvale." : `You descend into ${dest.name}.`;
  return {
    ...s,
    floor: nextFloor,
    field: { ...s.field, mapId: toMapId, pos: destPos, facing: "down", anim: null, stepsOnGrass: 0 },
    message: label,
  };
}

function startBossBattle(s: GameState): GameState {
  const world = cachedWorld(s.seed);
  const battle = startBattle("boss", s.floor, world, s.rng);
  return { ...s, mode: "battle", battle };
}

function withMessage(s: GameState, m: string | null): GameState {
  return { ...s, message: m };
}

export { newGame };