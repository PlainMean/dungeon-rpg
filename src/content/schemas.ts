// Zod schemas for all content JSON + the asset manifest. Any data file that fails its
// schema must never reach the sim. Validated at build time AND in tests.

import { z } from "zod";

// ---------------- Tileset ----------------
export const TileDefSchema = z.object({
  sprite: z.string(), // manifest sprite id
  solid: z.boolean(),
  category: z.enum([
    "grass", "forest", "water", "wall", "dungeon_floor", "dungeon_wall",
    "road", "stairs_up", "stairs_down", "chest", "door", "sand", "bridge",
  ]),
  encounter: z.boolean().optional().default(false),
});
export const TilesetSchema = z.record(z.string(), TileDefSchema);
export type TileDef = z.infer<typeof TileDefSchema>;
export type Tileset = z.infer<typeof TilesetSchema>;

// ---------------- Maps ----------------
export const MapSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tiles: z.string().min(1), // row-major grid of tile ids separated by commas
  spawn: z.object({ x: z.number().int(), y: z.number().int() }),
  music: z.string().optional(),
});
export type MapData = z.infer<typeof MapSchema>;

// Overworld map carries extra structural data (stairs, npcs, chests, encounter pivot).
export const OverworldMapSchema = MapSchema.extend({
  stairs: z.array(z.object({ x: z.number().int(), y: z.number().int(), to: z.string() })).default([]),
  npcs: z.array(z.object({
    id: z.string(), x: z.number().int(), y: z.number().int(),
    sprite: z.string(), facing: z.enum(["up", "down", "left", "right"]).default("down"),
  })).default([]),
  chests: z.array(z.object({ x: z.number().int(), y: z.number().int(), items: z.array(z.object({ id: z.string(), count: z.number().int().positive() })) })).default([]),
  signposts: z.array(z.object({ x: z.number().int(), y: z.number().int(), text: z.string() })).default([]),
  encounterTileCategories: z.array(z.string()).default(["grass"]),
  encounterStepChance: z.number().min(0).max(1).default(0.2),
});
export type OverworldMapData = z.infer<typeof OverworldMapSchema>;
export const MapsSchema = z.record(z.string(), OverworldMapSchema);

// ---------------- Items ----------------
export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["consumable", "weapon", "armor", "key", "collectible"]),
  sell: z.number().int().min(0),
  buy: z.number().int().min(0),
  desc: z.string(),
  // healing/restore for consumables
  healHp: z.number().int().nonnegative().optional(),
  healMp: z.number().int().nonnegative().optional(),
  // equipment bonuses
  atkBonus: z.number().int().nonnegative().optional(),
  defBonus: z.number().int().nonnegative().optional(),
  // usable in battle?
  battleUse: z.boolean().optional().default(false),
  questItem: z.boolean().optional().default(false),
});
export const ItemsSchema = z.record(z.string(), ItemSchema);
export type ItemData = z.infer<typeof ItemSchema>;
export type ItemsData = z.infer<typeof ItemsSchema>;

// ---------------- Enemies ----------------
export const EnemySchema = z.object({
  id: z.string(),
  name: z.string(),
  hp: z.number().int().positive(),
  atk: z.number().int().positive(),
  def: z.number().int().nonnegative(),
  speed: z.number().int().positive(),
  xp: z.number().int().nonnegative(),
  gold: z.number().int().nonnegative(),
  sprite: z.string(),
  drops: z.array(z.object({ id: z.string(), chance: z.number().min(0).max(1) })).default([]),
  skillIds: z.array(z.string()).default([]),
});
export const EnemiesSchema = z.record(z.string(), EnemySchema);
export type EnemyData = z.infer<typeof EnemySchema>;
export type EnemiesData = z.infer<typeof EnemiesSchema>;

// ---------------- Skills ----------------
export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  mpCost: z.number().int().nonnegative(),
  power: z.number().int().nonnegative(), // magic multiplier
  target: z.enum(["enemy", "self"]),
  kind: z.enum(["magic", "heal", "buff"]),
  healHp: z.number().int().nonnegative().optional(),
});
export const SkillsSchema = z.record(z.string(), SkillSchema);
export type SkillData = z.infer<typeof SkillSchema>;
export type SkillsData = z.infer<typeof SkillsSchema>;

// ---------------- Encounters ----------------
export const EncounterTableSchema = z.object({
  weights: z.record(z.string(), z.number().min(0)),
  countMin: z.number().int().min(1),
  countMax: z.number().int().min(1),
});
export const EncountersSchema = z.record(z.string(), EncounterTableSchema);
export type EncounterTableData = z.infer<typeof EncounterTableSchema>;
export type EncountersData = z.infer<typeof EncountersSchema>;

// ---------------- Quests ----------------
export const QuestSchema = z.object({
  id: z.string(),
  name: z.string(),
  stages: z.array(z.object({
    id: z.string(),
    desc: z.string(),
    completeWhen: z.object({
      // simple conditions; all must hold
      flag: z.string().optional(),
      haveItem: z.string().optional(),
    }).optional().default({}),
  })),
});
export const QuestsSchema = z.record(z.string(), QuestSchema);
export const QuestStageSchema = z.object({ id: z.string(), desc: z.string() });

// ---------------- Levels ----------------
export const LevelsSchema = z.array(z.object({
  level: z.number().int().positive(),
  xpToNext: z.number().int().nonnegative(),
  atk: z.number().int().nonnegative(),
  def: z.number().int().nonnegative(),
  maxHp: z.number().int().positive(),
  maxMp: z.number().int().nonnegative(),
  learns: z.array(z.string()).default([]),
}));

// ---------------- NPCs / dialogue ----------------
export const NpcSchema = z.object({
  id: z.string(),
  name: z.string(),
  shop: z.string().optional(), // shop id if this NPC is a shopkeeper
  heals: z.boolean().optional().default(false),
  healCost: z.number().int().nonnegative().optional().default(0),
  dialogue: z.array(z.string()),
  // quest-giver turns dialogue after quest stages:
  questDialogue: z.record(z.string(), z.array(z.string())).optional(),
  questId: z.string().optional(),
});
export const NpcsSchema = z.record(z.string(), NpcSchema);
export type NpcData = z.infer<typeof NpcSchema>;
export type NpcsData = z.infer<typeof NpcsSchema>;

// ---------------- Shops ----------------
export const ShopsSchema = z.record(z.string(), z.object({
  name: z.string(),
  items: z.array(z.string()),
  buyPrices: z.record(z.string(), z.number().int().nonnegative()).optional(),
}));

// ---------------- Content bundle ----------------
export const ContentSchema = z.object({
  tiles: TilesetSchema,
  maps: MapsSchema,
  items: ItemsSchema,
  enemies: EnemiesSchema,
  skills: SkillsSchema,
  encounters: EncountersSchema,
  quests: QuestsSchema,
  levels: LevelsSchema,
  npcs: NpcsSchema,
  shops: ShopsSchema,
});
export type Content = z.infer<typeof ContentSchema>;

// ---------------- Asset manifest ----------------
export const ManifestEntrySchema = z.object({
  file: z.string(),
  frame: z.tuple([z.number(), z.number(), z.number(), z.number()]), // x,y,w,h
  frames: z.number().int().positive().optional().default(1),
  fps: z.number().int().positive().optional().default(6),
  anchor: z.tuple([z.number(), z.number()]).optional(),
  paletteLocked: z.boolean().optional().default(true),
});
export const ManifestSchema = z.record(z.string(), ManifestEntrySchema);
export type Manifest = z.infer<typeof ManifestSchema>;
export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;