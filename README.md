# Dungeon RPG 🗡️

A top-down, tile-based fantasy RPG that runs entirely in the mobile browser as a **purely
static site** (GitHub Pages). Explore the village of **Sunvale**, descend the 3-floor **Sunken
Crypt**, fight turn-based battles, collect gear, and finish the main quest — **The Stolen
Sunstone** — in about 20 minutes.

## Play

Play the deployed build:

```
https://plainmean.github.io/dungeon-rpg/
```

Built with **Phaser 4 + TypeScript + Vite**. Locked DB16 palette, 16px tiles @3x.

## Architecture

The game is split into a **pure simulation core** and a **dumb render layer**. This is what
makes autonomous, headless self-testing trustworthy.

```
src/
  sim/        Pure TypeScript. No DOM/canvas/Phaser/timers. ALL game rules live here.
              Runs in Node. Fixed 60Hz ticks, one seeded PRNG threaded through state,
              pure reducer step(state, commands) -> state, single JSON GameState.
  render/     Phaser world scene + DOM UI overlay. Reads state, draws it, sends commands.
              ZERO game rules. Delete render/ and the tests still pass.
  content/    JSON game data (items, enemies, maps, dialogue, quests, levels) + Zod schemas.
  assets/     Asset manifest (sprite ids). Procedural DB16 textures generated at boot.
tests/
  unit/       Vitest — combat, inventory, leveling, movement, save round-trip, manifest.
  property/   fast-check — invariants for ALL inputs (HP bounds, capacity, bounds, ...).
  replay/     Recorded command logs reproduce byte-identical state hashes.
  soak/       10k-tick fuzzed playthroughs x5 seeds; all invariants hold, no throws.
  e2e/        Playwright — boots on a 390x844 touch viewport with zero console errors.
```

**Determinism:** `Math.random()` and `Date.now()` are banned inside `src/sim/` (enforced by
ESLint). Same seed + same commands → byte-identical output forever.

## Commands

```bash
npm install        # install deps
npm run dev        # dev server (mobile-first)
npm run test       # unit + property + replay
npm run test:soak  # 10k-tick fuzzed playthroughs
npm run build      # tsc --noEmit + vite build (static dist/)
npx playwright install --with-deps chromium
npm run test:e2e   # browser smoke, zero console errors
```

Tests gate the GitHub Actions deploy to GitHub Pages.

## Adding content

All game data is **JSON** under `src/content/` — verify each file against its Zod schema in
`src/content/schemas.ts`:

| File | What it drives |
|---|---|
| `tiles.json` | tile ids, walkability, encounter tiles |
| `maps.json` | overworld layout (regenerate with `node config/scripts/gen_maps.mjs`) |
| `items.json` | consumables, equipment, key items |
| `enemies.json` / `skills.json` | bestiary + combat skills |
| `encounters.json` | encounter tables per zone |
| `quests.json` / `npcs.json` / `shops.json` | quest flow, dialogue, vendors |
| `levels.json` | XP curve + per-level stats/skills |

Edit the JSON to add content; the sim and tests pick it up automatically.

## Design docs

- `SPEC.md` — full game design (world, combat, progression, quests, out-of-scope).
- `AGENTS.md` / `DECISIONS.md` — operating rules + version/design decisions.
- `CREDITS.md` — asset attribution ledger (procedural only so far; CC0 packs planned).
- `PROGRESS.md` / `BACKLOG.md` — build log + milestone task list.