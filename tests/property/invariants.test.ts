// Property / invariant tests (fast-check). Assert things that MUST be true for ALL inputs:
// HP never negative/over max; inventory never over capacity; gold never negative; position
// always in-bounds and off-solid; XP monotonic; no duplicate items. fast-check shrinks any
// failure to a minimal repro.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { newGame, step } from "../../src/sim/reducer";
import { checkInvariants } from "../../src/sim/invariants";
import type { Command } from "../../src/sim/commands";
import type { Dir } from "../../src/sim/types";

const dirArb = fc.constantFrom<Dir>("up", "down", "left", "right");
const moveArb: fc.Arbitrary<Command> = dirArb.map((dir) => ({ type: "move", dir }));
const battleActionArb: fc.Arbitrary<Command> = fc.oneof(
  fc.constant({ type: "battleAction" as const, action: "attack" as const }),
  fc.constant({ type: "battleAction" as const, action: "guard" as const }),
  fc.constant({ type: "battleSkill" as const, skillId: "flamestrike", target: 0 }),
  fc.constant({ type: "battleUseItem" as const, itemId: "potion", target: 0 }),
  fc.constant({ type: "battleUseItem" as const, itemId: "herb", target: 0 }),
);
const otherArb: fc.Arbitrary<Command> = fc.oneof(
  fc.constant({ type: "interact" as const }),
  fc.constant({ type: "confirm" as const }),
  fc.constant({ type: "dialogueNext" as const }),
  fc.constant({ type: "shopBuy" as const, itemId: "potion" }),
  fc.constant({ type: "shopSell" as const, itemId: "herb" }),
  fc.constant({ type: "toggleMenu" as const }),
);

// Weighted toward movement (common path) but includes combat + UI so battles/menus run too.
const commandArb: fc.Arbitrary<Command> = fc.oneof(
  { weight: 60, arbitrary: moveArb },
  { weight: 20, arbitrary: battleActionArb },
  { weight: 20, arbitrary: otherArb },
);

describe("global invariants (property)", () => {
  it("hold under arbitrary command sequences across many seeds", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1e9 }),
        fc.array(commandArb, { minLength: 20, maxLength: 300 }),
        (seed, commands) => {
          let s = newGame(seed);
          for (const cmd of commands) {
            s = step(s, [cmd]);
            const violations = checkInvariants(s);
            if (violations.length) {
              // const fail = new Error(...) — fast-check will shrink on throw
              throw new Error("Invariant broken:\n" + violations.map((v) => `  ${v.when}: ${v.detail}`).join("\n") + `\nafter command: ${JSON.stringify(cmd)}`);
            }
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  it("hero level and max HP/MP never decrease over play", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1e6 }), (seed) => {
        let s = newGame(seed);
        let prevLevel = s.hero.level;
        let prevMaxHp = s.hero.base.maxHp;
        let prevMaxMp = s.hero.base.maxMp;
        for (let i = 0; i < 200; i++) {
          const d = (["up", "down", "left", "right"] as const)[i % 4];
          s = step(s, [{ type: "move", dir: d }]);
          expect(s.hero.level).toBeGreaterThanOrEqual(prevLevel);
          expect(s.hero.base.maxHp).toBeGreaterThanOrEqual(prevMaxHp);
          expect(s.hero.base.maxMp).toBeGreaterThanOrEqual(prevMaxMp);
          prevLevel = s.hero.level;
          prevMaxHp = s.hero.base.maxHp;
        }
      }),
      { numRuns: 20 },
    );
  });
});