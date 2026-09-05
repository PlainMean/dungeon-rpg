// XP curve, level ups, learning skills.

import { describe, it, expect } from "vitest";
import { grantXp, xpToNext, effectiveStats } from "../../src/sim/leveling";
import { newGame } from "../../src/sim/reducer";
import { loadContent } from "../../src/sim/content";

const content = loadContent();

describe("grantXp", () => {
  it("does nothing below the first threshold", () => {
    const hero = newGame(1).hero;
    const res = grantXp(hero, xpToNext(content, 1) - 1, content);
    expect(res.hero.level).toBe(1);
    expect(res.leveledUp).toBe(false);
  });

  it("levels up at the threshold and learns skills", () => {
    const hero = newGame(1).hero;
    const res = grantXp(hero, xpToNext(content, 1), content);
    expect(res.hero.level).toBe(2);
    expect(res.leveledUp).toBe(true);
    expect(res.hero.hp).toBe(content.levels.find((l) => l.level === 2)!.maxHp);
  });

  it("leveling is deterministic (same input -> same output)", () => {
    const a = grantXp(newGame(9).hero, 200, content);
    const b = grantXp(newGame(9).hero, 200, content);
    expect(a.hero).toEqual(b.hero);
  });

  it("level never decreases across repeated XP grants", () => {
    let hero = newGame(3).hero;
    let prevLevel = hero.level;
    for (let i = 0; i < 80; i++) {
      hero = grantXp(hero, 25, content).hero;
      expect(hero.level).toBeGreaterThanOrEqual(prevLevel);
      expect(hero.base.maxHp).toBeGreaterThanOrEqual(prevLevel <= 1 ? 0 : content.levels[prevLevel - 2].maxHp);
      prevLevel = hero.level;
    }
  });
});

describe("effectiveStats", () => {
  it("base attack/defense before equipment", () => {
    const hero = newGame(1).hero;
    const st = effectiveStats(hero, content);
    expect(st.atk).toBe(hero.base.baseAtk);
    expect(st.def).toBe(hero.base.baseDef);
  });
});