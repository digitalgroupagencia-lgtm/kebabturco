import type { ModifierGroup, ModifierSelection, SelectionState } from "./types";

export function groupKey(groupId: string, unitIndex?: number | null) {
  return unitIndex != null ? `${groupId}::u${unitIndex}` : groupId;
}

export function getGroupSelectionCount(state: SelectionState, groupId: string, unitIndex?: number | null): number {
  const map = state.get(groupKey(groupId, unitIndex));
  if (!map) return 0;
  return Array.from(map.values()).reduce((s, q) => s + q, 0);
}

export function getSelectedOptionIds(state: SelectionState, groupId: string, unitIndex?: number | null): string[] {
  const map = state.get(groupKey(groupId, unitIndex));
  if (!map) return [];
  return Array.from(map.entries()).filter(([, q]) => q > 0).map(([id]) => id);
}

export function validateGroupSelection(group: ModifierGroup, state: SelectionState, unitIndex?: number | null): string | null {
  const count = getGroupSelectionCount(state, group.id, unitIndex);
  const min = group.isRequired ? Math.max(1, group.minSelect) : group.minSelect;
  const isSingle = group.groupKind === "substitution" || group.selectionMode === "single";
  const max = isSingle ? Math.min(1, group.maxSelect || 1) : group.maxSelect;

  if (count < min) {
    if (group.groupKind === "removal") return "required_removal";
    if (group.groupKind === "extra") return "required_extra";
    if (group.groupKind === "substitution") return "required_substitution";
    return "required_choice";
  }
  if (max > 0 && count > max) return "too_many";
  return null;
}

export function validateAllGroups(
  groups: ModifierGroup[],
  state: SelectionState,
  unitIndex?: number | null,
): { valid: boolean; groupId?: string; error?: string } {
  for (const group of groups) {
    const err = validateGroupSelection(group, state, unitIndex);
    if (err) return { valid: false, groupId: group.id, error: err };
    for (const [optionId, qty] of state.get(groupKey(group.id, unitIndex)) || []) {
      const opt = group.options.find((o) => o.id === optionId);
      if (opt && qty > opt.maxQty) return { valid: false, groupId: group.id, error: "max_qty" };
    }
  }
  return { valid: true };
}

export function buildSelectionsFromState(
  groups: ModifierGroup[],
  state: SelectionState,
  unitIndex?: number | null,
  unitLabel?: Record<string, string> | null,
): ModifierSelection[] {
  const out: ModifierSelection[] = [];
  for (const group of groups) {
    const map = state.get(groupKey(group.id, unitIndex));
    if (!map) continue;
    for (const [optionId, qty] of map) {
      if (qty <= 0) continue;
      const opt = group.options.find((o) => o.id === optionId);
      if (!opt) continue;
      out.push({
        groupId: group.id,
        groupName: group.name,
        groupKind: group.groupKind,
        optionId: opt.id,
        optionName: opt.name,
        quantity: qty,
        priceDelta: opt.priceDelta,
        unitIndex: unitIndex ?? null,
        unitLabel: unitLabel ?? null,
      });
    }
  }
  return out;
}
