import { Capacitor } from "@capacitor/core";
import type { StripeTerminalPlugin } from "../../plugins/capacitor-stripe-terminal/src/definitions";
import { supabase } from "@/integrations/supabase/client";
import {
  createStripePaymentIntent,
  fetchStoreFinancialProfile,
  markOrderPaidAtCounter,
} from "@/services/orderService";
import { getStripePublishableKeyForEnvironment } from "@/lib/stripePublishableKey";
import { normalizeOptionalEmail } from "@/lib/emailValidation";
import { isNetworkOrEdgeUnavailable } from "@/lib/networkErrors";

function humanizeEdgeInvokeError(message: string): string {
  if (isNetworkOrEdgeUnavailable(message)) {
    return "O servidor de pagamentos ainda não respondeu. Aguarde alguns minutos e tente outra vez — se continuar, peça para publicar a app no Lovable.";
  }
  return message;
}

export type TapToPayStep =
  | "idle"
  | "connecting"
  | "waiting_card"
  | "processing"
  | "success"
  | "error";

export type ReaderWarmUpStatus =
  | "idle"
  | "preparing"
  | "discovering"
  | "connecting"
  | "updating"
  | "ready"
  | "error";

let progressListenerAttached = false;
let warmUpInFlight: Promise<ReaderWarmUpStatus> | null = null;
let lastWarmUpError: string | null = null;

export function consumeLastTapToPayWarmUpError(): string | null {
  const msg = lastWarmUpError;
  lastWarmUpError = null;
  return msg;
}

const WARM_UP_TIMEOUT_MS = 60_000;
const PAYMENT_TIMEOUT_MS = 120_000;
const EDGE_INVOKE_TIMEOUT_MS = 20_000;

async function invokeEdgeFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke(functionName, { body }),
    EDGE_INVOKE_TIMEOUT_MS,
    "O servidor demorou demasiado a responder. Tente outra vez.",
  );
  if (error) throw new Error(humanizeEdgeInvokeError(error.message || "Falha na ligação ao servidor"));
  if (data?.error) throw new Error(data.error);
  return data as T;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isTapToPayPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function getTapToPayUnavailableMessage(): string {
  if (!Capacitor.isNativePlatform()) {
    return "Tap to Pay só funciona na app iPhone da equipa (não no browser).";
  }
  if (Capacitor.getPlatform() !== "ios") {
    return "Tap to Pay só está disponível no iPhone.";
  }
  return "Tap to Pay indisponível neste dispositivo.";
}

async function loadStripeTerminal(): Promise<StripeTerminalPlugin> {
  const mod = await import("capacitor-stripe-terminal");
  return mod.StripeTerminal;
}

async function attachProgressListener(
  onProgress?: (message: string) => void,
  onStatus?: (status: ReaderWarmUpStatus) => void,
): Promise<void> {
  if (!onProgress && !onStatus) return;
  const terminal = await loadStripeTerminal();
  if (progressListenerAttached || !terminal.addListener) return;
  progressListenerAttached = true;
  await terminal.addListener("readerProgress", (event) => {
    if (event.message) onProgress?.(event.message);
  });
  await terminal.addListener("readerStatusChanged", (event) => {
    if (event.status) onStatus?.(event.status as ReaderWarmUpStatus);
  });
}

export async function fetchTerminalConnectionToken(storeId: string): Promise<{
  secret: string;
  stripeConnectAccountId: string | null;
  stripeTerminalLocationId: string | null;
}> {
  return invokeEdgeFunction("stripe-terminal-connection-token", { storeId });
}

