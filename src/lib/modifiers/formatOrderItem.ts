import type { Tables } from "@/integrations/supabase/types";
import type { ModifierSelection } from "./types";

type OrderItem = Tables<"order_items">;

export function parseOrderItemSelections(item: OrderItem): ModifierSelection[] {
  const raw = item.selections;
  if (!Array.isArray(raw)) return [];
  return raw as unknown as ModifierSelection[];
}

export function formatOrderItemDetailLines(item: OrderItem): string[] {
  const lines: string[] = [];
  const selections = parseOrderItemSelections(item);

  if (selections.length) {
    for (const s of selections) {
      const opt = s.optionName?.es || s.optionName?.pt || s.optionName?.en || "";
      const unit = s.unitLabel?.es || s.unitLabel?.pt || "";
      const prefix = unit && s.unitIndex != null ? `${unit} ${(s.unitIndex ?? 0) + 1}: ` : "";
      if (s.groupKind === "removal") lines.push(`${prefix}Sem ${opt}`);
      else if (s.groupKind === "substitution") {
        const price = s.priceDelta > 0 ? ` (+${Number(s.priceDelta).toFixed(2)}€)` : "";
        lines.push(`${prefix}${opt}${price}`);
      } else if (s.quantity > 1) lines.push(`${prefix}${s.quantity}× ${opt}`);
      else lines.push(`${prefix}${opt}`);
    }
  }

  const extras = item.extras;
  if (Array.isArray(extras)) {
    for (const e of extras as { name?: string; quantity?: number }[]) {
      if (!e?.name) continue;
      const q = e.quantity && e.quantity > 1 ? `${e.quantity}× ` : "";
      if (!lines.some((l) => l.includes(e.name!))) lines.push(`+ ${q}${e.name}`);
    }
  }

  const removed = item.removed;
  if (Array.isArray(removed)) {
    for (const r of removed as string[]) {
      if (r && !lines.some((l) => l.includes(r))) lines.push(`Sem ${r}`);
    }
  }

  if (item.size_name) lines.unshift(`Tamanho: ${item.size_name}`);
  if (item.notes) lines.push(`Nota: ${item.notes}`);

  return lines;
}
