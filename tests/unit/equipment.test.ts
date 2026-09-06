import { describe, expect, it } from "vitest";
import { effectiveAtk, effectiveDef } from "../../src/sim/combat";
import { loadContent } from "../../src/sim/content";
import { addItems } from "../../src/sim/inventory";
import { newGame, step } from "../../src/sim/reducer";
import type { GameState } from "../../src/sim/types";

const content = loadContent();

describe("equipment commands", () => {
  it("equips owned weapon and armor through the menu and applies bonuses", () => {
    let state: GameState = { ...newGame(17), mode: "menu" };
    state = { ...state, inventory: addItems(state.inventory, "ironsword", 1, content).inventory };
    state = { ...state, inventory: addItems(state.inventory, "leatherarmor", 1, content).inventory };

    state = step(state, [{ type: "equipItem", itemId: "ironsword" }]);
    state = step(state, [{ type: "equipItem", itemId: "leatherarmor" }]);

    expect(state.hero.weapon).toBe("ironsword");
    expect(state.hero.armor).toBe("leatherarmor");
    expect(state.inventory.find((item) => item.id === "ironsword")?.equipped).toBe(true);
    expect(state.inventory.find((item) => item.id === "leatherarmor")?.equipped).toBe(true);
    expect(effectiveAtk(state.hero, content)).toBe(state.hero.base.baseAtk + 6);
    expect(effectiveDef(state.hero, content)).toBe(state.hero.base.baseDef + 4);
  });

  it("replaces equipment in a slot and unequips it deterministically", () => {
    let state: GameState = { ...newGame(23), mode: "menu" };
    state = { ...state, inventory: addItems(state.inventory, "ironsword", 1, content).inventory };
    state = { ...state, inventory: addItems(state.inventory, "steelsword", 1, content).inventory };

    state = step(state, [{ type: "equipItem", itemId: "ironsword" }]);
    state = step(state, [{ type: "equipItem", itemId: "steelsword" }]);
    expect(state.hero.weapon).toBe("steelsword");
    expect(state.inventory.find((item) => item.id === "ironsword")?.equipped).toBe(false);
    expect(state.inventory.find((item) => item.id === "steelsword")?.equipped).toBe(true);

    state = step(state, [{ type: "unequipItem", slot: "weapon" }]);
    expect(state.hero.weapon).toBeNull();
    expect(state.inventory.every((item) => item.id === "ironsword" || !item.equipped)).toBe(true);
  });

  it("rejects missing or mismatched equipment without changing hero slots", () => {
    const initial = { ...newGame(29), mode: "menu" as const };
    const missing = step(initial, [{ type: "equipItem", itemId: "ironsword" }]);
    const mismatched = step(initial, [{ type: "equipItem", itemId: "potion" }]);

    expect(missing.hero).toEqual(initial.hero);
    expect(missing.inventory).toEqual(initial.inventory);
    expect(mismatched.hero).toEqual(initial.hero);
    expect(mismatched.inventory).toEqual(initial.inventory);
  });
});
