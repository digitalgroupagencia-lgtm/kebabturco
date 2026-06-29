import type { ModifierGroup } from "./types";

function groupLabel(group: ModifierGroup): string {
  return `${group.name.es} ${group.name.pt} ${group.name.en}`.toLowerCase();
}

function optionLabels(group: ModifierGroup): string {
  return group.options.map((o) => `${o.name.es} ${o.name.pt} ${o.name.en}`).join(" ").toLowerCase();
}

/** Temperatura, gelo e escolhas similares — texto + ícone, sem foto. */
export function isInformationalModifierGroup(group: ModifierGroup): boolean {
  const label = groupLabel(group);
  if (/temperatura|temperature|température|hielo|gelo|ice|glaçon/.test(label)) return true;

  if (group.groupKind !== "choice" || group.options.length > 4) return false;
  if (group.options.some((o) => Boolean(o.imageUrl))) return false;

  const opts = optionLabels(group);
  const looksInfo = /fr[ií]a|gelada|natural|hielo|gelo|ice|ambiente|chilled|room/.test(opts);
  const looksProduct = /coca|fanta|sprite|nestea|agua|refresco|cola|pepsi|bravas|patata/.test(opts);
  return looksInfo && !looksProduct;
}
