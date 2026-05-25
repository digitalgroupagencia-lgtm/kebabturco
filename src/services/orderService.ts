import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/contexts/CartContext";

export const PLATFORM_FEE_CENTS = 100;

export type StoreStripeSettings = {
  stripe_connect_account_id: string | null;
  stripe_charges_enabled: boolean;
};

export type StoreFinancialProfile = StoreStripeSettings & {
  stripe_onboarding_completed: boolean;
  stripe_payouts_enabled: boolean;
  stripe_iban_last4: string | null;
  stripe_business_name: string | null;
  stripe_payout_status: string;
  stripe_last_payout_at: string | null;
};

export type CreateCustomerOrderResult = {
  success: boolean;
  order_id: string;
  order_number: string;
  loyalty?: { stamps: number; reward_ready: boolean };
};

type CreateCustomerOrderArgs = {
  _store_id: string;
  _order_type: string;
  _items: ReturnType<typeof cartItemsToRpcPayload>;
  _total: number;
  _subtotal?: number;
  _table_number?: string;
  _table_id?: string;
  _customer_name?: string;
  _customer_phone?: string;
  _notes?: string;
  _payment_method?: string;
  _payment_status?: string;
  _stripe_payment_intent_id?: string;
  _application_fee_cents?: number;
  _delivery_street?: string;
  _delivery_number?: string;
  _delivery_complement?: string;
  _delivery_postal_code?: string;
  _delivery_city?: string;
  _delivery_notes?: string;
  _delivery_fee?: number;
  _delivery_zone_id?: string;
  _delivery_zone_name?: string;
  _coupon_code?: string;
  _discount_amount?: number;
  _coupon_id?: string;
};

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
    selections: i.selections || [],
    configuration: i.configuration || null,
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
  deliveryStreet?: string | null;
  deliveryNumber?: string | null;
  deliveryComplement?: string | null;
  deliveryPostalCode?: string | null;
  deliveryCity?: string | null;
  deliveryNotes?: string | null;
  deliveryFee?: number;
  deliveryZoneId?: string | null;
  deliveryZoneName?: string | null;
  couponCode?: string | null;
  discountAmount?: number;
  couponId?: string | null;
}

export type ValidateCouponResult = {
  valid: boolean;
  error?: string;
  coupon_id?: string;
  code?: string;
  discount_amount?: number;
};

export async function validateCoupon(storeId: string, code: string, subtotal: number) {
  const { data, error } = await supabase.rpc("validate_coupon", {
    _store_id: storeId,
    _code: code,
    _subtotal: subtotal,
  });
  if (error) throw error;
  return data as ValidateCouponResult;
}

