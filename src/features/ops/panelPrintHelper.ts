import { orderReadyForKitchen } from "@/lib/orderKitchenRules";
import type { TicketOrder } from "@/services/escPosTicketBuilder";
import { fetchPrinterConfig, hasActivePrintJob, printOrder } from "@/services/printerService";
import type { Tables } from "@/integrations/supabase/types";

type OrderItem = Tables<"order_items">;
type PanelOrder = Tables<"orders"> & { kitchen_printed_at?: string | null };

function resolveProductName(n: unknown): string {
  if (typeof n === "string") {
    const t = n.trim();
    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
      try { return resolveProductName(JSON.parse(t)); } catch { return t; }
    }
    return t;
  }
  if (n && typeof n === "object") {
    const o = n as Record<string, unknown>;
    const v = o.es ?? o.en ?? o.pt ?? Object.values(o)[0];
    return typeof v === "string" ? v : String(v ?? "");
  }
  return String(n ?? "");
}

export function panelOrderToTicket(
  order: PanelOrder,
  items: OrderItem[],
  companyName = "Restaurante",
): TicketOrder {
  const address =
    order.delivery_street && order.delivery_city
      ? `${order.delivery_street} ${order.delivery_number ?? ""}, ${order.delivery_city}`.trim()
      : order.delivery_street ?? null;

  return {
    id: order.id,
    order_number: order.order_number,
    customer_name: order.customer_name ?? undefined,
    order_type: order.order_type,
    table_number: order.table_number,
    address,
    contact_phone: order.customer_phone,
    notes: order.notes,
    items: items.map((it) => ({
      name: resolveProductName(it.product_name),
      price: Number(it.unit_price),
      quantity: it.quantity,
      size: it.size_name ?? undefined,
      notes: it.notes ?? undefined,
      extras: Array.isArray(it.extras)
        ? (it.extras as { name?: string; quantity?: number; price?: number }[]).map((e) => ({
            name: e.name || "",
            price: e.price,
          }))
        : undefined,
      removed: Array.isArray(it.removed) ? (it.removed as string[]) : undefined,
    })),
    total: Number(order.total),
    subtotal: Number(order.subtotal ?? order.total),
    created_at: order.created_at,
    payment_method: order.payment_method,
    paid_via_app: order.payment_status === "paid",
    company_name: companyName,
  };
}

/** Imprime na cozinha se elegível e ainda não impresso (dedup via kitchen_printed_at + job activo). */
export async function tryPrintPanelOrder(
  storeId: string,
  order: PanelOrder,
  items: OrderItem[],
  companyName = "Restaurante",
) {
  try {
    if (!orderReadyForKitchen(order)) return;
    if (order.kitchen_printed_at) return;
    if (await hasActivePrintJob(order.id)) return;
    const cfg = await fetchPrinterConfig(storeId);
    if (!cfg.enabled) return;
    await printOrder(storeId, panelOrderToTicket(order, items, companyName), order.id);
  } catch {
    // silencioso — pedido continua
  }
}

/** Reimpressão manual — ignora dedup automática. */
export async function reprintPanelOrder(
  storeId: string,
  order: PanelOrder,
  items: OrderItem[],
  companyName = "Restaurante",
) {
  const cfg = await fetchPrinterConfig(storeId);
  if (!cfg.enabled) {
    throw new Error("Impressora desactivada para esta unidade");
  }
  const result = await printOrder(
    storeId,
    panelOrderToTicket(order, items, companyName),
    order.id,
    { forceReprint: true },
  );
  if (!result.success) {
    throw new Error(result.error || "Falha ao enfileirar impressão");
  }
  return result;
}