export async function createStoreTerminalLocation(
  storeId: string,
  address?: {
    line1?: string;
    city?: string;
    country?: string;
    postal_code?: string;
  },
): Promise<{ locationId: string; created: boolean }> {
  const profile = await fetchStoreFinancialProfile(storeId).catch(() => null);
  const existing = profile?.stripe_terminal_location_id?.trim();
  if (existing) {
    return { locationId: existing, created: false };
  }

  try {
    const data = await invokeEdgeFunction<{ locationId: string; created?: boolean }>(
      "stripe-create-terminal-location",
      { storeId, address },
    );
    return {
      locationId: data.locationId,
      created: Boolean(data.created),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (!isNetworkOrEdgeUnavailable(msg)) throw e;
    const token = await fetchTerminalConnectionToken(storeId);
    const fromToken = token.stripeTerminalLocationId?.trim();
    if (fromToken) {
      return { locationId: fromToken, created: false };
    }
    throw new Error(
      "Não foi possível criar a morada no servidor. Use «Verificar ubicación Stripe» — se já estiver confirmada, pode ignorar este botão.",
    );
  }
}

export async function verifyStoreTerminalLocation(storeId: string): Promise<{
  ok: boolean;
  locationId: string;
  displayName?: string;
  stripeConnectAccountId: string;
  error?: string;
}> {
  const invokeServerVerify = async (functionName: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) {
      const raw = error.message || "Falha ao verificar morada do terminal";
      const wrapped = new Error(raw);
      throw wrapped;
    }
    if (data?.error) throw new Error(data.error);
    if (typeof data?.ok !== "boolean") return null;
    return data as {
      ok: boolean;
      locationId: string;
      displayName?: string;
      stripeConnectAccountId: string;
      error?: string;
    };
  };

  for (const attempt of [
    () => invokeServerVerify("stripe-terminal-connection-token", { storeId, action: "verifyLocation" }),
    () => invokeServerVerify("stripe-verify-terminal-location", { storeId }),
  ]) {
    try {
      const serverResult = await attempt();
      if (serverResult) return serverResult;
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      if (!isNetworkOrEdgeUnavailable(raw)) throw new Error(raw);
    }
  }

  const profile = await fetchStoreFinancialProfile(storeId).catch(() => null);
  const tokenPayload = await fetchTerminalConnectionToken(storeId);
  const connectAccountId = tokenPayload.stripeConnectAccountId?.trim() ?? "";
  const locationId =
    profile?.stripe_terminal_location_id?.trim() ||
    tokenPayload.stripeTerminalLocationId?.trim() ||
    "";

  if (!connectAccountId) {
    return {
      ok: false,
      locationId,
      stripeConnectAccountId: "",
      error: "Recebimentos Stripe ainda não estão activos para esta loja.",
    };
  }
  if (!locationId) {
    return {
      ok: false,
      locationId: "",
      stripeConnectAccountId: connectAccountId,
      error: "Morada do terminal em falta na loja.",
    };
  }

  const tokenLoc = tokenPayload.stripeTerminalLocationId?.trim();
  const profileLoc = profile?.stripe_terminal_location_id?.trim();
  if (tokenLoc && profileLoc && tokenLoc !== profileLoc) {
    return {
      ok: false,
      locationId,
      stripeConnectAccountId: connectAccountId,
      error: "A morada guardada não coincide com a da conta Stripe.",
    };
  }

  return {
    ok: true,
    locationId,
    displayName: profile?.stripe_business_name || profile?.name || undefined,
    stripeConnectAccountId: connectAccountId,
  };
}

export async function checkAppleTapToPayTerms(storeId: string): Promise<{
  linked: boolean;
  message: string;
}> {
  if (!isTapToPayPlatform()) {
    return { linked: false, message: getTapToPayUnavailableMessage() };
  }

  const reader = await withTimeout(
    getTapToPayReaderStatus(),
    8_000,
    "Não foi possível ler o estado do leitor. Tente outra vez.",
  );

  if (reader.ready) {
    return { linked: true, message: "Leitor pronto — termos da Apple aceites." };
  }

  if (reader.status === "preparing" || reader.status === "discovering" || reader.status === "connecting" || reader.status === "updating") {
    return {
      linked: false,
      message: "O leitor ainda está a ligar. Aguarde ou toque em Preparar leitor.",
    };
  }

  try {
    const tokenPayload = await fetchTerminalConnectionToken(storeId);
    if (!tokenPayload.stripeConnectAccountId?.trim()) {
      return { linked: false, message: "Recebimentos Stripe ainda não estão activos para esta loja." };
    }
  } catch (e) {
    return {
      linked: false,
      message: e instanceof Error ? e.message : "Não foi possível verificar os termos da Apple.",
    };
  }

  return {
    linked: false,
    message:
      "Leitor ainda não preparado. Toque em Preparar leitor — quando a Apple pedir, leia até ao fim e toque Concordo uma vez.",
  };
}

