import type { Tables } from "@/integrations/supabase/types";
import type { TicketOrder } from "@/services/escPosTicketBuilder";
import { fetchPrinterConfig, printOrder } from "@/services/printerService";

type OrderItem = Tables<"order_items">;
type PanelOrder = Tables<"orders">;

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
      quantity: it.quantity,
      product_name: it.product_name,
      unit_price: Number(it.unit_price),
      total_price: Number(it.total_price),
      notes: it.notes ?? undefined,
    })),
    total: Number(order.total),
    subtotal: Number(order.subtotal ?? order.total),
    created_at: order.created_at,
    payment_method: order.payment_method,
    paid_via_app: order.payment_status === "paid",
    company_name: companyName,
  };
}

/** Imprime na cozinha se a impressora estiver activa (não bloqueia UI). */
export async function tryPrintPanelOrder(
  storeId: string,
  order: PanelOrder,
  items: OrderItem[],
) {
  try {
    const cfg = await fetchPrinterConfig(storeId);
    if (!cfg.enabled) return;
    await printOrder(storeId, panelOrderToTicket(order, items), order.id);
  } catch {
    // silencioso — pedido continua
  }
}
