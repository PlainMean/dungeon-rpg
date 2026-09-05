// Pure XP / leveling logic. Data-driven from content.levels.json (max level = last entry).
import type { Content } from "../content/schemas";
import type { Hero, HeroStats } from "./types";

export function levelRow(content: Content, level: number) {
  const row = content.levels.find((l) => l.level === level);
  if (!row) return content.levels[content.levels.length - 1];
  return row;
}

/** Convert a level-row to the HeroStats shape the sim uses. */
export function rowToStats(row: { atk: number; def: number; maxHp: number; maxMp: number }): HeroStats {
  return { baseAtk: row.atk, baseDef: row.def, maxHp: row.maxHp, maxMp: row.maxMp };
}

export function xpToNext(content: Content, level: number): number {
  const row = levelRow(content, level);
  return row.xpToNext;
}

export interface LevelUpResult {
  hero: Hero;
  leveledUp: boolean;
  newSkills: string[];
}

/**
 * Grant XP, applying any level-ups. Rolls go through the *caller-provided* rng only for
 * fully-linear games; here leveling is deterministic (no rolls), so we stay pure.
 */
export function grantXp(hero: Hero, xp: number, content: Content): LevelUpResult {
  let h: Hero = { ...hero, xp: hero.xp + xp };
  let leveledUp = false;
  const newSkills: string[] = [];
  const maxLevel = Math.max(...content.levels.map((l) => l.level));

  while (h.level < maxLevel) {
    const need = xpToNext(content, h.level);
    if (h.xp < need) break;
    // level up
    const nextRow = levelRow(content, h.level + 1);
    h = {
      ...h,
      level: h.level + 1,
      base: rowToStats(nextRow), // full heal on level up
      hp: nextRow.maxHp,
      mp: nextRow.maxMp,
      xp: h.xp - need,
    };
    leveledUp = true;
    for (const s of nextRow.learns) {
      if (s && !h.skills.includes(s) && !newSkills.includes(s)) newSkills.push(s);
    }
    break; // one level-up per grant keeps progression visible
  }
  if (leveledUp) h.skills = [...h.skills, ...newSkills];
  return { hero: h, leveledUp, newSkills };
}

/** Derived combat stats, including equipment bonuses. Pure. */
export function effectiveStats(hero: Hero, content: Content) {
  const weapon = hero.weapon ? content.items[hero.weapon] : undefined;
  const armor = hero.armor ? content.items[hero.armor] : undefined;
  const atk = hero.base.baseAtk + (weapon?.atkBonus ?? 0);
  const def = hero.base.baseDef + (armor?.defBonus ?? 0);
  return { atk, def, maxHp: hero.base.maxHp, maxMp: hero.base.maxMp, speed: hero.level + 3 };
}