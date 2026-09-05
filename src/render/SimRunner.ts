// Ties the pure sim to the browser renderers. Holds the authoritative GameState, drains a
// command queue each tick, and notifies subscribers to redraw. No game rules live here —
// this only advances step() and reflects state. (I/O like localStorage lives in the caller.)

import { step, newGame } from "../sim/reducer";
import { loadWorld } from "../sim/newgame";
import type { Content } from "../content/schemas";
import type { GameState } from "../sim/types";
import type { Command } from "../sim/commands";

export type Listener = (state: GameState) => void;

export class SimRunner {
  state: GameState;
  content: Content;
  private queue: Command[] = [];
  private listeners: Listener[] = [];

  constructor(seed: number) {
    this.content = loadWorld(seed);
    this.state = newGame(seed);
  }

  get world(): Content {
    return this.content;
  }

  /** Queue an input command; applied on the next tick. */
  send(cmd: Command) {
    this.queue.push(cmd);
  }

  /** Advance the sim by one tick (60Hz) applying all queued commands. */
  tick() {
    const cmds = this.queue.splice(0, this.queue.length);
    if (cmds.length > 0) {
      this.state = step(this.state, cmds);
    }
    this.emit();
  }

  /** Renderers tap in here to redraw after each tick. */
  subscribe(fn: Listener) {
    this.listeners.push(fn);
    fn(this.state); // immediate paint
  }

  private emit() {
    for (const fn of this.listeners) fn(this.state);
  }
}

/** New-game seed chosen by the UI layer (sim never picks its own seed). */
export function randomSeed(): number {
  const now = Date.now();
  return ((now ^ (now >>> 9) ^ Math.random() * 0xffffffff) >>> 0) || 123456789;
}