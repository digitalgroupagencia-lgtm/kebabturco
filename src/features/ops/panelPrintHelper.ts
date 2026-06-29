import { orderReadyForKitchen } from "@/lib/orderKitchenRules";
import type { TicketOrder } from "@/services/escPosTicketBuilder";
import { fetchPrinterConfig, hasActivePrintJob, printOrder } from "@/services/printerService";
import type { Tables } from "@/integrations/supabase/types";
import { orderItemToTicketItem } from "@/lib/ticketExpansion";
import { panelT } from "@/lib/staffPanelLocale";

type OrderItem = Tables<"order_items">;
type PanelOrder = Tables<"orders"> & { kitchen_printed_at?: string | null };

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
    items: items.map((it) => orderItemToTicketItem(it as unknown as Parameters<typeof orderItemToTicketItem>[0])),
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
    // silencioso, pedido continua
  }
}

/** Reimpressão manual, ignora dedup automática. */
export async function reprintPanelOrder(
  storeId: string,
  order: PanelOrder,
  items: OrderItem[],
  companyName = "Restaurante",
) {
  const cfg = await fetchPrinterConfig(storeId);
  if (!cfg.enabled) {
    throw new Error(panelT(undefined, "print.error.disabled"));
  }
  const result = await printOrder(
    storeId,
    panelOrderToTicket(order, items, companyName),
    order.id,
    { forceReprint: true },
  );
  if (!result.success) {
    throw new Error(result.error || panelT(undefined, "print.error.queue"));
  }
  return result;
}
