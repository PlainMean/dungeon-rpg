// Movement, collision, stairs transitions, and random encounters in the pure sim.

import { describe, it, expect } from "vitest";
import { newGame, step } from "../../src/sim/reducer";
import { cachedWorld } from "../../src/sim/newgame";
import { parseMap } from "../../src/sim/map";
import type { Dir, GameState } from "../../src/sim/types";

function start(seed = 123) {
  return newGame(seed);
}
function placeAt(s: GameState, x: number, y: number, facing: Dir = "down"): GameState {
  return { ...s, field: { ...s.field, pos: { x, y }, facing } };
}

describe("movement", () => {
  it("moves the player one tile in the requested direction", () => {
    let s = start();
    const before = { ...s.field.pos };
    // spawn (11,5) sits on the village's main street; 'up' into the village is walkable
    s = step(s, [{ type: "move", dir: "up" }]);
    expect(s.field.pos.y).toBe(before.y - 1);
    expect(s.field.pos.x).toBe(before.x);
    expect(s.field.facing).toBe("up");
  });

  it("cannot move into a solid tile (stays put, faces the wall)", () => {
    const w = cachedWorld(123);
    const pm = parseMap(w.maps.overworld);
    // find a solid tile with at least one walkable north neighbour
    let set = false;
    outer: for (let y = 2; y < pm.data.height - 1; y++) {
      for (let x = 1; x < pm.data.width - 1; x++) {
        const solid = w.tiles[pm.grid[y][x]]?.solid;
        const aboveSolid = w.tiles[pm.grid[y - 1][x]]?.solid;
        if (solid && !aboveSolid) {
          let s = placeAt(start(), x, y - 1, "down");
          const p0 = { ...s.field.pos };
          s = step(s, [{ type: "move", dir: "down" }]);
          expect(s.field.pos).toEqual(p0); // blocked below (into the solid tile)
          expect(s.field.facing).toBe("down");
          set = true;
          break outer;
        }
      }
    }
    expect(set).toBe(true);
  });

  it("keeps the player inside map bounds and off solid tiles across thousands of moves", () => {
    const w = cachedWorld(123);
    const pm = parseMap(w.maps.overworld);
    let s = start();
    const dirs: Dir[] = ["up", "down", "left", "right"];
    for (let i = 0; i < 3000; i++) {
      const d = dirs[i % 4];
      s = step(s, [{ type: "move", dir: d }]);
      const tile = w.tiles[pm.grid[s.field.pos.y][s.field.pos.x]];
      expect(tile.solid).toBe(false);
      expect(s.field.pos.x).toBeGreaterThanOrEqual(0);
      expect(s.field.pos.y).toBeLessThan(pm.data.height);
    }
  });

  it("movement is deterministic: same commands + same seed -> identical state", () => {
    const cmds = Array.from({ length: 50 }, (_, i) => ({ type: "move" as const, dir: (["down", "right", "up", "left"] as const)[i % 4] }));
    const a = step(start(11), cmds);
    const b = step(start(11), cmds);
    expect(a).toEqual(b);
    const a2 = step(start(55), cmds);
    expect(a2).not.toEqual(a); // different seed -> different outcome
  });
});