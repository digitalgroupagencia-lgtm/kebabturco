import type { ModifierGroup, SelectionState } from "./types";
import { groupKey } from "./validation";

function applyDefaultsForGroups(groups: ModifierGroup[], unitIndex?: number | null): SelectionState {
  const state: SelectionState = new Map();
  for (const group of groups) {
    if (group.groupKind !== "choice" && group.groupKind !== "substitution") continue;
    const def = group.options.find((o) => o.isDefault);
    if (!def) continue;
    const key = groupKey(group.id, unitIndex);
    state.set(key, new Map([[def.id, 1]]));
  }
  return state;
}

export function buildDefaultSelectionState(groups: ModifierGroup[], unitIndex?: number | null): SelectionState {
  return applyDefaultsForGroups(groups, unitIndex);
}

export function buildDefaultUnitStates(groups: ModifierGroup[], unitCount: number): SelectionState[] {
  return Array.from({ length: unitCount }, (_, i) => applyDefaultsForGroups(groups, i));
}
