import type { Tables } from "@/integrations/supabase/types";
import type { ModifierSelection } from "./types";

type OrderItem = Tables<"order_items"> & { selections?: unknown };

export function parseOrderItemSelections(item: OrderItem): ModifierSelection[] {
  const raw = (item as any).selections;
  if (!Array.isArray(raw)) return [];
  return raw as unknown as ModifierSelection[];
}

function pickName(n: Record<string, string> | null | undefined): string {
  if (!n) return "";
  return n.es || n.pt || n.en || n.fr || Object.values(n)[0] || "";
}

function formatSelection(s: ModifierSelection): string {
  const opt = pickName(s.optionName);
  if (s.groupKind === "removal") return `Sem ${opt}`;
  if (s.groupKind === "substitution") {
    const price = s.priceDelta > 0 ? ` (+${Number(s.priceDelta).toFixed(2)}€)` : "";
    return `${opt}${price}`;
  }
  if (s.groupKind === "extra" && s.priceDelta > 0) {
    return `${opt} (+${Number(s.priceDelta).toFixed(2)}€)`;
  }
  if (s.quantity > 1) return `${s.quantity}× ${opt}`;
  return opt;
}

export interface OrderItemUnitGroup {
  /** undefined = seleções globais (não pertencem a uma unidade). */
  unitIndex?: number;
  unitLabel?: string;
  lines: string[];
}

/**
 * Devolve grupos de detalhes por unidade do combo — facilita render
 * em "cards por unidade" no painel/KDS, igual ao mockup.
 */
export function groupOrderItemDetails(item: OrderItem): OrderItemUnitGroup[] {
  const groups = new Map<string, OrderItemUnitGroup>();
  const globalKey = "__global__";

  const getOrCreate = (key: string, init: () => OrderItemUnitGroup) => {
    if (!groups.has(key)) groups.set(key, init());
    return groups.get(key)!;
  };

  const selections = parseOrderItemSelections(item);
  for (const s of selections) {
    if (s.unitIndex != null) {
      const key = `u-${s.unitIndex}`;
      const g = getOrCreate(key, () => ({
        unitIndex: s.unitIndex ?? undefined,
        unitLabel: pickName((s.unitLabel as Record<string, string>) || undefined) || `Item ${s.unitIndex}`,
        lines: [],
      }));
      g.lines.push(formatSelection(s));
    } else {
      const g = getOrCreate(globalKey, () => ({ lines: [] }));
      g.lines.push(formatSelection(s));
    }
  }

  // Extras planos (compat) — só se não duplicam selections.
  const extras = item.extras;
  if (Array.isArray(extras)) {
    const g = getOrCreate(globalKey, () => ({ lines: [] }));
    for (const e of extras as { name?: string; quantity?: number }[]) {
      if (!e?.name) continue;
      const q = e.quantity && e.quantity > 1 ? `${e.quantity}× ` : "";
      const line = `+ ${q}${e.name}`;
      const exists = Array.from(groups.values()).some((gr) => gr.lines.some((l) => l.includes(e.name!)));
      if (!exists) g.lines.push(line);
    }
  }

  const removed = item.removed;
  if (Array.isArray(removed)) {
    const g = getOrCreate(globalKey, () => ({ lines: [] }));
    for (const r of removed as string[]) {
      if (!r) continue;
      const exists = Array.from(groups.values()).some((gr) => gr.lines.some((l) => l.includes(r)));
      if (!exists) g.lines.push(`Sem ${r}`);
    }
  }

  if (item.size_name) {
    const g = getOrCreate(globalKey, () => ({ lines: [] }));
    g.lines.unshift(`Tamanho: ${item.size_name}`);
  }
  if (item.notes) {
    const g = getOrCreate(globalKey, () => ({ lines: [] }));
    g.lines.push(`Nota: ${item.notes}`);
  }

  // Ordena: globais primeiro, depois unidades em ordem.
  return Array.from(groups.values()).sort((a, b) => {
    if (a.unitIndex == null && b.unitIndex == null) return 0;
    if (a.unitIndex == null) return -1;
    if (b.unitIndex == null) return 1;
    return (a.unitIndex ?? 0) - (b.unitIndex ?? 0);
  });
}

/** Versão "flat" mantida para componentes/legacy. */
export function formatOrderItemDetailLines(item: OrderItem): string[] {
  const groups = groupOrderItemDetails(item);
  const out: string[] = [];
  for (const g of groups) {
    if (g.unitLabel) out.push(`— ${g.unitLabel} —`);
    for (const l of g.lines) out.push(l);
  }
  return out;
}
