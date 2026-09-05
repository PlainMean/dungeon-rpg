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

## Still open
- Commit + push + GitHub Pages deploy + verify deployed subpath.
- Real CC0 art atlas pass (M7), ZzFX audio/juice (M8), balance/full-campaign-solvability test (M9),
  PWA/offline (M10), adversarial QA pass, REVIEW.md.
- Wire autosave on `visibilitychange` + save/load from boot.
- AGENTS.md manual creation.