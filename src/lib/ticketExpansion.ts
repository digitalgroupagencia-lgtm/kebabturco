/**
 * Expande combos e modificadores em "TicketItem"s detalhados para impressão.
 *
 * Cada produto-filho de um combo passa a aparecer com seu próprio bloco,
 * mantendo carne, molhos, removidos e observações independentes, para que
 * a cozinha consiga preparar cada item corretamente.
 *
 * O ticket builder já agrupa por unidade quando os labels incluem
 * "pita N" / "pan pita N", então emitimos extras com esse prefixo.
 */
import type { TicketItem } from "@/services/escPosTicketBuilder";
import type { CartItem } from "@/customer/contexts/CartContext";
import type { CartConfiguration, ModifierSelection } from "@/lib/modifiers/types";

function pickLabel(name: Record<string, string> | null | undefined): string {
  if (!name) return "";
  return name.es || name.pt || name.en || name.fr || Object.values(name)[0] || "";
}

function extractUnitNumber(unitLabel?: Record<string, string> | null): number | null {
  const lbl = pickLabel(unitLabel || undefined);
  const match = lbl.match(/(?:pita|unidad|item|hamburguesa|burger|durum|wrap|kebab)\s*(\d+)/i)
    || lbl.match(/\b(\d+)\s*[º°ª\.]?\s*(?:pan|pita|unidad|item|hamburguesa|burger|durum|wrap|kebab)\b/i);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function unitTag(unitIndex: number | null | undefined, unitLabel: Record<string, string> | null | undefined, zeroBased: boolean): string {
  // Usa "Pita N" como prefixo canônico, reconhecido pelo regex do builder.
  const fromLabel = extractUnitNumber(unitLabel);
  if (fromLabel) return `Pita ${fromLabel}`;
  if (typeof unitIndex === "number" && unitIndex >= 0) return `Pita ${zeroBased ? unitIndex + 1 : unitIndex}`;
  return "Item";
}

function pushSelection(
  acc: { extras: { name: string; price?: number }[]; removed: string[] },
  s: ModifierSelection,
  prefix: string | null,
) {
  const opt = pickLabel(s.optionName);
  if (!opt) return;
  if (s.groupKind === "removal") {
    if (prefix) {
      for (let i = 0; i < (s.quantity || 1); i++) {
        acc.extras.push({ name: `${prefix}: Sin ${opt}` });
      }
    } else {
      for (let i = 0; i < (s.quantity || 1); i++) acc.removed.push(opt);
    }
    return;
  }
  const label = prefix ? `${prefix}: ${opt}` : opt;
  const price = s.priceDelta && s.priceDelta > 0 ? s.priceDelta : undefined;
  const qty = Math.max(1, s.quantity || 1);
  for (let i = 0; i < qty; i++) acc.extras.push({ name: label, price });
}

function buildFromConfiguration(config: CartConfiguration): {
  extras: { name: string; price?: number }[];
  removed: string[];
} {
  const acc = { extras: [] as { name: string; price?: number }[], removed: [] as string[] };
  for (const s of config.globalSelections || []) pushSelection(acc, s, null);
  const numericUnitIndexes = (config.comboUnits || [])
    .map((u) => u.unitIndex)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const zeroBased = numericUnitIndexes.length > 0 && Math.min(...numericUnitIndexes) === 0;
  for (const u of config.comboUnits || []) {
    const prefix = unitTag(u.unitIndex, u.unitLabel, zeroBased);
    for (const s of u.selections) pushSelection(acc, s, prefix);
  }
  return acc;
}

function parseJsonValue<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as T; } catch { return null; }
  }
  return raw as T;
}

/** Constrói TicketItem a partir de um CartItem, expandindo combos. */
export function cartItemToTicketItem(item: CartItem): TicketItem {
  const name = pickLabel(item.productName) || "Produto";
  const size = item.sizeName ? pickLabel(item.sizeName) : undefined;

  if (item.configuration?.comboUnits?.length || (item.configuration?.globalSelections?.length ?? 0) > 0) {
    const { extras, removed } = buildFromConfiguration(item.configuration);
    return {
      name,
      price: item.unitPrice,
      quantity: item.quantity,
      size: size || null,
      extras,
      removed,
      notes: item.note,
    };
  }

  return {
    name,
    price: item.unitPrice,
    quantity: item.quantity,
    size: size || null,
    extras: item.extras.map((e) => ({ name: pickLabel(e.name), price: e.price })),
    removed: item.removedIngredients,
    notes: item.note,
  };
}

/** Versão para reimpressão a partir do banco (order_items com selections). */
export function orderItemToTicketItem(item: {
  product_name: unknown;
  unit_price: number | string;
  quantity: number;
  size_name?: string | null;
  notes?: string | null;
  extras?: unknown;
  removed?: unknown;
  selections?: unknown;
  configuration?: unknown;
}): TicketItem {
  const resolveName = (n: unknown): string => {
    if (typeof n === "string") {
      const t = n.trim();
      if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
        try { return resolveName(JSON.parse(t)); } catch { return t; }
      }
      return t;
    }
    if (n && typeof n === "object") return pickLabel(n as Record<string, string>);
    return String(n ?? "");
  };

  const cfg = parseJsonValue<CartConfiguration>(item.configuration);
  const parsedSelections = parseJsonValue<ModifierSelection[]>(item.selections);
  const sels = Array.isArray(parsedSelections) ? parsedSelections : [];

  // Reconstrói a configuração se só tivermos selections planas.
  const effectiveCfg: CartConfiguration | null = cfg && (cfg.globalSelections || cfg.comboUnits)
    ? cfg
    : sels.length
      ? {
          productType: "simple",
          globalSelections: sels.filter((s) => s.unitIndex == null),
          comboUnits: (() => {
            const byUnit = new Map<number, { unitIndex: number; unitLabel: Record<string, string>; selections: ModifierSelection[] }>();
            for (const s of sels) {
              if (s.unitIndex == null) continue;
              const k = s.unitIndex;
              if (!byUnit.has(k)) {
                byUnit.set(k, {
                  unitIndex: k,
                  unitLabel: (s.unitLabel as Record<string, string>) || { es: `Pita ${k}` },
                  selections: [],
                });
              }
              byUnit.get(k)!.selections.push(s);
            }
            return Array.from(byUnit.values()).sort((a, b) => a.unitIndex - b.unitIndex);
          })(),
        }
      : null;

  if (effectiveCfg && (effectiveCfg.comboUnits?.length || effectiveCfg.globalSelections?.length)) {
    const { extras, removed } = buildFromConfiguration(effectiveCfg);
    return {
      name: resolveName(item.product_name),
      price: Number(item.unit_price),
      quantity: item.quantity,
      size: item.size_name ?? null,
      extras,
      removed,
      notes: item.notes ?? undefined,
    };
  }

  return {
    name: resolveName(item.product_name),
    price: Number(item.unit_price),
    quantity: item.quantity,
    size: item.size_name ?? null,
    extras: Array.isArray(item.extras)
      ? (item.extras as { name?: string; price?: number }[]).map((e) => ({ name: e.name || "", price: e.price }))
      : [],
    removed: Array.isArray(item.removed) ? (item.removed as string[]) : [],
    notes: item.notes ?? undefined,
  };
}
