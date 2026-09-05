# SPEC — Dungeon RPG

A top-down, tile-based fantasy RPG that plays entirely in a mobile browser and deploys as a
purely static site to GitHub Pages. Turn-based combat, gear collection, a small overworld, a
3-floor dungeon, and a main quest designed to complete in ~20 minutes of play.

**Naming (internal):** the deployed site lives at `<base>/dungeon-rpg/`.

---

## 1. Vision

- **Core loop:** Explore the overworld → find the dungeon entrance → descend the 3-floor dungeon
  in turn-based fights → defeat the boss → collect the artifact → return to complete the quest.
- **Length target:** ~20 minutes for a focused first completion. Not a roguelike; one coherent,
  winnable campaign.
- **Feel:** cozy, legible, mobile-first. Touch is the only input. No hover. No keyboard needed.

## 2. World layout

A single tiled overworld map (roughly 40×28 tiles at 16px), wrapped in a solid border. Elements:

- **Village (north-west):** starting zone. Contains the Gatekeeper NPC who issues the main quest,
  a shop, a healer NPC, and a save-point signpost.
- **Overland (south/east):** free-roam area with collision (trees, rocks, water edges) and
  grass/forest tiles where **random encounters** trigger.
- **Dungeon entrance (south-east):** a staircase tile the player steps on to enter Floor 1.

## 3. The dungeon

3 floors, each a small generated tile layout (guaranteed solvable — see §10):

- **Floor 1 — The Crypt (easy):** 2–3 fights, a treasure chest with a starter weapon upgrade.
- **Floor 2 — The Catacombs (medium):** stronger enemies, healing potion chest, miniboss at end.
- **Floor 3 — The Throne (hard):** guarded corridors, boss fight, artifact pickup, and a shortcut
  stairs that returns to the overworld.

Each floor has: a start tile, one or more enemy-encounter zones, a goal/floor-exit tile, and
solid walls. A staircase from the boss floor's exit returns the player to the village (quest turn-in).

## 4. Combat — turn-based

Battles run as discrete turns in the sim core (no timers). Scheme:

- **Party:** a single hero (Kellan). Static per-combat; no party management in v1.
- **Enemies:** 1–3 per encounter from a small bestiary (slime, skeleton, cultist, shade, boss).
- **Turn order:** by speed then seeded tiebreak. Player picks from a menu: **Attack**, **Skill**,
  **Item**, **Guard**. Guard halves incoming damage this round and restores a little MP.
- **Damage math:** physical `dmg = baseAtk - (baseDef + guardBonus) + roll(small variance)`,
  floored at a minimum. Magic uses skill power + MP. Crit chance ~10%, ×1.5.
- **Resolve:** HP never below 0; defeat triggers game-over if the hero dies (offer retry from save).

## 5. Progression

- **XP / levels:** enemies grant XP; levels up to a soft cap (e.g. ~10). Level ups give +ATK/+DEF/
  +MaxHP/+MaxMP and refill HP/MP. Every roll goes through the seeded PRNG so leveling is deterministic.
- **Gear:** weapon + armor slots. `ATK` comes from hero base + weapon; `DEF` from base + armor.
  Shop sells incremental upgrades; dungeon chests grant the good ones.
- **Gold:** dropped by enemies and found in chests; spent at the shop.

## 6. Quest structure

A single linear main quest with a 3-stage quest state machine:

1. **`quest_accepted`** — Gatekeeper asks you to recover the Sunstone from the depths and return.
2. **`dungeon_cleared`** — triggered once the boss is defeated and you pick up the Sunstone.
3. **`quest_complete`** — returned to the Gatekeeper with the Sunstone. Victory screen + credits.

State machine is data-driven so it cannot deadlock (see §10 invariant tests).

## 7. Items

Six items in the vertical slice, data-driven in `src/content/items.json`:

- Healing Potion (heal, use in battle + field)
- Ether (restore MP, battle only)
- Iron Sword (weapon upgrade)
- Steel Armor (armor upgrade)
- Sunstone (key quest item, not consumable)
- Herbs (small heal, cheap)

## 8. Save / load

- Autosave to `localStorage` after every completed battle and on `visibilitychange`.
- Save round-trips through the JSON serializable `GameState` (single object) — identical object on
  reload by construction (hydrate → verify → play).
- Encounter seed and PRNG call-count persist so replays stay exact.

## 9. Renderer

Phaser 4 draws the sim state; it contains **zero game rules** (see AGENTS.md). The sim is ticked
forward by input commands; the renderer just reflects state. Touch → command → step → redraw.

## 10. Guarantees (tested)

- Fixed 60Hz timestep; sim advances only in ticks, never wall-clock delta.
- One seeded xorshift32 PRNG threaded through state. `Math.random`/`Date.now` banned in `sim/`.
- Pure reducer `step(state, commands) → state`; byte-identical for same seed+commands forever.
- All invariants (HP bounds, inventory capacity, gold conservation, position in-bounds & off-solid,
  XP monotonic, quest-state reachability) asserted by property tests.
- **Solvability:** a BFS guarantees the critical path (village → floor1 → floor2 → floor3 → boss →
  artifact → return) is completable and no reachable region softlocks.

## 11. Out of scope (v1)

- Multiple playable characters / party switching
- Open-world roaming with a persistent day/night cycle
- Non-linear or branching main quests, side-quests beyond the one main chain
- Multiplayer, leaderboards, accounts, servers, paid APIs
- Voice acting / long-form music (ZzFX sound effects only)
- Localization, accessibility modes beyond legible high-contrast text
- Desktop/keyboard-first layouts (touch is the contract; desktop is a bonus)