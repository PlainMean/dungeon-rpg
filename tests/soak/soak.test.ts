// Soak: 10,000+ tick randomized playthroughs across several seeds. Assert no throws and
// all invariants hold the entire way through. Battles are driven to resolution so combat
// and rewards paths are exercised too. Run on every commit.

import { describe, it, expect } from "vitest";
import { newGame, step } from "../../src/sim/reducer";
import { checkInvariants } from "../../src/sim/invariants";

const SEEDS = [1, 7, 42, 2026, 8675309];
const TICKS = 10_000;

function runSeed(seed: number) {
  let s = newGame(seed);
  const dirs = ["up", "down", "left", "right"] as const;
  for (let t = 0; t < TICKS; t++) {
    let cmd;
    if (s.mode === "battle") {
      cmd = { type: "battleAction" as const, action: "attack" as const };
    } else {
      cmd = { type: "move" as const, dir: dirs[(seed + t) % 4] };
    }
    s = step(s, [cmd]);
    const violations = checkInvariants(s);
    expect(violations, `seed ${seed} tick ${t}: ` + violations.map((x) => `${x.when} ${x.detail}`).join(", ")).toEqual([]);
  }
  return s;
}

describe("soak (10k ticks x 5 seeds)", () => {
  for (const seed of SEEDS) {
    it(`runs a ${TICKS}-tick playthrough on seed ${seed} without throwing and keeps invariants`, () => {
      const final = runSeed(seed);
      expect(final.tick).toBeGreaterThan(0);
      expect(final.mode).toMatch(/^(field|gameover|victory|menu|dialogue|shop)$/);
    }, 120_000);
  }
});

// A focused campaign attempt: keep moving toward the dungeon and press interact to open
// dialogue/shop/stairs; assert the game never hard-blocks (no permanent gameover trap that
// can't even run).
describe("campaign smoke soak", () => {
  it("survives a long mixed command stream including menus and dialogue", () => {
    let s = newGame(31);
    const actions = [
      { type: "move", dir: "down" }, { type: "move", dir: "right" },
      { type: "interact" }, { type: "confirm" }, { type: "battleAction", action: "attack" },
      { type: "toggleMenu" }, { type: "move", dir: "up" }, { type: "move", dir: "left" },
      { type: "battleAction", action: "guard" }, { type: "dialogueNext" },
    ] as const;
    for (let i = 0; i < 3000; i++) {
      s = step(s, [actions[i % actions.length] as never]);
      for (const v of checkInvariants(s)) throw new Error(`tick ${i}: ${v.when} ${v.detail}`);
    }
    expect(s.tick).toBe(3000);
  }, 120_000);
});