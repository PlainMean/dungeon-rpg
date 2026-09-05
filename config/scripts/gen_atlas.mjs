// Bakes the procedural DB16 pixel art into a real committed atlas (src/assets/atlas.png)
// and rewrites src/assets/manifest.json with genuine frame coordinates. Deterministic
// (no RNG). Run: `node config/scripts/gen_atlas.mjs`.
//
// Backend #1 of the asset pipeline contract: procedural placeholders first, committed,
// palette-locked to DB16, validated by tests in tests/unit/atlas.test.ts.

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const DB16 = [
  "140c1c", "442434", "30346d", "4e4a4e", "854c30", "346524", "d04648", "757161",
  "597dce", "d27d2c", "8595a1", "6daa2c", "d2aa99", "6dc2ca", "dad45e", "deeed6",
];
const W = (c) => parseInt(c.slice(0, 2), 16);
const R = (c) => parseInt(c.slice(2, 4), 16);
const B = (c) => parseInt(c.slice(4, 6), 16);

function makeCanvas(w, h) {
  const p = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h * 4; i++) p.data[i] = 0; // transparent
  return p;
}
function setPx(p, x, y, hex) {
  if (x < 0 || y < 0 || x >= p.width || y >= p.height) return;
  const i = (y * p.width + x) * 4;
  p.data[i] = W(hex); p.data[i + 1] = R(hex); p.data[i + 2] = B(hex); p.data[i + 3] = 255;
}
function fillRect(p, x0, y0, x1, y1, hex) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setPx(p, x, y, hex);
}

// ---------------------------------------------------------------- tiles (16x16)
function tileGrass() {
  const p = makeCanvas(16, 16); fillRect(p, 0, 0, 15, 15, DB16[11]); // green
  for (let i = 0; i < 14; i++) setPx(p, (i * 7) % 16, (i * 5) % 16, DB16[5]);
  setPx(p, 2, 3, DB16[5]); setPx(p, 9, 6, DB16[5]); setPx(p, 12, 11, DB16[5]);
  setPx(p, 4, 13, DB16[5]); setPx(p, 7, 9, DB16[5]);
  return p;
}
function tileTallGrass() {
  const p = tileGrass();
  for (const x of [3, 6, 9, 12]) { setPx(p, x, 2, DB16[5]); setPx(p, x, 3, DB16[11]); setPx(p, x + 1, 3, DB16[5]); }
  return p;
}
function tileForest() {
  const p = tileGrass();
  fillRect(p, 1, 1, 14, 9, DB16[5]);
  for (let y = 2; y <= 8; y += 2) for (let x = 2 + (y % 3); x <= 13; x += 2) setPx(p, x, y, DB16[0]);
  setPx(p, 7, 10, DB16[4]); setPx(p, 8, 11, DB16[4]); setPx(p, 7, 11, DB16[4]); setPx(p, 8, 10, DB16[4]);
  return p;
}
function tileWater() {
  const p = makeCanvas(16, 16); fillRect(p, 0, 0, 15, 15, DB16[8]);
  fillRect(p, 0, 4, 15, 6, DB16[13]);
  fillRect(p, 0, 10, 15, 12, DB16[13]);
  return p;
}
function tileSand() { const p = makeCanvas(16, 16); fillRect(p, 0, 0, 15, 15, DB16[12]); setPx(p, 3, 4, DB16[9]); setPx(p, 9, 8, DB16[9]); setPx(p, 5, 12, DB16[9]); return p; }
function tileRoad() { const p = makeCanvas(16, 16); fillRect(p, 0, 0, 15, 15, DB16[4]); fillRect(p, 0, 7, 15, 10, DB16[7]); setPx(p, 2, 7, DB16[9]); setPx(p, 10, 7, DB16[9]); setPx(p, 4, 8, DB16[9]); setPx(p, 11, 8, DB16[9]); return p; }
function tileVfloor() { const p = makeCanvas(16, 16); fillRect(p, 0, 0, 15, 15, DB16[10]); for (let i = 0; i < 8; i++) setPx(p, (i * 5 + 2) % 16, (i * 3) % 16, DB16[7]); return p; }
function tileWall() { const p = makeCanvas(16, 16); fillRect(p, 0, 0, 15, 15, DB16[1]); for (let y = 0; y < 16; y += 4) fillRect(p, 0, y, 15, y, DB16[3]); setPx(p, 4, 6, DB16[0]); setPx(p, 10, 10, DB16[0]); setPx(p, 2, 14, DB16[0]); return p; }
function tileDfloor() { const p = makeCanvas(16, 16); fillRect(p, 0, 0, 15, 15, DB16[3]); for (let i = 0; i < 10; i++) setPx(p, (i * 7 + 1) % 16, (i * 5) % 16, DB16[4]); return p; }
function tileDwall() { const p = makeCanvas(16, 16); fillRect(p, 0, 0, 15, 15, DB16[1]); for (let y = 0; y < 16; y += 4) fillRect(p, 0, y, 15, y, DB16[3]); setPx(p, 6, 2, DB16[2]); setPx(p, 11, 6, DB16[2]); setPx(p, 3, 10, DB16[2]); setPx(p, 12, 14, DB16[2]); return p; }
function tileBridge() { const p = makeCanvas(16, 16); fillRect(p, 0, 0, 15, 15, DB16[2]); for (let x = 0; x < 16; x += 2) fillRect(p, x, 4, x, 11, DB16[4]); for (let x = 1; x < 16; x += 2) setPx(p, x, 5, DB16[7]); return p; }
function tileStairs(down) {
  const p = makeCanvas(16, 16); fillRect(p, 0, 0, 15, 15, down ? DB16[10] : DB16[3]);
  for (let k = 0; k < 6; k++) fillRect(p, 3 + k, 13 - k, 14, 13 - k, DB16[14]);
  fillRect(p, 0, 14, 5, 15, DB16[0]);
  return p;
}

