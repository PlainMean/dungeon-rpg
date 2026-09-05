# CREDITS — Asset Attribution

Only procedurally generated placeholder assets ship in this build. There are **no external art,
audio, or font files committed** yet, so there is nothing to attribute. This file is the living
ledger; the rule is: **every asset file present must have a license entry here** (added the moment
a real asset lands).

## Current state (as of M0+ vertical slice)

- All textures are **procedurally generated at boot** by the renderer from the locked **DB16**
  palette (DawnBringer 16, public-domain-derived color set) and the asset manifest. No source
  image files exist → no attribution burden. Generated at runtime only; nothing committed.
- Sound: **none committed.** The spec calls for **ZzFX** (MIT) sound-as-code. Not yet added.
- Fonts: system monospace fallback. No font file committed.

## Log rules (enforced going forward)

| Source | License | Condition |
|---|---|---|
| Kenney packs | CC0 | No attribution required; record pack name + link here |
| 0x72 DungeonTileset II | CC0 | No attribution required; record here |
| game-icons.net | CC-BY | Attribution required; credit + link |
| LPC (Universal LPC Spritesheet) | CC-BY-SA / OGA-BY 3.0 | Copyleft — avoid unless approved |

**Process:** the moment any real asset file (sprite, atlas, audio, font) is added under `src/assets/`
or loaded by the game, add its license row here in the same commit. A test asserts every file in
`src/assets/` has a matching entry here (written in M7).

---

Nothing external is used yet. This document is intentionally short until real art lands.