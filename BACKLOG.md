# BACKLOG — Milestone-ordered task list

Format: `[ ]` pending · `[x]` done · `[BLOCKER]` impediment.

## Milestones

### M0 — Walking skeleton (deploy first)
- [x] Scaffold repo: stack installed, versions pinned in DECISIONS.md
- [x] SPEC.md, BACKLOG.md, PROGRESS.md, DECISIONS.md written (AGENTS.md host-blocked → task)
- [x] GitHub Actions: npm ci → full tests → build → deploy Pages; tests gate deploy
- [x] Pre-commit hook: block tests/protected diffs + test-count drops (hook installed)
- [x] Empty tile map renders; player moves by touch; build + e2e green
- [ ] Push to GitHub and verify the **deployed** Pages subpath (pending)

### M1 — Tilemap, collision, camera, procedural art
- [x] Procedural placeholder tile + actor textures generated at boot from manifest/DB16
- [x] Tilemap + solid-tile collision in sim; Phaser camera follows player

### M2 — Save/load + content schemas
- [x] Zod schemas for all content JSON + manifest
- [x] serialize/deserialize round-trip to identical GameState (pure) + corrupted-save clamping
- [ ] Autosave on `visibilitychange` and after battle (wire renderer localStorage)
- [x] Replay log format + deterministic replay tests

### M3 — Turn-based combat
- [x] Damage math, crits, guard, skills (magic/heal), items in battle (seeded)
- [x] Enemy bestiary data; encounter table by zone; battle scene UI modal
- [x] Victory → XP/gold/drops; level ups; defeat → gameover

### M4 — Inventory, items, equipment, shops
- [x] Inventory capacity/stacks; consumables usable in battle; shop buy/sell UI
- [ ] Equipment equip/unequip in menu (data + schema exist; not wired to hero.weapon/armor UI)

### M5 — Dialogue, NPCs, quest machine
- [x] Dialogue state machine (signposts, NPCs); healer; quest accept/complete → victory
- [x] Single main quest (3 stages) — no deadlocks in norm path

### M6 — Dungeon generation + solvability
- [x] 3-floor seeded dungeon generator; stairs transitions; floor-specific encounters
- [x] Per-floor BFS guarantees start→exit reachable
- [ ] Full hostile-recorded solvability test: overworld→floor1→floor2→floor3→boss→artifact→return

### M7 — CC0 art pass, palette lock, atlas packing
- [ ] Import Kenney/0x72 CC0 packs; normalize to DB16+16px; pack atlas; validate
- [x] CREDITS.md ledger present (procedural only so far)
- [ ] Palette/atlas pixel validation tests (id resolution + schema already covered)

### M8 — Audio, juice, screen shake, transitions
- [ ] ZzFX sound effects + unlock on first tap
- [ ] Screen shake, damage flash, scene transitions

### M9 — Balance, difficulty, full-playthrough soak
- [ ] Tune XP curve/enemy stats/economy for ~20-min playthrough
- [ ] Full campaign soak (boot→victory) across seeds — prove beatable

### M10 — PWA, offline, polish, final QA
- [ ] web manifest + icons + service worker (offline)
- [ ] Perf under 4x throttle; bundle <5MB (already 394KB gzip ✓)
- [ ] Final polish + REVIEW.md

## Cross-cutting / governance
- [ ] Write AGENTS.md (host-side guard blocked auto-write; human may need to create)
- [ ] Adversarial QA pass (read-only subagent) → fix reported bugs → BACKLOG entries
- [ ] Final REVIEW.md summary for the human

## Escalated / blockers
- (none)