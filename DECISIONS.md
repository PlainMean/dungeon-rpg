# DECISIONS.md

Living log of technical decisions, version pins, and escalated questions. Conservative defaults are
chosen and recorded here whenever a question is escalated; the human may override at any time.

## Version pins (checked on 2026-09-05, before install)

| Package | Pinned | Why | Alternative rejected |
|---|---|---|---|
| phaser | 4.2.1 | The documented 2D web engine; best-documented; least hallucination-prone per prompt | LittleJS (proposed by prompt, not taken — see §Escalated) |
| vite | 8.2.2 | Current major; clean static output | — |
| vitest | 5.0.0 | Current major, runs sim/ in Node | — |
| @vitest/coverage-v8 | 5.0.0 | Matches vitest | — |
| fast-check | 4.9.0 | Property tests with minimal-repro shrinking | — |
| zod | 4.5.4 | Content JSON + manifest validation | — |
| @playwright/test | 1.63.0 | Browser smoke / touch emulation | — |
| typescript | **5.9.3** | Latest 5.x, established & stable | 7.0.2 is the brand-new native (Go) compiler; too fresh/risky mid-run |
| eslint | **9.39.1** | Flat config, stable line | 10.10.0 just released; avoided for stability |
| @typescript-eslint/* | 8.69.0 | Matches eslint 9 | — |
| @types/node | 26.4.1 | Matches installed Node 26 | — |

Pin rationale: newer-is-better except where the newest major carries real breakage risk to a long
autonomous run. TS/eslint pinned one stable major back.

## Asset palette (locked)

- **DB16 (DawnBringer 16), 16 colors**, locked. Quantize every sprite through it regardless of source.
- **Tile size 16×16 px**, rendered at 3× integer scale.

## Escalated questions (default taken, awaiting human)

1. **LittleJS vs Phaser.** Prompt proposed LittleJS for its deterministic headless mode. Keep Phaser 4
   as required by default. A deterministic headless sim core already satisfies replay testing without
   engine headless mode. (Default taken: Phaser.)

## Protected governance docs

`AGENTS.md` is required by the kickoff prompt. A host-side guard blocked auto-writing it; the human may
need to create/approve it manually. Its content is fully captured in this file's sibling `SPEC.md` and
the rules below. (Task tracking in PROGRESS/BACKLOG.)