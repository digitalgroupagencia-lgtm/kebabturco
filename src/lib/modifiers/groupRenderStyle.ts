import type { ModifierGroup } from "@/lib/modifiers/types";

export function groupHasImages(group: ModifierGroup): boolean {
  return group.options.some((o) => Boolean(o.imageUrl));
}

export function isDrinkLikeGroup(group: ModifierGroup): boolean {
  const label = `${group.name.es} ${group.name.pt} ${group.name.en}`.toLowerCase();
  return /bebida|refresco|drink|boisson|coca|cola|zumo|jugo/.test(label);
}

export function shouldUseChipLayout(group: ModifierGroup): boolean {
  if (group.groupKind !== "choice" && group.groupKind !== "removal") return false;
  if (group.selectionMode !== "multiple") return false;
  if (groupHasImages(group)) return false;
  return group.options.length <= 12;
}

export function shouldUseRadioList(group: ModifierGroup): boolean {
  if (group.groupKind === "substitution" || group.groupKind === "extra") return false;
  if (groupHasImages(group)) return false;
  return group.selectionMode === "single";
}

export function shouldUseImageCarousel(group: ModifierGroup): boolean {
  return groupHasImages(group) && (isDrinkLikeGroup(group) || group.options.length >= 4);
}
