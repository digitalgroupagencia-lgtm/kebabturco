import type { CartItem } from "@/customer/contexts/CartContext";
import type { CustomerOrderType } from "@/lib/paymentPolicy";
import { shouldPrintAfterCheckout } from "@/lib/paymentPolicy";
import type { OperationsSettings } from "@/hooks/useOperationsSettings";
import type { TicketOrder } from "@/services/escPosTicketBuilder";
import { fetchPrinterConfig, printOrder } from "@/services/printerService";
import { cartItemToTicketItem } from "@/lib/ticketExpansion";

type CheckoutPrintInput = {
  storeId: string;
  orderId: string;
  orderNumber: string;
  orderType: string;
  tableNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  paymentMethod: string;
  paymentStatus: "pending" | "paid";
  paidViaApp?: boolean;
  items: CartItem[];
  total: number;
  subtotal?: number;
  notes?: string | null;
  deliveryAddress?: string | null;
  companyName?: string;
  customerOrderType: CustomerOrderType;
  mesaValidated: boolean;
  settings: OperationsSettings | null;
};

function resolveOrderTypeDb(orderType: string): TicketOrder["order_type"] {
  if (orderType === "dine_in" || orderType === "here") return "dine_in";
  if (orderType === "delivery") return "delivery";
  return "takeaway";
}

function cartItemsToTicketItems(items: CartItem[]) {
  return items.map(cartItemToTicketItem);
}

export function checkoutPayloadToTicket(input: CheckoutPrintInput): TicketOrder {
  return {
    id: input.orderId,
    order_number: input.orderNumber,
    customer_name: input.customerName ?? undefined,
    order_type: resolveOrderTypeDb(input.orderType),
    table_number: input.tableNumber,
    address: input.deliveryAddress,
    contact_phone: input.customerPhone,
    notes: input.notes,
    items: cartItemsToTicketItems(input.items),
    total: input.total,
    subtotal: input.subtotal ?? input.total,
    created_at: new Date().toISOString(),
    payment_method: input.paymentMethod,
    paid_via_app: input.paidViaApp ?? input.paymentStatus === "paid",
    company_name: input.companyName || "Restaurante",
  };
}

/** Enfileira impressão ESC/POS via print_jobs se elegível. */
export async function tryPrintCheckoutOrder(input: CheckoutPrintInput): Promise<void> {
  const printOk = shouldPrintAfterCheckout(
    input.customerOrderType,
    input.paymentStatus,
    input.settings,
    input.mesaValidated,
  );
  if (!printOk) return;

  const cfg = await fetchPrinterConfig(input.storeId);
  if (!cfg.enabled) return;

  const ticket = checkoutPayloadToTicket(input);
  await printOrder(input.storeId, ticket, input.orderId);
}

export async function tryPrintSellerOrder(params: {
  storeId: string;
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  customerName: string;
  items: { productName: string; quantity: number; unitPrice: number }[];
  total: number;
  notes?: string | null;
  companyName?: string;
}) {
  const cfg = await fetchPrinterConfig(params.storeId);
  if (!cfg.enabled) return;

  const ticket: TicketOrder = {
    id: params.orderId,
    order_number: params.orderNumber,
    customer_name: params.customerName,
    order_type: "dine_in",
    table_number: params.tableNumber,
    notes: params.notes,
    items: params.items.map((it) => ({
      name: it.productName,
      price: it.unitPrice,
      quantity: it.quantity,
    })),
    total: params.total,
    payment_method: "Pendente (mesa)",
    paid_via_app: false,
    company_name: params.companyName || "Restaurante",
    created_at: new Date().toISOString(),
  };

  await printOrder(params.storeId, ticket, params.orderId);
}
