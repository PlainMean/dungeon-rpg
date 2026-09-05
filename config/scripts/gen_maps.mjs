// Node .mjs version of the overworld map generator (no tsx needed).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const W = 36, H = 24;
const g = Array.from({ length: H }, () => Array.from({ length: W }, () => "g"));
const set = (x, y, c) => { if (x < 0 || x >= W || y < 0 || y >= H) throw new Error(`OOB ${x},${y}`); g[y][x] = c; };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
const hrect = (x0, y0, x1, y1, c) => {
  for (let x = x0; x <= x1; x++) { set(x, y0, c); set(x, y1, c); }
  for (let y = y0; y <= y1; y++) { set(x0, y, c); set(x1, y, c); }
};
const road = (start, ...rest) => {
  let [x, y] = start;
  set(x, y, "R");
  for (const [tx, ty] of rest) {
    while (x !== tx || y !== ty) {
      if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y);
      set(x, y, "R");
    }
  }
};

hrect(0, 0, W - 1, H - 1, "T");
for (const [a, b, c, d] of [[20, 1, 30, 3], [13, 14, 22, 17], [24, 7, 27, 10], [2, 16, 9, 22]]) rect(a, b, c, d, "T");
rect(16, 9, 26, 14, "T");
rect(19, 11, 24, 12, "~");
set(20, 10, "~"); set(21, 10, "~"); set(22, 11, "~"); set(23, 13, "~");

rect(1, 1, 15, 8, "."); // village
hrect(2, 1, 6, 4, "#"); rect(2, 2, 6, 3, "."); set(4, 4, "R"); // gatekeeper hall
hrect(1, 6, 4, 8, "#"); rect(1, 7, 4, 7, "."); set(3, 8, "R"); // shop
hrect(9, 6, 12, 8, "#"); rect(9, 7, 12, 7, "."); set(10, 8, "R"); // healer
rect(1, 5, 15, 5, "R");
set(11, 5, "R");

road([14, 5], [14, 9], [22, 9]);
road([10, 8], [10, 13], [14, 13]);
road([22, 9], [28, 13]);
road([28, 13], [28, 21], [31, 21]);

rect(29, 18, 33, 22, "T");
rect(30, 19, 32, 21, "g");
set(31, 20, "v");

for (const row of g) if (row.length !== W) throw new Error("bad width: " + row.length);
// Build tiles flat, row-major, one cell per entry — guaranteed W*H spans.
const flat = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) flat.push(g[y][x]);
const tiles = flat.join(",");
const cells = tiles.split(",");
if (cells.length !== W * H) {
  throw new Error(`tile count mismatch: flat=${flat.length} cells=${cells.length} expected=${W * H} empties=${cells.filter((c) => c === "").length}`);
}
const map = {
  id: "overworld", name: "Sunvale & the Overworld", width: W, height: H,
  tiles, spawn: { x: 11, y: 5 },
  stairs: [{ x: 31, y: 20, to: "floor1" }],
  npcs: [
    { id: "gatekeeper", x: 4, y: 1, sprite: "npc.aldric.0", facing: "down" },
    { id: "shopkeeper", x: 2, y: 6, sprite: "npc.mara.0", facing: "down" },
    { id: "healer", x: 10, y: 6, sprite: "npc.brienne.0", facing: "down" },
  ],
  chests: [
    { x: 8, y: 3, items: [{ id: "potion", count: 2 }] },
    { x: 13, y: 2, items: [{ id: "herb", count: 3 }] },
  ],
  signposts: [
    { x: 15, y: 1, text: "Welcome to Sunvale. The Sunken Crypt lies southeast beyond the woods." },
    { x: 31, y: 22, text: "The Sunken Crypt. Three floors of darkness wait below." },
  ],
  encounterTileCategories: ["grass"], encounterStepChance: 0.22,
};
const out = join(process.cwd(), "src", "content", "maps.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ overworld: map }, null, 2) + "\n");
console.log("wrote", out, "tiles=", map.tiles.length);
console.log(g.map((r) => r.join("")).join("\n"));