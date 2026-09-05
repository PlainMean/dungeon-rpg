// Content loads and validates; a fresh game starts on solid ground in a walkable tile.

import { describe, it, expect } from "vitest";
import { loadContent } from "../../src/sim/content";
import { cachedWorld } from "../../src/sim/newgame";
import { newGame } from "../../src/sim/reducer";
import { parseMap } from "../../src/sim/map";

describe("content", () => {
  it("loads and validates the full content bundle", () => {
    const c = loadContent();
    expect(c.tiles.grass).toBeDefined();
    expect(c.items.potion.healHp).toBe(40);
    expect(c.enemies.boss.hp).toBe(120);
    expect(c.maps.overworld.width).toBe(36);
    expect(c.maps.overworld.height).toBe(24);
  });

  it("merges three generated dungeon floors into the world for a seed", () => {
    const w = cachedWorld(12345);
    expect(w.maps.floor1).toBeDefined();
    expect(w.maps.floor2).toBeDefined();
    expect(w.maps.floor3).toBeDefined();
    expect(w.maps.floor1).not.toBe(w.maps.floor2);
  });
});

describe("newGame", () => {
  it("spawns the hero on a walkable, in-bounds, non-solid tile", () => {
    const s = newGame(99);
    const w = cachedWorld(99);
    const pm = parseMap(w.maps.overworld);
    const { pos } = s.field;
    const tile = w.tiles[pm.grid[pos.y][pos.x]];
    expect(tile).toBeDefined();
    expect(tile.solid).toBe(false);
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });

  it("round-trips through JSON identically", () => {
    const s = newGame(7);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it("starts in field mode with full health and a main quest pending", () => {
    const s = newGame(7);
    expect(s.mode).toBe("field");
    expect(s.hero.hp).toBe(s.hero.base.maxHp);
    expect(s.quest.stage).toBe("none");
  });
});