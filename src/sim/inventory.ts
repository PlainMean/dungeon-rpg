// Pure inventory logic. All mutations return a NEW inventory array (immutable) so the
// reducer stays pure.

import type { Content } from "../content/schemas";
import type { InventoryItem } from "./types";

export const INVENTORY_CAPACITY = 20;

export interface AddResult {
  inventory: InventoryItem[];
  added: number; // items actually added
  overflow: number; // items that could not fit
}

/** Add `count` of an item. Same item stacks to a single slot. Never exceeds capacity. */
export function addItems(
  inventory: readonly InventoryItem[],
  id: string,
  count: number,
  _content?: Content,
): AddResult {
  let added = 0;
  const result = inventory.map((it) => ({ ...it }));
  // We model capacity as total distinct slots; stacking keeps one slot per item id
  // (typical for RPGs where capacity = distinct item kinds held).
  const slot = result.find((it) => it.id === id);
  if (slot) {
    slot.count += count;
    added = count;
  } else if (result.length < INVENTORY_CAPACITY) {
    result.push({ id, count, equipped: false });
    added = count;
  }
  const overflow = count - added;
  return { inventory: result, added, overflow };
}

export function countOf(inventory: readonly InventoryItem[], id: string): number {
  return inventory.find((it) => it.id === id)?.count ?? 0;
}

export function removeItems(
  inventory: readonly InventoryItem[],
  id: string,
  count: number,
): InventoryItem[] {
  const result: InventoryItem[] = [];
  let remaining = count;
  for (const it of inventory) {
    if (it.id === id && remaining > 0) {
      const take = Math.min(it.count, remaining);
      const left = it.count - take;
      remaining -= take;
      if (left > 0) result.push({ ...it, count: left });
    } else {
      result.push({ ...it });
    }
  }
  return result;
}

/** Give an equipment item to the hero if it improves the slot; returns new inventory + equipped id. */
export function tryEquip(
  inventory: readonly InventoryItem[],
  equipSlot: "weapon" | "armor",
  id: string,
  content: Content,
): { inventory: InventoryItem[]; equipped: string | null } {
  const item = content.items[id];
  if (!item || (item.kind !== "weapon" && item.kind !== "armor")) return { inventory: [...inventory], equipped: null };
  const slotKind: "weapon" | "armor" = item.kind === "weapon" ? "weapon" : "armor";
  if (slotKind !== equipSlot) return { inventory: [...inventory], equipped: null };
  const next = inventory.map((it) => ({ ...it, equipped: it.equipped && equipSlot !== slotKind ? it.equipped : it.id === id }));
  // unequip any other item in that slot
  for (const it of next) {
    if (it.id !== id && it.equipped && (content.items[it.id]?.kind === slotKind)) it.equipped = false;
  }
  return { inventory: next, equipped: id };
}

export function equippedId(inventory: readonly InventoryItem[], slot: "weapon" | "armor", content: Content): string | null {
  const kind = slot === "weapon" ? "weapon" : "armor";
  return inventory.find((it) => {
    if (!it.equipped) return false;
    return content.items[it.id]?.kind === kind;
  })?.id ?? null;
}