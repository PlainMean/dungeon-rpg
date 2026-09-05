// Validates the asset manifest against the content data: every id referenced from content
// (tiles, enemies, npcs) must resolve in the manifest, and the manifest itself must be
// schema-valid. These run in milliseconds and are written BEFORE any sprite is generated.

import { describe, it, expect } from "vitest";
import { ManifestSchema } from "../../src/content/schemas";
import { loadContent } from "../../src/sim/content";
import manifestJson from "../../src/assets/manifest.json";

describe("asset manifest integrity", () => {
  it("validates against the manifest schema", () => {
    const parsed = ManifestSchema.safeParse(manifestJson);
    expect(parsed.success).toBe(true);
  });

  it("contains every tile sprite referenced by content", () => {
    const content = loadContent();
    const ids = Object.values(content.tiles).map((t) => t.sprite);
    const manifest = ManifestSchema.parse(manifestJson);
    for (const id of ids) {
      expect(manifest[id], `manifest missing tile sprite "${id}"`).toBeDefined();
    }
  });

  it("contains every enemy sprite referenced by content", () => {
    const content = loadContent();
    const ids = Object.values(content.enemies).map((e) => e.sprite);
    const manifest = ManifestSchema.parse(manifestJson);
    for (const id of ids) {
      expect(manifest[id], `manifest missing enemy sprite "${id}"`).toBeDefined();
    }
  });

  it("contains every npc sprite referenced by overworld map", () => {
    const content = loadContent();
    const npcSprites = Object.values(content.maps.overworld.npcs).map((n) => n.sprite);
    const manifest = ManifestSchema.parse(manifestJson);
    for (const id of npcSprites) {
      expect(manifest[id], `manifest missing npc sprite "${id}"`).toBeDefined();
    }
  });

  it("entries declare positive frame dimensions", () => {
    const manifest = ManifestSchema.parse(manifestJson);
    for (const [id, e] of Object.entries(manifest)) {
      expect(e.frame[2], `${id} width`).toBeGreaterThan(0);
      expect(e.frame[3], `${id} height`).toBeGreaterThan(0);
    }
  });
});