// ---------------------------------------------------------------- characters
function baseFigure(robe, head, skin = DB16[12]) {
  const p = makeCanvas(16, 24);
  // legs
  fillRect(p, 5, 19, 6, 23, DB16[3]);
  fillRect(p, 9, 19, 10, 23, DB16[3]);
  // body/robe
  fillRect(p, 4, 8, 11, 18, robe);
  // arms
  fillRect(p, 3, 9, 3, 15, robe);
  fillRect(p, 12, 9, 12, 15, robe);
  setPx(p, 3, 15, skin); setPx(p, 12, 15, skin);
  // head
  fillRect(p, 5, 2, 10, 7, head);
  fillRect(p, 6, 1, 9, 2, head);
  // face
  setPx(p, 6, 5, DB16[0]); setPx(p, 9, 5, DB16[0]);
  setPx(p, 7, 7, skin); setPx(p, 8, 7, skin);
  return p;
}
function playerDown() {
  const p = baseFigure(DB16[8], DB16[12]); // blue robe, pale hair
  setPx(p, 7, 3, DB16[1]); setPx(p, 8, 3, DB16[1]); // hair tuft
  return p;
}
function tileEnemy(key) {
  if (key.includes("slime")) {
    const p = makeCanvas(16, 16); fillRect(p, 3, 6, 12, 13, DB16[11]);
    fillRect(p, 4, 13, 11, 14, DB16[5]);
    setPx(p, 5, 9, DB16[0]); setPx(p, 10, 9, DB16[0]);
    setPx(p, 7, 12, DB16[13]);
    return p;
  }
  if (key.includes("skeleton")) {
    const p = makeCanvas(16, 24); 
    fillRect(p, 5, 19, 6, 23, DB16[10]); fillRect(p, 9, 19, 10, 23, DB16[10]);
    fillRect(p, 5, 8, 10, 18, DB16[10]);
    for (let x = 5; x <= 10; x++) setPx(p, x, 11, DB16[0]); // ribs
    fillRect(p, 4, 1, 11, 7, DB16[10]); setPx(p, 6, 4, DB16[0]); setPx(p, 9, 4, DB16[0]);
    return p;
  }
  if (key.includes("cultist")) {
    const p = baseFigure(DB16[6], DB16[0]); // red robe, dark hood
    setPx(p, 6, 5, DB16[14]); setPx(p, 9, 5, DB16[14]); // glowing eyes
    return p;
  }
  if (key.includes("shade")) {
    const p = makeCanvas(16, 24);
    fillRect(p, 4, 10, 11, 20, DB16[7]);
    for (let y = 12; y <= 19; y += 2) for (let x = 5; x <= 10; x++) setPx(p, x, y, DB16[0]);
    fillRect(p, 6, 3, 9, 9, DB16[2]);
    setPx(p, 7, 6, DB16[13]); setPx(p, 8, 6, DB16[13]);
    return p;
  }
  if (key.includes("boss")) {
    const p = makeCanvas(24, 32);
    fillRect(p, 2, 8, 21, 26, DB16[1]); // bulk
    for (let y = 10; y <= 24; y += 4) fillRect(p, 2, y, 21, y, DB16[3]);
    fillRect(p, 4, 2, 19, 8, DB16[3]); // head
    fillRect(p, 6, 3, 17, 4, DB16[6]); // crown gems
    setPx(p, 7, 6, DB16[14]); setPx(p, 16, 6, DB16[14]);
    setPx(p, 0, 26, DB16[3]); setPx(p, 23, 26, DB16[3]); setPx(p, 1, 27, DB16[3]); setPx(p, 22, 27, DB16[3]);
    return p;
  }
  throw new Error("unknown enemy " + key);
}
function tileNpc(key) {
  if (key.includes("aldric")) return baseFigure(DB16[4], DB16[9]); // brown robe, orange hair
  if (key.includes("mara")) return baseFigure(DB16[1], DB16[4]); // maroon robe, brown hair
  if (key.includes("brienne")) return baseFigure(DB16[13], DB16[12]); // cyan robe, pale hair
  throw new Error("unknown npc " + key);
}
function tileSwap(key) {
  if (key === "tile.tallgrass.0") return tileTallGrass();
  if (key === "tile.forest.0") return tileForest();
  if (key === "tile.water.0") return tileWater();
  if (key === "tile.sand.0") return tileSand();
  if (key === "tile.road.0") return tileRoad();
  if (key === "tile.vfloor.0") return tileVfloor();
  if (key === "tile.wall.0") return tileWall();
  if (key === "tile.dfloor.0") return tileDfloor();
  if (key === "tile.dwall.0") return tileDwall();
  if (key === "tile.bridge.0") return tileBridge();
  if (key === "tile.stairs.up.0") return tileStairs(false);
  if (key === "tile.stairs.down.0") return tileStairs(true);
  if (key === "tile.grass.0" || key === "tile.grass.1") return tileGrass();
  if (key.startsWith("enemy.")) return tileEnemy(key);
  if (key.startsWith("npc.")) return tileNpc(key);
  if (key === "player.up" || key === "player.down" || key === "player.left" || key === "player.right") return playerDown();
  throw new Error("no generator for " + key);
}

