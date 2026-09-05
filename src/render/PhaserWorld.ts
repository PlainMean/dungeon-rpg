// Phaser world scene. Reads GameState and draws it; sends commands back through the
// SimRunner. Contains ZERO game rules. Procedural placeholder textures are generated at
// boot from the asset manifest + locked DB16 palette so the game is never blocked on art.

import Phaser from "phaser";
import { SimRunner } from "./SimRunner";
import { manifest as loadManifest } from "./manifest";
import type { Manifest } from "../content/schemas";
import { DB16_HEX8 } from "../content/palette";
import { parseMap } from "../sim/map";
import type { ParsedMap } from "../sim/map";
import type { GameState } from "../sim/types";

export const TILE = 48; // 16px sprite @ 3x scale
export let runningRunner: SimRunner | null = null;
export function setRunner(r: SimRunner | null) { runningRunner = r; }

/** Pick a DB16 color for a manifest id deterministically. */
function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const palette = DB16_HEX8.slice(1); // skip near-black, use vivid range
  return palette[h % palette.length];
}
function colorForTile(id: string): string {
  if (id.includes("grass")) return "#6daa2c";
  if (id.includes("forest")) return "#346524";
  if (id.includes("water")) return "#597dce";
  if (id.includes("road")) return "#854c30";
  if (id.includes("sand")) return "#d2aa99";
  if (id.includes("floor")) return "#757161";
  if (id.includes("wall")) return "#442434";
  if (id.includes("stairs")) return "#dad45e";
  return "#442434";
}

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

  create() {
    this.initTextures();
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

  /** Generate one procedural texture per manifest entry. */
  private initTextures() {
    const manifest: Manifest = loadManifest();
    const size = (id: string) => colorForTile(id);
    for (const [id, entry] of Object.entries(manifest)) {
      const w = entry.frame[2];
      const h = entry.frame[3];
      const key = id;
      if (this.textures.exists(key)) continue;
      let base: string;
      if (id.startsWith("tile.")) base = size(id);
      else {
        base = colorFor(id);
      }
      const tex = this.textures.createCanvas(key, w, h);
      if (!tex) continue;
      const ctx = tex.context;
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      // simple two-tone: darker lower edge for depth on tiles
      ctx.fillStyle = shade(base, -0.25);
      ctx.fillRect(0, Math.floor(h * 0.6), w, Math.ceil(h * 0.4));
      // border for walkable look
      ctx.fillStyle = shade(base, -0.4);
      ctx.fillRect(0, 0, w, 1);
      ctx.fillRect(0, h - 1, w, 1);
      // eye for characters
      if (!id.startsWith("tile.")) {
        ctx.fillStyle = "#deeed6";
        ctx.fillRect(Math.floor(w / 2) - 1, Math.floor(h * 0.3), 2, 2);
      }
      tex.refresh();
    }
  }
}

/** Lighten/darken a #rrggbb by a factor (-1..1). */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * (1 + amt)));
  const g = clamp(Math.round(((n >> 8) & 255) * (1 + amt)));
  const b = clamp(Math.round((n & 255) * (1 + amt)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
function clamp(n: number) { return Math.min(255, Math.max(0, n)); }