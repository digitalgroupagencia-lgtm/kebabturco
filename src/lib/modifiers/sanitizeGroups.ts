import type { ModifierGroup, ModifierOption, ProductModifierConfig } from "./types";

export type ModifierConfigWarning = {
  groupId: string;
  groupName: string;
  message: string;
};

/** Garante que grupos obrigatórios têm opções válidas e fallback automático. */
export function sanitizeModifierGroup(group: ModifierGroup): ModifierGroup {
  let options: ModifierOption[] = [...group.options];

  if (options.length === 0) {
    return { ...group, isRequired: false, minSelect: 0 };
  }

  const mustSelect = group.isRequired || group.minSelect >= 1;

  if (mustSelect && !options.some((o) => o.isDefault)) {
    options = options.map((o, i) => ({ ...o, isDefault: i === 0 }));
  }

  return { ...group, options };
}

export function sanitizeModifierGroups(groups: ModifierGroup[]): ModifierGroup[] {
  return groups.map(sanitizeModifierGroup).filter((g) => g.options.length > 0 || !g.isRequired);
}

export function sanitizeProductModifierConfig(config: ProductModifierConfig): ProductModifierConfig {
  const groups = sanitizeModifierGroups(config.groups ?? []);
  return {
    ...config,
    groups,
    hasStructuredModifiers: groups.length > 0,
  };
}

/** Avisos para o admin quando a configuração pode bloquear clientes. */
export function getModifierConfigWarnings(groups: ModifierGroup[]): ModifierConfigWarning[] {
  const warnings: ModifierConfigWarning[] = [];
  for (const group of groups) {
    const label = group.name.pt || group.name.es || group.name.en || group.id;
    if (group.isRequired && group.options.length === 0) {
      warnings.push({
        groupId: group.id,
        groupName: label,
        message: "Grupo obrigatório sem opções — clientes não conseguem concluir o pedido.",
      });
    }
    if (group.isRequired && group.options.length === 1 && group.groupKind === "substitution") {
      warnings.push({
        groupId: group.id,
        groupName: label,
        message: "Substituição com uma só opção — considere tornar opcional ou adicionar opção incluída.",
      });
    }
  }
  return warnings;
}