// ---------------------------------------------------------------- pack
const ROOT = join(process.cwd(), "src", "assets");
const manifestRaw = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));

const CELL = 32; // uniform cell; biggest frame is 24x32 boss
const ids = Object.keys(manifestRaw);
const cols = 8;
const rows = Math.ceil(ids.length / cols);
const atlas = makeCanvas(cols * CELL, rows * CELL);

const newManifest = {};
ids.forEach((id, i) => {
  const entry = manifestRaw[id];
  const [ , , w, h] = entry.frame;
  const img = tileSwap(id);
  const col = i % cols, row = Math.floor(i / cols);
  const ox = col * CELL, oy = row * CELL;
  // center the (w x h) frame within its cell
  const dx = Math.floor((CELL - w) / 2), dy = Math.floor((CELL - h) / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = (y * w + x) * 4;
    const r = img.data[si], g = img.data[si + 1], b = img.data[si + 2], a = img.data[si + 3];
    if (a === 0) continue;
    const ti = ((oy + dy + y) * atlas.width + (ox + dx + x)) * 4;
    atlas.data[ti] = r; atlas.data[ti + 1] = g; atlas.data[ti + 2] = b; atlas.data[ti + 3] = 255;
  }
  newManifest[id] = {
    file: "atlas.png",
    frame: [ox + dx, oy + dy, w, h],
    frames: entry.frames ?? 1,
    fps: entry.fps ?? 6,
    anchor: entry.anchor,
    paletteLocked: true,
  };
});

mkdirSync(ROOT, { recursive: true });
const atlasBuf = PNG.sync.write(atlas);
writeFileSync(join(ROOT, "atlas.png"), atlasBuf);
writeFileSync(join(ROOT, "manifest.json"), JSON.stringify(newManifest, null, 2) + "\n");
console.log(`wrote atlas.png (${atlas.width}x${atlas.height}) + manifest (${ids.length} frames)`);