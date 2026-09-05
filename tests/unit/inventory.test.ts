// Inventory capacity + stacking + gold conservation contributions.

import { describe, it, expect } from "vitest";
import { addItems, removeItems, countOf, INVENTORY_CAPACITY } from "../../src/sim/inventory";
import { loadContent } from "../../src/sim/content";

const content = loadContent();

describe("addItems", () => {
  it("stacks the same item id into one slot", () => {
    let inv = addItems([], "potion", 3, content).inventory;
    inv = addItems(inv, "potion", 2, content).inventory;
    expect(inv.length).toBe(1);
    expect(inv[0].count).toBe(5);
  });

  it("never exceeds inventory capacity", () => {
    let inv: { id: string; count: number; equipped: boolean }[] = [];
    // fill with distinct items up to capacity
    let k = 0;
    while (inv.length < INVENTORY_CAPACITY) {
      inv = addItems(inv, "item_" + k, 1, content).inventory;
      k++;
    }
    const before = inv.length;
    const res = addItems(inv, "anotheritem", 1, content);
    expect(res.inventory.length).toBe(before);
    expect(res.added).toBe(0);
    expect(res.overflow).toBe(1);
  });
});

describe("removeItems", () => {
  it("decrements stacks and drops zero-count slots", () => {
    let inv = addItems([], "potion", 2, content).inventory;
    inv = removeItems(inv, "potion", 1);
    expect(countOf(inv, "potion")).toBe(1);
    inv = removeItems(inv, "potion", 5);
    expect(countOf(inv, "potion")).toBe(0);
  });

  it("does not go negative", () => {
    let inv = addItems([], "herb", 1, content).inventory;
    inv = removeItems(inv, "herb", 99);
    expect(countOf(inv, "herb")).toBe(0);
  });
});