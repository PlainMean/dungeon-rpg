// Phaser world scene. Reads GameState and draws it; sends commands back through the
// SimRunner. Contains ZERO game rules. Procedural placeholder textures are generated at
// boot from the asset manifest + locked DB16 palette so the game is never blocked on art.

import Phaser from "phaser";
import { SimRunner } from "./SimRunner";
import { manifest as loadManifest } from "./manifest";
import type { Manifest } from "../content/schemas";
import { parseMap } from "../sim/map";
import type { ParsedMap } from "../sim/map";
import type { GameState } from "../sim/types";
import atlasUrl from "../assets/atlas.png?url";

export const TILE = 48; // 16px sprite @ 3x scale
export let runningRunner: SimRunner | null = null;
export function setRunner(r: SimRunner | null) { runningRunner = r; }

export class PhaserWorld extends Phaser.Scene {
  private tilesLayer!: Phaser.GameObjects.Container;
  private mapId = "";
  private parsedCache: Map<string, ParsedMap> = new Map();
  private player!: Phaser.GameObjects.Sprite;
  private npcSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private runner!: SimRunner;

  constructor() {
    super("world");
  }

  preload() {
    this.load.image("__atlas", atlasUrl);
  }

  create() {
    this.sliceAtlasTextures();
    this.tilesLayer = this.add.container(0, 0);
    this.player = this.add.sprite(0, 0, "player.down");
    this.player.setDepth(10);
    this.runner = runningRunner!;
    if (this.runner) this.drawWorld(this.runner.state);
    this.cameras.main.setBackgroundColor("#140c1c");
  }

  /** Rebuild tile sprites when the active map changes. */
  private drawWorld(s: GameState) {
    const map = this.runner.world.maps[s.field.mapId];
    if (!map) return;
    if (this.mapId !== map.id) {
      this.mapId = map.id;
      this.tilesLayer.removeAll(true);
      const pm = parseMap(map);
      this.parsedCache.set(map.id, pm);
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const tileId = pm.grid[y][x];
          const def = this.runner.world.tiles[tileId];
          const key = def?.sprite ?? "tile.wall.0";
          const sp = this.add.sprite(x * TILE + TILE / 2, y * TILE + TILE / 2, key);
          this.tilesLayer.add(sp);
        }
      }
    }
    // player
    const px = s.field.pos.x * TILE + TILE / 2;
    const py = s.field.pos.y * TILE + TILE / 2;
    this.player.setPosition(px, py);
    const face = s.field.facing ?? "down";
    const key = `player.${face}`;
    if (this.runner.world) this.player.setTexture(key);
    this.cameras.main.centerOn(px, py);
    // npcs
    for (const npc of map.npcs ?? []) {
      if (!this.npcSprites.has(npc.id)) {
        const sp = this.add.sprite(npc.x * TILE + TILE / 2, npc.y * TILE + TILE / 2, npc.sprite);
        sp.setDepth(9);
        this.npcSprites.set(npc.id, sp);
      }
    }
  }

  update(_time: number, _delta: number) {
    if (!this.runner) return;
    // advance the sim one 60Hz tick, then redraw from the new state
    this.runner.tick();
    this.drawWorld(this.runner.state);
  }

  /** Slice per-id textures from the committed atlas (run after preload). */
  private sliceAtlasTextures() {
    const manifest: Manifest = loadManifest();
    const src = this.textures.get("__atlas").getSourceImage() as HTMLImageElement;
    for (const [id, entry] of Object.entries(manifest)) {
      if (this.textures.exists(id)) continue;
      const [x, y, w, h] = entry.frame;
      const tex = this.textures.createCanvas(id, w, h);
      if (!tex) continue;
      const ctx = tex.context;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(src, x, y, w, h, 0, 0, w, h);
      tex.refresh();
    }
  }
}