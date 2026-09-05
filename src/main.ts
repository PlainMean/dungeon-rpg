// Entry point. Creates the SimRunner (new game), the Phaser world scene, and the DOM UI.
// The renderer layer only reflects state and sends commands — all rules live in src/sim/.

import Phaser from "phaser";
import "./style.css";
import { PhaserWorld, setRunner } from "./render/PhaserWorld";
import { SimRunner, randomSeed } from "./render/SimRunner";
import { DOMUI } from "./render/DOMUI";

const root = document.getElementById("game-root")!;

// New Game. Save/load seeds are a follow-up; a fresh deterministic-ish seed per boot works.
const seed = randomSeed();
const runner = new SimRunner(seed);
setRunner(runner);

new DOMUI(runner, root);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: root,
  width: 390,
  height: 660,
  backgroundColor: "#140c1c",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PhaserWorld],
});

export { game };