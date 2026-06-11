/**
 * Regra de negócio Kebab Turco:
 * Quando o cliente remove TODOS os ingredientes/acompanhamentos de um
 * kebab/pita/rollo e deixa só a carne ("solo carne"), aplicamos um
 * acréscimo de 1,00 € por unidade (compensa a carne extra que vai no lugar
 * dos vegetais).
 */
import type { CartConfiguration, ModifierGroup } from "./types";

export const SOLO_CARNE_SURCHARGE_EUR = 1.0;

function textOf(name?: Record<string, string>): string {
  if (!name) return "";
  return `${name.es || ""} ${name.pt || ""} ${name.en || ""} ${name.fr || ""}`.toLowerCase();
}

export function productAllowsSoloCarneRule(
  productName?: Record<string, string>,
  productDescription?: Record<string, string>,
): boolean {
  const text = `${textOf(productName)} ${textOf(productDescription)}`;
  // Pita, rollo/durum, kebab tradicional, doner, shawarma
  return /\bpita\b|\brollo\b|\bdurum\b|\bdürüm\b|\bd[oö]ner\b|\bshawarma\b|\bkebab\b/.test(text);
}

function unitIsSoloCarne(
  selectedRemovalOptionIds: Set<string>,
  groups: ModifierGroup[],
): boolean {
  const removalGroups = groups.filter((g) => g.groupKind === "removal");
  if (removalGroups.length === 0) return false;
  const allOptionIds = removalGroups.flatMap((g) => g.options.map((o) => o.id));
  if (allOptionIds.length === 0) return false;
  // "Só carne" = todas as opções de remoção estão marcadas (tudo tirado).
  return allOptionIds.every((id) => selectedRemovalOptionIds.has(id));
}

/**
 * Retorna { surcharge, units } onde:
 * - surcharge: total em euros a somar ao preço unitário do item.
 * - units: quantas sub-unidades dispararam a regra (útil para combos).
 */
export function computeSoloCarneSurcharge(
  productName: Record<string, string> | undefined,
  productDescription: Record<string, string> | undefined,
  config: CartConfiguration,
  globalGroups: ModifierGroup[],
  unitGroups: ModifierGroup[],
): { surcharge: number; units: number } {
  if (!productAllowsSoloCarneRule(productName, productDescription)) {
    return { surcharge: 0, units: 0 };
  }

  if (config.comboUnits && config.comboUnits.length > 0) {
    let count = 0;
    for (const u of config.comboUnits) {
      const ids = new Set(
        u.selections.filter((s) => s.groupKind === "removal").map((s) => s.optionId),
      );
      if (unitIsSoloCarne(ids, unitGroups)) count++;
    }
    return { surcharge: count * SOLO_CARNE_SURCHARGE_EUR, units: count };
  }

  const ids = new Set(
    (config.globalSelections || [])
      .filter((s) => s.groupKind === "removal")
      .map((s) => s.optionId),
  );
  if (unitIsSoloCarne(ids, globalGroups)) {
    return { surcharge: SOLO_CARNE_SURCHARGE_EUR, units: 1 };
  }
  return { surcharge: 0, units: 0 };
}
