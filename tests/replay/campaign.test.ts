import { describe, expect, it } from "vitest";
import { cyrb53 } from "../../src/sim/prng";
import { cachedWorld } from "../../src/sim/newgame";
import { parseMap, isWalkable } from "../../src/sim/map";
import { newGame, step } from "../../src/sim/reducer";
import type { Command } from "../../src/sim/commands";
import type { Dir, GameState } from "../../src/sim/types";

const SEED = 2026;
const DIRECTIONS = [
  { dx: 0, dy: -1, dir: "up" as const },
  { dx: 0, dy: 1, dir: "down" as const },
  { dx: -1, dy: 0, dir: "left" as const },
  { dx: 1, dy: 0, dir: "right" as const },
];

type CampaignRun = {
  state: GameState;
  log: Command[];
  mapsVisited: string[];
};

function pathTo(state: GameState, target: { x: number; y: number }): Command[] {
  const world = cachedWorld(state.seed);
  const map = world.maps[state.field.mapId];
  const parsed = parseMap(map);
  const startKey = `${state.field.pos.x},${state.field.pos.y}`;
  const queue = [state.field.pos];
  const previous = new Map<string, string | null>([[startKey, null]]);
  const direction = new Map<string, Dir>();

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (current.x === target.x && current.y === target.y) {
      const result: Command[] = [];
      let key = `${current.x},${current.y}`;
      while (previous.get(key) !== null) {
        result.push({ type: "move", dir: direction.get(key)! });
        key = previous.get(key)!;
      }
      return result.reverse();
    }
    for (const next of DIRECTIONS) {
      const position = { x: current.x + next.dx, y: current.y + next.dy };
      const nextKey = `${position.x},${position.y}`;
      if (!previous.has(nextKey) && isWalkable(parsed, world, position.x, position.y)) {
        previous.set(nextKey, `${current.x},${current.y}`);
        direction.set(nextKey, next.dir);
        queue.push(position);
      }
    }
  }
  throw new Error(`No path on ${state.field.mapId} to ${target.x},${target.y}`);
}

function runCampaign(seed: number): CampaignRun {
  let state = newGame(seed);
  const log: Command[] = [];
  const mapsVisited = [state.field.mapId];

  const send = (command: Command) => {
    log.push(command);
    state = step(state, [command]);
    if (mapsVisited[mapsVisited.length - 1] !== state.field.mapId) mapsVisited.push(state.field.mapId);
    if (state.mode === "gameover") throw new Error(`Campaign lost on ${state.field.mapId}`);

    if (state.mode === "battle") {
      let turns = 0;
      while (state.mode === "battle" && turns++ < 500) {
        const healingItem = state.hero.hp < state.hero.base.maxHp * 0.45
          ? state.inventory.find((item) => (item.id === "potion" || item.id === "herb") && item.count > 0)
          : undefined;
        send(healingItem
          ? { type: "battleUseItem", itemId: healingItem.id }
          : { type: "battleAction", action: "attack" });
      }
      if (state.mode === "battle") throw new Error("Battle did not resolve");
    }
  };

  const navigateTo = (target: { x: number; y: number }) => {
    for (const command of pathTo(state, target)) send(command);
  };
  const closeDialogue = () => {
    while (state.mode === "dialogue") send({ type: "dialogueNext" });
  };

  navigateTo({ x: 4, y: 2 });
  send({ type: "move", dir: "up" }); // bump against the gatekeeper's wall tile to face him
  send({ type: "interact" });
  closeDialogue();
  expect(state.quest.stage).toBe("accepted");

  navigateTo({ x: 31, y: 20 });
  expect(state.field.mapId).toBe("floor1");
  for (let floor = 1; floor <= 3; floor++) navigateTo({ x: 18, y: 12 });
  expect(state.flags.bossDefeated).toBe(true);
  expect(state.quest.hasSunstone).toBe(true);
  expect(state.quest.stage).toBe("dungeon_cleared");

  send({ type: "move", dir: "right" });
  expect(state.field.mapId).toBe("overworld");
  navigateTo({ x: 4, y: 2 });
  send({ type: "move", dir: "up" });
  send({ type: "interact" });
  closeDialogue();

  return { state, log, mapsVisited };
}

describe("full campaign solvability and replay", () => {
  it("completes the recorded route through every floor and the Sunstone turn-in", () => {
    const run = runCampaign(SEED);
    expect(run.mapsVisited).toEqual(["overworld", "floor1", "floor2", "floor3", "overworld"]);
    expect(run.state.mode).toBe("victory");
    expect(run.state.quest).toMatchObject({ stage: "complete", dungeonCleared: true, hasSunstone: true });
    expect(run.state.inventory.find((item) => item.id === "sunstone")?.count).toBe(1);
  }, 120_000);

  it("replays the same seed and command decisions byte-identically", () => {
    const first = runCampaign(SEED);
    const second = runCampaign(SEED);
    const hash = (run: CampaignRun) => cyrb53(JSON.stringify({ log: run.log, state: run.state }));
    expect(first.log).toEqual(second.log);
    expect(hash(first)).toBe(hash(second));
  }, 120_000);
});
