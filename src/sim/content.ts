// Loads + validates all content JSON into a Content bundle. Called once at boot and in tests.
// Every file is schema-validated; a failing file throws loudly (fail fast).

import type { Content } from "../content/schemas";
import { ContentSchema } from "../content/schemas";

// Static imports let Vite bundle them and Vitest load them in Node.
import tilesJson from "../content/tiles.json";
import mapsJson from "../content/maps.json";
import itemsJson from "../content/items.json";
import enemiesJson from "../content/enemies.json";
import skillsJson from "../content/skills.json";
import encountersJson from "../content/encounters.json";
import questsJson from "../content/quests.json";
import levelsJson from "../content/levels.json";
import npcsJson from "../content/npcs.json";
import shopsJson from "../content/shops.json";

let cached: Content | null = null;

/** Validate the full content bundle once and cache it. */
export function loadContent(): Content {
  if (cached) return cached;
  const parsed = ContentSchema.safeParse({
    tiles: tilesJson,
    maps: mapsJson,
    items: itemsJson,
    enemies: enemiesJson,
    skills: skillsJson,
    encounters: encountersJson,
    quests: questsJson,
    levels: levelsJson,
    npcs: npcsJson,
    shops: shopsJson,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Content validation failed:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function getContent(): Content {
  return loadContent();
}