// Turn-based combat math. Uses the pure stepBattle function directly (deterministic).

import { describe, it, expect } from "vitest";
import { newGame } from "../../src/sim/reducer";
import { stepBattle, startBattle } from "../../src/sim/combat";
import { loadContent } from "../../src/sim/content";
import { seedRng } from "../../src/sim/prng";

function fixture() {
  const content = loadContent();
  const s = newGame(1);
  return { content, hero: s.hero, inventory: s.inventory };
}

describe("stepBattle - attack", () => {
  it("deals damage, keeps enemy HP >= 0, and ends in victory when all enemies die", () => {
    const { content, hero, inventory } = fixture();
    const rng = seedRng(42);
    let battle = startBattle("overworld", -1, content, rng);
    let h = { ...hero };
    let inv = inventory.map((i) => ({ ...i }));
    let victory = false;
    for (let turn = 0; turn < 60 && !victory; turn++) {
      const res = stepBattle(battle, h, inv, content, { type: "attack" }, rng);
      battle = res.battle;
      h = res.hero;
      inv = res.inventory;
      victory = res.victory;
      for (const e of battle.enemies) expect(e.hp).toBeGreaterThanOrEqual(0);
      if (res.defeat) break;
    }
    expect(victory).toBe(true);
  });

  it("HP never exceeds maxHp and never goes below 0 after damage", () => {
    const { content, hero, inventory } = fixture();
    const rng = seedRng(3);
    const battle = startBattle("boss", 2, content, rng);
    const res = stepBattle(battle, hero, inventory, content, { type: "guard" }, rng);
    expect(res.hero.hp).toBeGreaterThanOrEqual(0);
    expect(res.hero.hp).toBeLessThanOrEqual(hero.base.maxHp);
  });
});

describe("stepBattle - guard", () => {
  it("leaves hero HP within bounds and does not attack", () => {
    const { content, hero, inventory } = fixture();
    const rng = seedRng(42);
    const battle = startBattle("boss", 2, content, rng);
    const before = hero.hp;
    const res = stepBattle(battle, hero, inventory, content, { type: "guard" }, rng);
    expect(res.hero.hp).toBeLessThanOrEqual(before);
    expect(res.hero.hp).toBeGreaterThanOrEqual(0);
  });
});

describe("stepBattle - skills & items", () => {
  it("magic skill costs MP and damages enemies", () => {
    const { content, inventory } = fixture();
    const rng = seedRng(9);
    const hero = { ...fixture().hero, mp: 50 };
    const battle = startBattle("overworld", -1, content, rng);
    const hpBefore = battle.enemies[0].hp;
    const res = stepBattle(battle, hero, inventory, content, { type: "skill", skillId: "flamestrike", target: 0 }, rng);
    expect(res.hero.mp).toBeLessThan(50);
    expect(res.battle.enemies[0].hp).toBeLessThan(hpBefore);
  });

  it("heal skill restores HP but not above max and not below starting after enemy turn", () => {
    const { content, inventory } = fixture();
    const rng = seedRng(9);
    const hero = { ...fixture().hero, hp: 5, mp: 50 };
    const battle = startBattle("overworld", -1, content, rng);
    const res = stepBattle(battle, hero, inventory, content, { type: "skill", skillId: "heal", target: 0 }, rng);
    expect(res.hero.hp).toBeGreaterThan(5); // heal landed (even after the enemy's hit)
    expect(res.hero.hp).toBeLessThanOrEqual(hero.base.maxHp);
    expect(res.hero.mp).toBe(50 - content.skills.heal.mpCost);
  });

  it("use potion consumes the item and restores HP", () => {
    const { content, inventory } = fixture();
    const rng = seedRng(9);
    const hero = { ...fixture().hero, hp: 5 };
    const battle = startBattle("overworld", -1, content, rng);
    const potions = inventory.find((i) => i.id === "potion")!.count;
    const res = stepBattle(battle, hero, inventory, content, { type: "useItem", itemId: "potion" }, rng);
    expect(res.inventory.find((i) => i.id === "potion")!.count).toBe(potions - 1);
    expect(res.hero.hp).toBeGreaterThan(5);
    expect(res.hero.hp).toBeLessThanOrEqual(hero.base.maxHp);
  });
});

describe("startBattle", () => {
  it("builds enemies from an encounter table deterministically", () => {
    const content = loadContent();
    const a = startBattle("overworld", -1, content, seedRng(5));
    const b = startBattle("overworld", -1, content, seedRng(5));
    expect(a.enemies.map((e) => e.id)).toEqual(b.enemies.map((e) => e.id));
  });
});