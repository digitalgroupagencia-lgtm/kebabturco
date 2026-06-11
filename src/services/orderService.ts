import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;
import type { CartItem } from "@/customer/contexts/CartContext";
export const PLATFORM_FEE_CENTS = 100;

export type StoreStripeSettings = {
  stripe_connect_account_id: string | null;
  stripe_charges_enabled: boolean;
};

export type StoreFinancialProfile = StoreStripeSettings & {
  stripe_connect_environment?: "live" | "test" | null;
  stripe_connect_test_simulated?: boolean;
  stripe_onboarding_completed: boolean;
  stripe_payouts_enabled: boolean;
  stripe_iban_last4: string | null;
  stripe_business_name: string | null;
  stripe_payout_status: string;
  stripe_last_payout_at: string | null;
};

export type StripePlatformStatus = {
  keyMode: "live" | "test";
  connectEnvironment: "live" | "test";
  connectLiveAllowed: boolean;
  platformProfileComplete: boolean;
  pendingVerification: boolean;
  productionBlocked: boolean;
  testKeysConfigured: boolean;
  message: string | null;
  adminMessage: string | null;
  canUseEmbeddedTest: boolean;
  canUseEmbeddedLive: boolean;
  hasConnectAccount?: boolean;
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
  _online_service_fee_cents?: number;
  _platform_fee_cents?: number;
  _stripe_fee_cents?: number;
  _net_to_store_cents?: number;
  _stripe_connect_account_id?: string;
};

