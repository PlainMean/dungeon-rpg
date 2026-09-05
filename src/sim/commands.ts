import type { Dir } from "./types";

// Input is a discrete, serializable command applied at a specific tick.
// All player intent funnels through these. The renderer never mutates sim state
// directly; it issues commands and lets the reducer advance the world.

export type Command =
  // --- field movement / interaction ---
  | { type: "move"; dir: Dir }
  | { type: "interact" }
  | { type: "confirm" } // generic A-button (advance dialogue, open door, accept quest)
  | { type: "toggleMenu" }
  // --- battle ---
  | { type: "battleAction"; action: "attack" | "guard" }
  | { type: "battleSkill"; skillId: string; target?: number }
  | { type: "battleUseItem"; itemId: string; target?: number }
  | { type: "battleTarget"; target: number }
  | { type: "battleBack" } // back out of skill/item submenu
  // --- dialogue / menus ---
  | { type: "dialogueNext" }
  | { type: "dialogueChoice"; choice: number }
  // --- shop ---
  | { type: "shopBuy"; itemId: string; count?: number }
  | { type: "shopSell"; itemId: string; count?: number }
  | { type: "shopLeave" }
  // --- meta ---
  | { type: "startNewGame"; seed?: number }
  | { type: "retry" }; // from gameover back to last save

export type { Dir };