async function resolveTerminalContext(storeId: string) {
  const [tokenPayload, profile] = await Promise.all([
    fetchTerminalConnectionToken(storeId),
    fetchStoreFinancialProfile(storeId),
  ]);

  const locationId = tokenPayload.stripeTerminalLocationId ?? profile?.stripe_terminal_location_id;

  let resolvedLocationId = locationId?.trim() ?? "";
  if (!resolvedLocationId) {
    const created = await createStoreTerminalLocation(storeId);
    resolvedLocationId = created.locationId;
  }

  const connectAccountId = tokenPayload.stripeConnectAccountId ?? profile?.stripe_connect_account_id;
  if (!connectAccountId?.trim()) {
    throw new Error("Recebimentos Stripe ainda não estão activos para esta loja.");
  }

  const env = profile?.stripe_connect_environment ?? "live";
  const simulated = profile?.stripe_connect_test_simulated === true || env === "test";

  return {
    tokenPayload,
    profile,
    locationId: resolvedLocationId,
    connectAccountId: connectAccountId.trim(),
    merchantDisplayName:
      (profile?.stripe_business_name || profile?.name || "Kebab Turco").trim().slice(0, 100),
    simulated,
  };
}

export async function warmUpTapToPayReader(
  storeId: string,
  opts?: {
    onProgress?: (message: string) => void;
    onStatus?: (status: ReaderWarmUpStatus) => void;
  },
): Promise<ReaderWarmUpStatus> {
  if (!isTapToPayPlatform()) return "idle";

  if (warmUpInFlight) {
    return warmUpInFlight;
  }

  warmUpInFlight = warmUpTapToPayReaderInternal(storeId, opts);
  try {
    return await warmUpInFlight;
  } finally {
    warmUpInFlight = null;
  }
}

async function warmUpTapToPayReaderInternal(
  storeId: string,
  opts?: {
    onProgress?: (message: string) => void;
    onStatus?: (status: ReaderWarmUpStatus) => void;
  },
): Promise<ReaderWarmUpStatus> {
  if (!isTapToPayPlatform()) return "idle";

  const support = await (await loadStripeTerminal()).isTapToPaySupported();
  if (!support.supported) return "error";

  await attachProgressListener(opts?.onProgress, opts?.onStatus);
  opts?.onStatus?.("preparing");

  try {
    const ctx = await resolveTerminalContext(storeId);
    const result = await withTimeout(
      (await loadStripeTerminal()).warmUpTapToPay({
        connectionToken: ctx.tokenPayload.secret,
        locationId: ctx.locationId,
        onBehalfOf: ctx.connectAccountId,
        merchantDisplayName: ctx.merchantDisplayName,
        simulated: ctx.simulated,
      }),
      WARM_UP_TIMEOUT_MS,
      "A preparação do Tap to Pay demorou demasiado. Verifique a ligação e tente novamente.",
    );
    const status = result.ready ? "ready" : "error";
    if (status === "error") {
      lastWarmUpError = "O leitor não ficou pronto. Tente em Definições → Preparar leitor.";
    } else {
      lastWarmUpError = null;
    }
    opts?.onStatus?.(status);
    return status;
  } catch (e) {
    lastWarmUpError = e instanceof Error ? e.message : "Erro ao preparar Tap to Pay.";
    console.warn("[TapToPay warm-up]", e);
    opts?.onStatus?.("error");
    return "error";
  }
}

