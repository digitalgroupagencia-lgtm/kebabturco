import type { CartConfiguration, ModifierSelection } from "./types";
import type { CartItemExtra } from "@/contexts/CartContext";

function pickLabel(name: Record<string, string>): string {
  return name.es || name.pt || name.en || name.fr || Object.values(name)[0] || "";
}

/** Converte seleções estruturadas para extras/removed legados (compatibilidade pedidos/impressão). */
export function selectionsToLegacyFields(allSelections: ModifierSelection[]): {
  extras: CartItemExtra[];
  removedIngredients: string[];
} {
  const extras: CartItemExtra[] = [];
  const removedIngredients: string[] = [];

  for (const s of allSelections) {
    if (s.groupKind === "removal") {
      const label = pickLabel(s.optionName);
      for (let i = 0; i < s.quantity; i++) removedIngredients.push(label);
      continue;
    }
    if (s.groupKind === "extra" || (s.groupKind === "choice" && s.priceDelta > 0)) {
      extras.push({
        id: s.optionId,
        name: s.optionName,
        price: s.priceDelta,
        quantity: s.quantity,
      });
    }
  }

  return { extras, removedIngredients };
}

export function flattenConfiguration(config: CartConfiguration): ModifierSelection[] {
  const global = config.globalSelections || [];
  const units = (config.comboUnits || []).flatMap((u) =>
    u.selections.map((s) => ({ ...s, unitIndex: u.unitIndex, unitLabel: u.unitLabel })),
  );
  return [...global, ...units];
}

function formatSelectionLine(
  s: ModifierSelection,
  tName: (n: Record<string, string>) => string,
  withoutPrefix: string,
): string {
  const opt = tName(s.optionName);
  if (s.groupKind === "removal") return `${withoutPrefix} ${opt}`;
  if (s.groupKind === "substitution") {
    const price = s.priceDelta > 0 ? ` (+${s.priceDelta.toFixed(2)}€)` : "";
    return `${opt}${price}`;
  }
  if (s.quantity > 1) return `${s.quantity}× ${opt}`;
  return opt;
}

/** Opções incluídas por defeito — não poluir o resumo do carrinho. */
function isIncludedDefaultSelection(s: ModifierSelection): boolean {
  if (s.groupKind !== "substitution" || s.priceDelta > 0) return false;
  const label = pickLabel(s.optionName).toLowerCase();
  return /incluid|included|tradicional|incluíd/.test(label);
}

export function configurationSummaryLines(
  config: CartConfiguration,
  tName: (n: Record<string, string>) => string,
  withoutPrefix = "Sem",
): string[] {
  const lines: string[] = [];
  for (const s of config.globalSelections || []) {
    if (isIncludedDefaultSelection(s)) continue;
    lines.push(formatSelectionLine(s, tName, withoutPrefix));
  }
  for (const unit of config.comboUnits || []) {
    const unitName = tName(unit.unitLabel);
    for (const s of unit.selections) {
      if (isIncludedDefaultSelection(s)) continue;
      lines.push(`${unitName}: ${formatSelectionLine(s, tName, withoutPrefix)}`);
    }
  }
  return lines;
}
