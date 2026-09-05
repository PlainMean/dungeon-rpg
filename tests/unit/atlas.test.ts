// Atlas integrity tests: every manifest frame must exist, sit inside the atlas, not be fully
// transparent or fully one color, and every pixel color must be a DB16 palette member.
// These run in milliseconds and gate the build.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { ManifestSchema } from "../../src/content/schemas";
import { DB16 } from "../../src/content/palette";
import manifestJson from "../../src/assets/manifest.json";
import atlasUrl from "../../src/assets/atlas.png";

describe("atlas + manifest", () => {
  const manifest = ManifestSchema.parse(manifestJson);
  const atlas = PNG.sync.read(readFileSync(join(process.cwd(), "src/assets/atlas.png")));
  const palette = new Set(DB16);
  const px = (x: number, y: number) => {
    const i = (y * atlas.width + x) * 4;
    return `${atlas.data[i].toString(16).padStart(2, "0")}${atlas.data[i + 1].toString(16).padStart(2, "0")}${atlas.data[i + 2].toString(16).padStart(2, "0")}`;
  };

  it("all entries point at the single atlas file", () => {
    for (const e of Object.values(manifest)) {
      expect(e.file).toBe("atlas.png");
    }
  });

  it("every frame is inside atlas bounds", () => {
    for (const [id, e] of Object.entries(manifest)) {
      const [x, y, w, h] = e.frame;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(atlas.width);
      expect(y + h).toBeLessThanOrEqual(atlas.height);
      void id;
    }
  });

  it("no frame is fully transparent or fully one color", () => {
    for (const [id, e] of Object.entries(manifest)) {
      const [x, y, w, h] = e.frame;
      let opaque = 0;
      const colors = new Set<string>();
      for (let yy = 0; yy < h; yy++) {
        for (let xx = 0; xx < w; xx++) {
          const i = ((y + yy) * atlas.width + (x + xx)) * 4;
          if (atlas.data[i + 3] > 0) {
            opaque++;
            colors.add(px(x + xx, y + yy));
          }
        }
      }
      expect(opaque, `${id}: at least some opaque px`).toBeGreaterThan(0);
      expect(colors.size, `${id}: should use >1 palette color`).toBeGreaterThan(1);
    }
  });

  it("every pixel color in every frame is a DB16 palette member", () => {
    for (const [id, e] of Object.entries(manifest)) {
      const [x, y, w, h] = e.frame;
      for (let yy = 0; yy < h; yy++) {
        for (let xx = 0; xx < w; xx++) {
          const i = ((y + yy) * atlas.width + (x + xx)) * 4;
          if (atlas.data[i + 3] === 0) continue;
          const hex = px(x + xx, y + yy);
          expect(palette.has(hex), `${id}@(${xx},${yy}) color #${hex} not in DB16`).toBe(true);
        }
      }
    }
  });
});

void atlasUrl; // the ?url import keeps the asset tracked by Vite/TS resolution check