# PROGRESS

Log of each loop iteration: what was done, what was learned, what surprised.

---

## Iteration 0 — Phase 0 scaffold (#1)

- Initialized repo `~/repos/dungeon-rpg`, git main, pre-commit hook (hooksPath=config/hooks),
  GitHub Actions CI+deploy workflow, DECISIONS.md with stack versions pinned (checked live).
- SPEC.md (design: overworld Sunvale, 3-floor crypt, turn-based combat, 20-min quest).
- Wrote the deterministic sim core: seeded xorshift32 RNG, `GameState` (single JSON object),
  pure `step(state, commands)` reducer, movement/collision, encounters, turn-based combat,
  inventory, XP/leveling, dialogue/quest state machine, shop logic, dungeon floor generator
  (BFS-solvability-enforced), and save serialization. Everything in `src/sim/` (Node-runnable,
  no DOM/Phaser/timers).
- Content JSON (tiles/items/enemies/skills/encounters/quests/levels/npcs/shops) + Zod schemas +
  asset manifest; DB16 palette locked.
- **Lessons:** (a) single-char map codes collided with the CSV separator (`,` grass vs `,` join) —
  switched grass to `g` and decode in `parseMap`; (b) test relative paths needed `../../src`, not
  `../src`; (c) tile/level schemas need optional-with-default (`completeWhen`); (d) ESLint `.mjs`
  can't start with `#` comments.
- **Blocked:** writing `AGENTS.md` hit a host-side protected-file guard (approval timeout). Not
  retried; content preserved in DECISIONS.md + BACKLOG. The human may need to create it.

## Iteration 1 — Testing pyramid (#2)

- Unit: content, movement, combat math, inventory capacity, leveling, save round-trip. (25+)
- Property (fast-check): all-command-sequences invariants — HP bounds, inventory capacity/no-dupes,
  gold >= 0, position in-bounds & off-solid, level monotonic. (2)
- Replay: recorded command logs reproducibly hash; deterministic across runs. (3)
- Soak: 10k-tick fuzzed playthroughs x5 seeds + campaign smoke; all invariants hold throughout. (6)
- All green. This is the layer that makes autonomous self-testing trustworthy.

## Iteration 2 — Render layer + browser smoke (#3)

- Phaser 4 world scene: procedural DB16 placeholder textures from the manifest, tile rendering,
  camera follow, player/NPC sprites. SimRunner bridges sim `step()` <-> the 60Hz loop.
- DOM UI overlay: HUD (HP/MP/Lv/gold), touch D-pad (hold-to-walk) + interact button, and modal
  screens for battle/dialogue/shop/menu/victory/gameover. DOM re-render gated on a state signature
  (avoids 60fps innerHTML rebuilds).
- Playwright e2e boots on a 390x844 touch viewport with **zero console errors** — 2 tests green.
- **Lesson:** rendering HTML in a hot loop is the top perf risk; gate on a signature.

## Current status

- **Green conveyor:** tsc ✓ · lint ✓ · unit/property/replay 38 ✓ · soak 6 ✓ · build 394KB gzip ✓ ·
  e2e 2 ✓. All on the latest commit to be made.
- This is effectively **M0 done end-to-end plus a working vertical slice** (M1 tilemap/collision/
  camera/procedural art ✓; M2 content schemas + save round-trip ✓ (autosave wiring pending);
  M3 combat ✓; M4 items+shop partial; M5 dialogue+quest ✓; M6 dungeon gen w/ per-floor BFS ✓).

## Iteration 3 — Deploy + live verification (#4)

- Wired autosave: save to localStorage on `visibilitychange` (hidden) and after each resolved
  battle; fixed the pre-commit hook to tolerate an unborn HEAD (first commit).
- Wrote README.md; committed and pushed to GitHub → repo **PlainMean/dungeon-rpg** (public).
- Enabled GitHub Pages (Actions source); CI+Deploy workflow ran clean: the **test** job (full
  pyramid) passed and **gated** the deploy — `actions/deploy-pages` succeeded in 31s.
- Verified the deployed build against the real base path: index HTTP 200 with correct title,
  JS bundle resolves at `/dungeon-rpg/assets/…`, and a Playwright run against the live URL
  boots the game at 390×844 touch with **zero console errors**.
- **This closes M0 end-to-end** and the DoD item "deployed build verified against the real
  base path, not just dev server."

## Current status

- **Live at** https://plainmean.github.io/dungeon-rpg/ — playable in a mobile browser.
- **Green conveyor on every commit** (CI): tsc · lint · 38 unit/property/replay · 6 soak ·
  build (394KB gzip) · e2e (390×844, zero console errors) · deploy.
- Autosave on background/battle-end checked.

## Iteration 4 — M7 asset pipeline (atlas + palette lock) (#5)

- Wrote `config/scripts/gen_atlas.mjs` (pngjs): bakes pure-DB16 pixel art for every manifest id
  (12 tile types + player + 5 enemies + 3 NPCs) into a single committed **atlas.png** (256×128,
  3.5KB) and rewrites the manifest with real frame coordinates.
- Rewired the Phaser renderer to **load the committed atlas** and slice per-id textures in
  `create()` (via `preload()`), replacing runtime procedural generation — gameplay code still
  only names sprite ids (`sprite("enemy.slime.0")`), so the atlas is a swappable backend.
- Added `tests/unit/atlas.test.ts`: every frame in-bounds, none fully transparent/flat, every
  pixel color a DB16 member, all entries point at the single atlas.
- **42 tests pass**, tsc + lint clean, build bundles `atlas.png`. e2e green (zero console errors).
- Screenshot-verified: coherent DB16 tile map (grass, stone floor, planks), hero, NPC, HUD.
- **M7's "procedural first, committed, palette-locked, validated" half is done** — the asset
  loop (build → generate → validate → play) now runs on real committed textures before any
  external CC0 pack is considered.

## Still open
- CC0 pack import (0x72/Kenney) behind the same pipeline, or keep the original procedural set.
- ZzFX audio/juice (M8), full-campaign solvability test (M9), PWA/offline (M10), adversarial QA, REVIEW.md.
- Equipment equip/unequip UI wiring.
- Room to add idle/walk animation frames (`frames`/`fps` fields already in the manifest).