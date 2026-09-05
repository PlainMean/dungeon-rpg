// Save -> reload -> load round-trips to an identical GameState, and corrupted saves are
// clamped instead of crashing.

import { describe, it, expect } from "vitest";
import { newGame, step } from "../../src/sim/reducer";
import { serialize, deserialize } from "../../src/sim/save";

describe("save/load round-trip", () => {
  it("round-trips to an identical GameState after play", () => {
    let s = newGame(55);
    const cmds = Array.from({ length: 120 }, (_, i) =>
      ({ type: "move" as const, dir: (["down", "right", "up", "left"] as const)[i % 4] }));
    s = step(s, cmds);
    const json = serialize(s);
    const loaded = deserialize(json);
    expect(loaded).toEqual(s);
  });

  it("rejects a non-save payload", () => {
    expect(() => deserialize('{"hello":1}')).toThrow();
    expect(() => deserialize("not json")).toThrow();
  });

  it("clamps corrupted HP to valid bounds instead of throwing", () => {
    let s = newGame(3);
    const evil = JSON.parse(serialize(s));
    evil.hero.hp = -999;
    evil.hero.mp = 1e9;
    const loaded = deserialize(JSON.stringify(evil));
    expect(loaded.hero.hp).toBe(0);
    expect(loaded.hero.mp).toBe(loaded.hero.base.maxMp);
  });
});