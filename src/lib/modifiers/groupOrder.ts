import type { ModifierGroup, ModifierGroupKind } from "./types";

const KIND_ORDER: Record<ModifierGroupKind, number> = {
  choice: 0,
  substitution: 1,
  removal: 2,
  extra: 3,
};

export function sortModifierGroups(groups: ModifierGroup[]): ModifierGroup[] {
  return [...groups].sort((a, b) => {
    const byKind = KIND_ORDER[a.groupKind] - KIND_ORDER[b.groupKind];
    if (byKind !== 0) return byKind;
    return a.sortOrder - b.sortOrder;
  });
}