export function cartItemsToRpcPayload(items: CartItem[]) {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return items.map((i) => ({
    product_id: uuidRe.test(i.productId) ? i.productId : null,
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
  qrToken?: string | null;
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
  onlineServiceFeeCents?: number;
  platformFeeCents?: number;
  stripeFeeCents?: number;
  netToStoreCents?: number;
  stripeConnectAccountId?: string | null;
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
  const withEnv =
    "stripe_connect_account_id, stripe_connect_environment, stripe_connect_test_simulated, stripe_charges_enabled, stripe_onboarding_completed, stripe_payouts_enabled, stripe_iban_last4, stripe_business_name, stripe_payout_status, stripe_last_payout_at";
  const legacy =
    "stripe_connect_account_id, stripe_charges_enabled, stripe_onboarding_completed, stripe_payouts_enabled, stripe_iban_last4, stripe_business_name, stripe_payout_status, stripe_last_payout_at";

  let { data, error } = await supabase.from("stores").select(withEnv).eq("id", storeId).maybeSingle();

  if (error?.message?.includes("stripe_connect_environment") || error?.message?.includes("stripe_connect_test_simulated")) {
    const retry = await supabase.from("stores").select(legacy).eq("id", storeId).maybeSingle();
    data = retry.data ? { ...retry.data, stripe_connect_environment: null, stripe_connect_test_simulated: false } : null;
    error = retry.error;
  }

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
    _online_service_fee_cents: params.onlineServiceFeeCents ?? 0,
    _platform_fee_cents: params.platformFeeCents ?? 0,
    _stripe_fee_cents: params.stripeFeeCents ?? 0,
    _net_to_store_cents: params.netToStoreCents ?? undefined,
    _stripe_connect_account_id: params.stripeConnectAccountId || undefined,
  };

  const { data, error } = await supabase.rpc("create_customer_order", args);

  if (error) throw new Error(error.message || "Não foi possível criar o pedido");
  const result = data as CreateCustomerOrderResult;
  return result;
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

export async function confirmDeliveryWithCode(orderId: string, code: string) {
  const { data, error } = await supabase.rpc("confirm_delivery_with_code", {
    _order_id: orderId,
    _code: code,
  });
  if (error) throw error;
  const result = data as { success?: boolean; error?: string; order_number?: string };
  if (!result?.success) {
    throw new Error(result?.error || "Código incorrecto");
  }
  return result as { success: true; order_number?: string };
}

export async function assignDeliveryDriver(orderId: string, driverUserId: string) {
  const { data, error } = await supabase.rpc("assign_delivery_driver", {
    _order_id: orderId,
    _driver_user_id: driverUserId,
  });
  if (error) throw error;
  return data as { success: boolean; assigned_driver_id?: string };
}

export async function listStoreDrivers(storeId: string) {
  const { data, error } = await supabase.rpc("list_store_drivers", { _store_id: storeId });
  if (error) throw error;
  return (data ?? []) as { user_id: string; full_name: string }[];
}

export async function startDelivery(orderId: string) {
  const { data, error } = await supabase.rpc("start_delivery", { _order_id: orderId });
  if (error) throw error;
  return data as { success: boolean; delivery_confirmation_code?: string };
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
  /** @deprecated Use print_jobs via checkoutPrintHelper / printerService */
  try {
    await supabase.functions.invoke("print-order", { body });
  } catch {
    // não bloqueia o cliente
  }
}

async function readEdgeFunctionError(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : "Erro ao iniciar pagamento";
  const ctx =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : undefined;
  if (ctx instanceof Response) {
    try {
      const parsed = await ctx.clone().json();
      if (parsed && typeof parsed === "object" && "error" in parsed && (parsed as { error?: unknown }).error) {
        return String((parsed as { error: unknown }).error);
      }
    } catch {
      // ignore parse errors
    }
  }
  return fallback;
}

export async function createStripePaymentIntent(params: {
  storeId: string;
  subtotalCents: number;
  deliveryCents: number;
  discountCents: number;
  orderType: string;
  metadata?: Record<string, string>;
}) {
  const { data, error } = await supabase.functions.invoke("stripe-create-payment-intent", {
    body: params,
  });
  if (error) throw new Error(await readEdgeFunctionError(error));
  if (data?.error) throw new Error(data.error);
  return data as {
    clientSecret: string;
    paymentIntentId: string;
    amountCents: number;
    restaurantPortionCents: number;
    onlineServiceFeeCents: number;
    platformFeeCents: number;
    estimatedStripeFeeCents: number;
    stripeConnectAccountId: string | null;
    connectEnvironment?: "live" | "test";
    publishableKey?: string | null;
  };
}

export type StripeConnectStatus = {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingCompleted: boolean;
  payoutStatus: string;
  businessName: string | null;
  ibanLast4: string | null;
  requirementsDue: string[];
  ready: boolean;
  connectEnvironment?: "live" | "test";
};

function throwConnectError(data: Record<string, unknown>): never {
  const err = new Error(String(data.error ?? "Erro nos recebimentos"));
  (err as Error & { code?: string; platform?: StripePlatformStatus }).code =
    typeof data.code === "string" ? data.code : undefined;
  (err as Error & { platform?: StripePlatformStatus }).platform =
    data.platform && typeof data.platform === "object"
      ? (data.platform as StripePlatformStatus)
      : undefined;
  throw err;
}

async function invokeConnectFunction(
  payload: Record<string, unknown>,
  options?: { silent?: boolean; allowPaymentIntentFallback?: boolean },
) {
  const mode = typeof payload.mode === "string" ? payload.mode : "";
  const readOnly = mode === "platform_status";

  const invoke = async (functionName: string, body: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      if (error) {
        if (options?.silent || readOnly) return null;
        const rawMsg = error.message || String(error);
        const notFound =
          rawMsg.includes("404") ||
          rawMsg.toLowerCase().includes("not found") ||
          rawMsg.toLowerCase().includes("failed to send");
        if (notFound) return null;
        // supabase-js wraps any non-2xx as a generic "Edge Function returned a
        // non-2xx status code". The real, human-readable reason lives in the
        // response body, so surface it when available.
        let msg = rawMsg;
        const ctx = (error as { context?: unknown }).context;
        if (ctx instanceof Response) {
          try {
            const parsed = await ctx.clone().json();
            if (parsed && typeof parsed === "object" && "error" in parsed && (parsed as { error?: unknown }).error) {
              msg = String((parsed as { error: unknown }).error);
            }
          } catch {
            /* keep the generic message if the body is not JSON */
          }
        }
        throw new Error(msg);
      }
      if (data && typeof data === "object" && "error" in data && data.error) {
        if (options?.silent || readOnly) return null;
        throwConnectError(data as Record<string, unknown>);
      }
      return data;
    } catch (e) {
      if (options?.silent || readOnly) return null;
      throw e;
    }
  };

  const direct = await invoke("stripe-connect-onboard", payload);
  if (direct) return direct;

  if (options?.allowPaymentIntentFallback && mode !== "platform_status" && mode !== "sync_status") {
    const fallback = await invoke("stripe-create-payment-intent", { action: "connect_onboard", ...payload });
    if (fallback) return fallback;
  }

  if (options?.silent || readOnly) return null;

  throw new Error(
    "Serviço de recebimentos indisponível — peça na Lovable para actualizar as funções do servidor.",
  );
}

/** Admin-only: switch a store from test/simulated to real (live) receivables. */
export async function activateLiveStripeConnect(
  storeId: string,
): Promise<{ activated: boolean; connectEnvironment: "live"; alreadyLive?: boolean }> {
  const data = await invokeConnectFunction({ storeId, mode: "activate_live" });
  if (!data) {
    throw new Error(
      "Não foi possível activar recebimentos oficiais — peça na Lovable para publicar as funções do servidor.",
    );
  }
  return data as { activated: boolean; connectEnvironment: "live"; alreadyLive?: boolean };
}

/** Admin-only: generate a shareable, no-login onboarding link for a store. */
export async function createStoreOnboardingLink(
  storeId: string,
): Promise<{ token: string; expiresAt: string; path: string }> {
  const data = await invokeConnectFunction({ storeId, mode: "create_onboarding_link" });
  if (!data) {
    throw new Error(
      "Não foi possível gerar o link — peça na Lovable para publicar as funções do servidor.",
    );
  }
  return data as { token: string; expiresAt: string; path: string };
}

export type PublicLinkInfo = {
  valid: boolean;
  storeName: string | null;
  prefill: {
    businessName: string;
    ownerFullName: string;
    ownerEmail: string | null;
    ownerPhone: string | null;
    taxId: string | null;
    iban: string;
    businessAddress: string | null;
    ownerDob: string | null;
    businessMcc: string | null;
    businessType: "company" | "individual" | null;
    representativeId: string | null;
  } | null;
};

async function parsePublicEdgeError(error: { message?: string; context?: unknown }): Promise<string> {
  let msg = error.message || "";
  const ctx = error.context;
  if (ctx instanceof Response) {
    try {
      const parsed = await ctx.clone().json();
      if (parsed && typeof parsed === "object" && "error" in parsed && parsed.error) {
        msg = String((parsed as { error: string }).error);
      }
    } catch {
      /* ignore */
    }
  }
  if (
    msg.includes("non-2xx") ||
    msg.toLowerCase().includes("unauthorized") ||
    msg.includes("Sessão") ||
    msg.includes("Modo inválido")
  ) {
    return "El envío no está disponible todavía. Administración debe publicar las funciones del servidor en Lovable (chat: Deploy all edge functions, especially stripe-connect-onboard).";
  }
  return msg || "No se pudo conectar con el servidor.";
}

async function invokePublicConnect<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", { body });
  if (error) throw new Error(await parsePublicEdgeError(error));
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

export async function fetchPublicOnboardingLinkInfo(token: string): Promise<PublicLinkInfo> {
  try {
    return await invokePublicConnect<PublicLinkInfo>({ mode: "public_link_info", token });
  } catch {
    return { valid: true, storeName: null, prefill: null };
  }
}

export type PublicSubmitIntakeResult = {
  submitted: boolean;
  needsVerification: boolean;
  message?: string;
  clientSecret?: string;
  accountId?: string;
};

/** Dono do restaurante envia dados pelo link (formulário Kebab, sem login). */
export async function submitPublicOnboardingIntake(
  token: string,
  input: {
    businessName: string;
    ownerFullName: string;
    ownerEmail: string;
    ownerPhone: string;
    taxId: string;
    iban: string;
    businessAddress: string;
    businessWebsite?: string;
    ownerDob: string;
    businessType: "company" | "individual";
    businessMcc: string;
    acceptTerms: boolean;
    representativeId?: string;
  },
): Promise<PublicSubmitIntakeResult> {
  return invokePublicConnect<PublicSubmitIntakeResult>({
    mode: "public_submit_intake",
    token,
    ...input,
  });
}

/** Public (no auth): open the onboarding form from a shareable token. */
export async function createPublicOnboardingSession(
  token: string,
): Promise<{ clientSecret: string; accountId: string; connectEnvironment: "live" | "test" }> {
  const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
    body: { mode: "public_onboarding_session", token },
  });
  if (error) {
    throw new Error(error.message || "Não foi possível abrir o formulário.");
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as { clientSecret: string; accountId: string; connectEnvironment: "live" | "test" };
}

export async function createStripeConnectEmbeddedSession(
  storeId: string,
  mode: "embedded_onboarding" | "embedded_management",
) {
  const data = await invokeConnectFunction({ storeId, mode }, { allowPaymentIntentFallback: true });
  if (!data) {
    throw new Error("Não foi possível abrir o formulário de recebimentos — tente modo teste.");
  }
  return data as {
    clientSecret?: string;
    accountId: string;
    connectEnvironment?: "live" | "test";
    skipEmbedded?: boolean;
    accountType?: "custom" | "express";
    message?: string;
  };
}

/** Só usar quando o utilizador pedir actualização explícita — nunca no carregamento do painel. */
export async function fetchStripePlatformStatus(storeId?: string): Promise<StripePlatformStatus | null> {
  const data = await invokeConnectFunction(
    { storeId: storeId ?? "", mode: "platform_status" },
    { silent: true },
  );
  return data ? (data as StripePlatformStatus) : null;
}

/** Reenvia dados já guardados para criar/atualizar conta Stripe live. */
export async function resyncStorePayoutIntakeToStripe(storeId: string): Promise<{
  synced: boolean;
  accountId?: string;
  message?: string;
  connectEnvironment?: "live" | "test";
}> {
  const data = await invokeConnectFunction({ storeId, mode: "resync_intake_to_stripe" });
  if (!data) {
    throw new Error("Não foi possível enviar para a Stripe — tente de novo.");
  }
  if (data && typeof data === "object" && "error" in data && (data as { error?: unknown }).error) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as {
    synced: boolean;
    accountId?: string;
    message?: string;
    connectEnvironment?: "live" | "test";
  };
}

export async function syncStripeConnectStatus(storeId: string): Promise<StripeConnectStatus> {
  const data = await invokeConnectFunction({ storeId, mode: "sync_status" }, { allowPaymentIntentFallback: true });
  if (!data) {
    throw new Error("Não foi possível actualizar — use modo teste ou tente mais tarde.");
  }
  return data as StripeConnectStatus;
}

export async function provisionTestStripeConnectLocal(storeId: string) {
  const { data: rpcData, error: rpcErr } = await supabase.rpc("activate_test_receivables", {
    _store_id: storeId,
  });

  if (!rpcErr && rpcData && typeof rpcData === "object" && (rpcData as { success?: boolean }).success) {
    const row = rpcData as {
      success: boolean;
      account_id?: string;
      message?: string;
    };
    return {
      accountId: row.account_id ?? `simulated-${storeId.replace(/-/g, "").slice(0, 12)}`,
      provisioned: true,
      simulated: true,
      ready: true,
      connectEnvironment: "test" as const,
      chargesEnabled: true,
      onboardingCompleted: true,
      message:
        row.message ??
        "Modo teste simulado activo. Para pagar com cartão 4242, configure também as chaves de teste da Stripe.",
    };
  }

  const { data: store, error: loadErr } = await supabase
    .from("stores")
    .select("name")
    .eq("id", storeId)
    .maybeSingle();
  if (loadErr) throw loadErr;

  const label = store?.name ? `${store.name} (teste simulado)` : "Kebab Turco (teste simulado)";
  const accountId = `simulated-${storeId.replace(/-/g, "").slice(0, 12)}`;
  const { error } = await supabase
    .from("stores")
    .update({
      stripe_connect_environment: "test",
      stripe_connect_test_simulated: true,
      stripe_connect_account_id: accountId,
      stripe_charges_enabled: true,
      stripe_onboarding_completed: true,
      stripe_payouts_enabled: true,
      stripe_payout_status: "active",
      stripe_business_name: label,
      stripe_iban_last4: "0000",
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);
  if (error) {
    throw new Error(
      "Não foi possível activar na base de dados. Confirme que correu o script SQL completo em Recebimentos.",
    );
  }

  return {
    accountId,
    provisioned: true,
    simulated: true,
    ready: true,
    connectEnvironment: "test" as const,
    chargesEnabled: true,
    onboardingCompleted: true,
    message:
      "Modo teste simulado activo. Para pagar com cartão 4242, configure também as chaves de teste da Stripe.",
  };
}

async function tryProvisionTestViaEdge(storeId: string) {
  const attempt = async (functionName: string, body: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      if (error) return null;
      if (data && typeof data === "object" && "error" in data && data.error) return null;
      return data;
    } catch {
      return null;
    }
  };

  const direct = await attempt("stripe-connect-onboard", { storeId, mode: "provision_test" });
  if (direct) return direct;

  return attempt("stripe-create-payment-intent", {
    action: "connect_onboard",
    storeId,
    mode: "provision_test",
  });
}

export async function provisionTestStripeConnect(storeId: string) {
  const edge = await tryProvisionTestViaEdge(storeId);
  if (edge && typeof edge === "object") {
    return edge as {
      accountId: string;
      provisioned: boolean;
      simulated: boolean;
      ready: boolean;
      connectEnvironment: "test";
      message: string;
      chargesEnabled?: boolean;
      onboardingCompleted?: boolean;
    };
  }

  return provisionTestStripeConnectLocal(storeId);
}

/** @deprecated Usar createStripeConnectEmbeddedSession — onboarding embebido no painel */
export async function startStripeConnectOnboarding(storeId: string, returnUrl: string) {
  const data = await invokeConnectFunction(
    { storeId, returnUrl, mode: "start_onboarding" },
    { allowPaymentIntentFallback: true },
  );
  return data as { url: string; accountId: string };
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