export async function showTapToPayMerchantEducation(): Promise<void> {
  if (!isTapToPayPlatform()) return;
  try {
    await (await loadStripeTerminal()).showMerchantEducation();
  } catch {
    /* optional */
  }
}

export async function runTapToPayForOrder(params: {
  storeId: string;
  orderId: string;
  orderNumber: number;
  amountEuro: number;
  staffPin: string;
  customerEmail?: string | null;
  onStep?: (step: TapToPayStep, message?: string) => void;
}): Promise<{ paymentIntentId: string }> {
  if (!isTapToPayPlatform()) {
    throw new Error("Tap to Pay só funciona na app iPhone da equipa.");
  }

  const support = await (await loadStripeTerminal()).isTapToPaySupported();
  if (!support.supported) {
    throw new Error("Este iPhone não suporta Tap to Pay (requer iOS 15.4+).");
  }

  params.onStep?.("connecting", "A preparar leitor…");

  const readerStatus = await getTapToPayReaderStatus();
  if (readerStatus.status === "error") {
    throw new Error("O leitor Tap to Pay não está pronto. Active-o nas definições e tente novamente.");
  }

  const ctx = await resolveTerminalContext(params.storeId);
  const amountCents = Math.round(params.amountEuro * 100);
  const customerEmail = normalizeOptionalEmail(params.customerEmail);

  const pi = await createStripePaymentIntent({
    storeId: params.storeId,
    amountCents,
    subtotalCents: amountCents,
    deliveryCents: 0,
    discountCents: 0,
    orderType: "dine_in",
    paymentChannel: "terminal",
    customerEmail: customerEmail ?? undefined,
    metadata: {
      order_id: params.orderId,
      order_number: String(params.orderNumber),
      payment_channel: "terminal",
    },
  });

  const env = pi.connectEnvironment ?? ctx.profile?.stripe_connect_environment ?? "live";
  const publishableKey =
    pi.publishableKey ?? getStripePublishableKeyForEnvironment(env === "test" ? "test" : "live");
  if (!publishableKey) {
    throw new Error("Chave pública Stripe em falta.");
  }

  params.onStep?.("waiting_card", "Aproxime o cartão ou telemóvel do cliente…");

  const result = await withTimeout(
    (await loadStripeTerminal()).processTapToPayPayment({
      publishableKey,
      connectionToken: ctx.tokenPayload.secret,
      locationId: ctx.locationId,
      onBehalfOf: ctx.connectAccountId,
      merchantDisplayName: ctx.merchantDisplayName,
      clientSecret: pi.clientSecret,
      simulated: ctx.simulated,
    }),
    PAYMENT_TIMEOUT_MS,
    "O pagamento Tap to Pay demorou demasiado. Cancele e tente novamente.",
  );

  params.onStep?.("processing", "A confirmar pagamento…");

  await supabase.functions.invoke("stripe-verify-payment-intent", {
    body: { paymentIntentId: result.paymentIntentId },
  });

  await markOrderPaidAtCounter(params.orderId, "card", params.staffPin, result.paymentIntentId);

  params.onStep?.("success", "Pagamento aprovado!");
  return { paymentIntentId: result.paymentIntentId };
}

export async function disconnectTapToPayReader(): Promise<void> {
  if (!isTapToPayPlatform()) return;
  try {
    await (await loadStripeTerminal()).disconnectReader();
  } catch {
    /* ignore */
  }
}

export async function getTapToPayReaderStatus(): Promise<{
  status: ReaderWarmUpStatus;
  ready: boolean;
}> {
  if (!isTapToPayPlatform()) return { status: "idle", ready: false };
  try {
    const res = await (await loadStripeTerminal()).getReaderStatus();
    return {
      status: (res.status as ReaderWarmUpStatus) || "idle",
      ready: Boolean(res.ready),
    };
  } catch {
    return { status: "error", ready: false };
  }
}
