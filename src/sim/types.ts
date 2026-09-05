// Core game types. All data here is pure and JSON-serializable. Nothing in this file
// touches the DOM, canvas, Phaser, timers, or I/O — it is the contract for the sim core.

import type { Rng } from "./prng";

export type Dir = "up" | "down" | "left" | "right";

export type Vec2 = { x: number; y: number };

/** What screen the player is on. mode drives which command set is valid. */
export type GameMode =
  | "field" // overworld / dungeon exploration
  | "battle" // turn-based combat
  | "dialogue" // talking to an NPC / reading signpost
  | "shop" // buying/selling
  | "menu" // pause menu (save, options, status)
  | "gameover" // hero defeated
  | "victory"; // quest complete

// ---------------- Hero ----------------

export interface HeroStats {
  baseAtk: number;
  baseDef: number;
  maxHp: number;
  maxMp: number;
}

export interface Hero {
  name: string;
  level: number;
  xp: number;
  hp: number;
  mp: number;
  base: HeroStats;
  weapon: string | null; // item id
  armor: string | null; // item id
  skills: string[]; // skill ids learned
}

// ---------------- Items ----------------

export interface InventoryItem {
  id: string; // content item id
  count: number;
  equipped: boolean; // only meaningful for equipment that is in the equippable slot
}

// ---------------- Field / world ----------------

export interface FieldState {
  mapId: string; // which tilemap is active
  pos: Vec2; // current tile (integers)
  facing: Dir;
  // pseudo-continuous target used by the renderer for interpolation
  anim: { from: Vec2; to: Vec2; progress: number } | null;
  stepsOnGrass: number; // increments per grass tile stepped on; drives encounters
}

// ---------------- Combat ----------------

export type BattlePhase = "player_select" | "animating" | "enemy_turn" | "victory" | "defeat";

export interface EnemyInstance {
  id: string; // content enemy id
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  xp: number;
  gold: number;
  drops: Array<{ id: string; chance: number }>;
  skillIds: string[];
  alive: boolean;
  ho: boolean; // hostile
}

export interface BattleState {
  enemyIds: string[];
  enemies: EnemyInstance[];
  phase: BattlePhase;
  turnActor: "player" | "enemy";
  log: string[]; // last combat log lines
  selectedAction: "attack" | "skill" | "item" | "guard" | null;
  selectedTarget: number; // enemy index
  selectedSkill: string | null;
  usedItem: string | null;
  pendingReward: { xp: number; gold: number; drops: Array<{ id: string; count: number }> } | null;
}

// ---------------- NPC / dialogue / quest ----------------

export interface DialogueState {
  npcId: string;
  lineIndex: number;
  lines: string[];
}

export interface QuestState {
  id: string;
  stage: "none" | "accepted" | "dungeon_cleared" | "complete";
  dungeonCleared: boolean;
  hasSunstone: boolean;
}

// ---------------- Shops ----------------

export interface ShopState {
  name: string;
  items: string[];
}

// ---------------- Root state ----------------

export interface GameState {
  version: number; // schema version
  seed: number; // run seed
  rng: Rng; // seeded prng; the seed + calls make replays exact
  tick: number; // fixed 60Hz tick counter
  mode: GameMode;
  hero: Hero;
  inventory: InventoryItem[];
  gold: number;
  field: FieldState;
  battle: BattleState | null;
  dialogue: DialogueState | null;
  shop: ShopState | null;
  quest: QuestState;
  flags: Record<string, boolean>;
  floor: number; // -1 = overworld, 0/1/2 = dungeon floors
  message: string | null; // transient one-line toast for renderer
  isNewGame: boolean; // true until first durable save
  victoryAt: number | null; // tick when victory screen was reached
}