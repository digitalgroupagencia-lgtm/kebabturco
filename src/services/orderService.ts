import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/contexts/CartContext";

export const APPLICATION_FEE_CENTS = 100; // €1

export function cartItemsToRpcPayload(items: CartItem[]) {
  return items.map((i) => ({
    product_id: i.productId,
    product_name: (i.productName?.es || i.productName?.en || Object.values(i.productName)[0]) as string,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    total_price: i.totalPrice,
    size_name: i.sizeName ? (i.sizeName.es || i.sizeName.en || Object.values(i.sizeName)[0]) : null,
    extras: i.extras.map((e) => ({
      name: (e.name?.es || e.name?.en || Object.values(e.name)[0]) as string,
      quantity: e.quantity,
      price: e.price,
    })),
    removed: i.removedIngredients,
    notes: i.note || null,
  }));
}

export interface CreateCustomerOrderParams {
  storeId: string;
  orderType: "dine_in" | "takeaway" | "delivery";
  items: CartItem[];
  subtotal: number;
  total: number;
  tableNumber?: string | null;
  tableId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: "pending" | "paid" | "failed";
  stripePaymentIntentId?: string | null;
}

export async function createCustomerOrder(params: CreateCustomerOrderParams) {
  const { data, error } = await supabase.rpc("create_customer_order", {
    _store_id: params.storeId,
    _order_type: params.orderType,
    _items: cartItemsToRpcPayload(params.items),
    _total: params.total,
    _subtotal: params.subtotal,
    _table_number: params.tableNumber || null,
    _table_id: params.tableId || null,
    _customer_name: params.customerName || null,
    _customer_phone: params.customerPhone || null,
    _notes: params.notes || null,
    _payment_method: params.paymentMethod || null,
    _payment_status: params.paymentStatus || "pending",
    _stripe_payment_intent_id: params.stripePaymentIntentId || null,
    _application_fee_cents: params.paymentStatus === "paid" && params.paymentMethod === "card"
      ? APPLICATION_FEE_CENTS
      : 0,
  });

  if (error) throw error;
  return data as { success: boolean; order_id: string; order_number: string };
}

export async function invokePrintOrder(body: Record<string, unknown>) {
  try {
    await supabase.functions.invoke("print-order", { body });
  } catch {
    // não bloqueia o cliente
  }
}

export async function createStripePaymentIntent(params: {
  storeId: string;
  amountCents: number;
  orderType: string;
  metadata?: Record<string, string>;
}) {
  const { data, error } = await supabase.functions.invoke("stripe-create-payment-intent", {
    body: params,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { clientSecret: string; paymentIntentId: string };
}

export async function createStripeConnectLink(storeId: string, returnUrl: string) {
  const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
    body: { storeId, returnUrl },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { url: string };
}

export function buildPrintPayload(opts: {
  storeId: string;
  orderNumber: string;
  orderType: string;
  tableNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentMethod: string;
  paymentPending: boolean;
  paidViaApp?: boolean;
  items: CartItem[];
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  notes?: string | null;
}) {
  return {
    storeId: opts.storeId,
    orderNumber: opts.orderNumber,
    tableNumber: opts.tableNumber || null,
    customerName: opts.customerName || null,
    customerPhone: opts.customerPhone || null,
    orderType: opts.orderType === "dine_in" ? "here" : opts.orderType === "delivery" ? "delivery" : "takeaway",
    paymentMethod: opts.paymentMethod,
    paymentPending: opts.paymentPending,
    paidViaApp: opts.paidViaApp ?? false,
    items: opts.items.map((i) => ({
      productName: (i.productName?.es || i.productName?.en || Object.values(i.productName)[0]) as string,
      quantity: i.quantity,
      size: i.sizeName ? (i.sizeName.es || i.sizeName.en || Object.values(i.sizeName)[0]) : null,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      extras: i.extras.map((e) => ({
        name: (e.name?.es || e.name?.en || Object.values(e.name)[0]) as string,
        quantity: e.quantity,
        price: e.price,
      })),
      removed: i.removedIngredients,
    })),
    subtotal: opts.subtotal ?? opts.total,
    total: opts.total,
    deliveryFee: opts.deliveryFee ?? 0,
    notes: opts.notes || null,
  };
}

export function getTableQrUrl(domain: string, mesaNumber: string, tenantSlug?: string | null) {
  const base = domain.startsWith("http") ? domain : `https://${domain}`;
  const url = new URL(base);
  if (tenantSlug && !domain.includes(tenantSlug)) {
    url.searchParams.set("tenant", tenantSlug);
  }
  url.searchParams.set("mesa", mesaNumber);
  return url.toString();
}
