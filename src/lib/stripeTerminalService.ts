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
  const { data, error } = await supabase.functions.invoke("stripe-terminal-connection-token", {
    body: { storeId },
  });
  if (error) throw new Error(humanizeEdgeInvokeError(error.message || "Falha ao ligar ao Terminal"));
  if (data?.error) throw new Error(data.error);
  return data as {
    secret: string;
    stripeConnectAccountId: string | null;
    stripeTerminalLocationId: string | null;
  };
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
  const { data, error } = await supabase.functions.invoke("stripe-create-terminal-location", {
    body: { storeId, address },
  });
  if (error) throw new Error(humanizeEdgeInvokeError(error.message || "Falha ao criar Terminal Location"));
  if (data?.error) throw new Error(data.error);
  return {
    locationId: data.locationId as string,
    created: Boolean(data.created),
  };
}

export async function verifyStoreTerminalLocation(storeId: string): Promise<{
  ok: boolean;
  locationId: string;
  displayName?: string;
  stripeConnectAccountId: string;
  error?: string;
}> {
  const invokeVerify = async (functionName: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) throw new Error(humanizeEdgeInvokeError(error.message || "Falha ao verificar morada do terminal"));
    if (data?.error) throw new Error(data.error);
    return data as {
      ok: boolean;
      locationId: string;
      displayName?: string;
      stripeConnectAccountId: string;
      error?: string;
    };
  };

  try {
    return await invokeVerify("stripe-verify-terminal-location", { storeId });
  } catch (primaryErr) {
    const msg = primaryErr instanceof Error ? primaryErr.message : "";
    if (!isNetworkOrEdgeUnavailable(msg)) throw primaryErr;
    const fallback = await invokeVerify("stripe-terminal-connection-token", {
      storeId,
      action: "verifyLocation",
    });
    if (typeof fallback.ok !== "boolean") {
      throw new Error(
        "A verificação da morada ainda não está activa no servidor. Faça Publish no Lovable e tente outra vez dentro de alguns minutos.",
      );
    }
    return fallback;
  }
}

export async function checkAppleTapToPayTerms(storeId: string): Promise<{
  linked: boolean;
  message: string;
}> {
  if (!isTapToPayPlatform()) {
    return { linked: false, message: getTapToPayUnavailableMessage() };
  }
  const tokenPayload = await fetchTerminalConnectionToken(storeId);
  const connectAccountId = tokenPayload.stripeConnectAccountId?.trim();
  if (!connectAccountId) {
    return { linked: false, message: "Recebimentos Stripe ainda não estão activos para esta loja." };
  }
  const terminal = await loadStripeTerminal();
  const res = await terminal.checkAppleTermsStatus({
    connectionToken: tokenPayload.secret,
    connectAccountId,
  });
  return { linked: Boolean(res.linked), message: res.message };
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