export async function fetchStoreFinancialProfile(storeId: string): Promise<StoreFinancialProfile | null> {
  const { data, error } = await supabase
    .from("stores")
    .select(
      "stripe_connect_account_id, stripe_charges_enabled, stripe_onboarding_completed, stripe_payouts_enabled, stripe_iban_last4, stripe_business_name, stripe_payout_status, stripe_last_payout_at",
    )
    .eq("id", storeId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as StoreFinancialProfile;
}

export async function fetchStoreStripeSettings(storeId: string): Promise<StoreStripeSettings | null> {
  const profile = await fetchStoreFinancialProfile(storeId);
  if (!profile) return null;
  return {
    stripe_connect_account_id: profile.stripe_connect_account_id,
    stripe_charges_enabled: profile.stripe_charges_enabled,
  };
}

export async function createCustomerOrder(params: CreateCustomerOrderParams) {
  const args: CreateCustomerOrderArgs = {
    _store_id: params.storeId,
    _order_type: params.orderType,
    _items: cartItemsToRpcPayload(params.items),
    _total: params.total,
    _subtotal: params.subtotal,
    _table_number: params.tableNumber || undefined,
    _table_id: params.tableId || undefined,
    _customer_name: params.customerName || undefined,
    _customer_phone: params.customerPhone || undefined,
    _notes: params.notes || undefined,
    _payment_method: params.paymentMethod || undefined,
    _payment_status: params.paymentStatus || "pending",
    _stripe_payment_intent_id: params.stripePaymentIntentId || undefined,
    _application_fee_cents: params.paymentStatus === "paid" && params.paymentMethod === "card"
      ? PLATFORM_FEE_CENTS
      : 0,
    _delivery_street: params.deliveryStreet || undefined,
    _delivery_number: params.deliveryNumber || undefined,
    _delivery_complement: params.deliveryComplement || undefined,
    _delivery_postal_code: params.deliveryPostalCode || undefined,
    _delivery_city: params.deliveryCity || undefined,
    _delivery_notes: params.deliveryNotes || undefined,
    _delivery_fee: params.deliveryFee ?? 0,
    _delivery_zone_id: params.deliveryZoneId || undefined,
    _delivery_zone_name: params.deliveryZoneName || undefined,
    _coupon_code: params.couponCode || undefined,
    _discount_amount: params.discountAmount ?? 0,
    _coupon_id: params.couponId || undefined,
  };

  const { data, error } = await supabase.rpc("create_customer_order", args);

  if (error) throw error;
  return data as CreateCustomerOrderResult;
}

export async function markOrderPaidAtCounter(orderId: string, paymentMethod: "cash" | "card" = "cash") {
  const { data, error } = await supabase.rpc("mark_order_paid_at_counter", {
    _order_id: orderId,
    _payment_method: paymentMethod,
  });
  if (error) throw error;
  if (data && typeof data === "object" && (data as { error?: string }).error) {
    throw new Error((data as { error: string }).error);
  }
  return data as { success: boolean; order_id?: string; order_number?: string };
}

export async function regenerateTableQrToken(tableId: string) {
  const { data, error } = await supabase.rpc("regenerate_table_qr_token", { _table_id: tableId });
  if (error) throw error;
  return data as string;
}

export async function verifyStripePaymentIntent(params: {
  storeId: string;
  paymentIntentId: string;
  orderId: string;
  amountCents: number;
}) {
  const tryInvoke = async (name: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as { success: boolean; orderId?: string; orderNumber?: string };
  };

  try {
    return await tryInvoke("stripe-verify-payment-intent", params);
  } catch (first) {
    const msg = first instanceof Error ? first.message : String(first);
    const missing =
      msg.includes("404") ||
      msg.toLowerCase().includes("not found") ||
      msg.toLowerCase().includes("failed to send");
    if (!missing) throw first;
    return tryInvoke("stripe-create-payment-intent", { action: "verify", ...params });
  }
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

export async function provisionStripeConnect(storeId: string) {
  const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
    body: { storeId, mode: "provision" },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { accountId: string; provisioned: boolean };
}

export async function createStripeConnectSession(storeId: string) {
  const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
    body: { storeId, mode: "account_session" },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { clientSecret: string; accountId: string };
}

export async function createStripeConnectLink(storeId: string, returnUrl: string) {
  const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
    body: { storeId, returnUrl, mode: "onboarding_link" },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { url: string; accountId: string };
}

export function buildPrintPayload(opts: {
  storeId: string;
  orderId?: string | null;
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
  deliveryAddress?: string | null;
  deliveryNumber?: string | null;
  deliveryCity?: string | null;
  deliveryPostalCode?: string | null;
}) {
  const fullAddress = opts.deliveryAddress
    ? `${opts.deliveryAddress}${opts.deliveryNumber ? ` ${opts.deliveryNumber}` : ""}${opts.deliveryCity ? `, ${opts.deliveryCity}` : ""}${opts.deliveryPostalCode ? ` ${opts.deliveryPostalCode}` : ""}`
    : null;

  return {
    storeId: opts.storeId,
    orderId: opts.orderId || null,
    orderNumber: opts.orderNumber,
    tableNumber: opts.tableNumber || null,
    customerName: opts.customerName || null,
    customerPhone: opts.customerPhone || null,
    orderType: opts.orderType === "dine_in" ? "here" : opts.orderType === "delivery" ? "delivery" : "takeaway",
    paymentMethod: opts.paymentMethod,
    paymentPending: opts.paymentPending,
    paidViaApp: opts.paidViaApp ?? false,
    deliveryAddress: fullAddress,
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
