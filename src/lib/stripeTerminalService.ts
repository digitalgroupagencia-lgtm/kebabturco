import { Capacitor } from "@capacitor/core";
import type { StripeTerminalPlugin } from "../../plugins/capacitor-stripe-terminal/src/definitions";
import { supabase } from "@/integrations/supabase/client";
import {
  createStripePaymentIntent,
  fetchStoreFinancialProfile,
  markOrderPaidAtCounter,
  pollStripePaymentConfirmation,
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
let lastWarmUpDiagnostics: TapToPayDiagnostics | null = null;

export type TapToPayDiagnostics = {
  stage: "warmup" | "payment" | "reader_status" | "context";
  timestamp: string;
  message: string;
  code?: string;
  name?: string;
  rawErrorJson?: string;
  hint?: string;
};

export function consumeLastTapToPayWarmUpError(): string | null {
  const msg = lastWarmUpError;
  lastWarmUpError = null;
  return msg;
}

export function getLastTapToPayDiagnostics(): TapToPayDiagnostics | null {
  return lastWarmUpDiagnostics;
}

export function clearLastTapToPayDiagnostics(): void {
  lastWarmUpDiagnostics = null;
}

function buildTapToPayHint(rawMessage: string, code?: string): string | undefined {
  const m = `${code ?? ""} ${rawMessage}`.toLowerCase();
  if (
    m.includes("entitlement") ||
    m.includes("proximity-reader") ||
    m.includes("not entitled") ||
    m.includes("missing entitlement") ||
    m.includes("readererror") ||
    m.includes("not supported") ||
    m.includes("nfcreaderusagedescription")
  ) {
    return "Provável entitlement Apple `com.apple.developer.proximity-reader.payment.acceptance` ainda não aprovado. Verifique o caso aberto na Apple e o capability no provisioning profile.";
  }
  if (m.includes("timeout") || m.includes("demorou") || m.includes("não respondeu")) {
    return "O SDK nativo não respondeu dentro do tempo limite. Confirme entitlement aprovado, ligação à internet, e que está em iPhone físico (não simulador) com iOS 16.7+.";
  }
  if (m.includes("location") || m.includes("ubicación") || m.includes("morada")) {
    return "Verifique se a localização Stripe Terminal está criada (Definições → Tap to Pay → Verificar ubicación Stripe).";
  }
  if (m.includes("connection token") || m.includes("connectiontoken")) {
    return "Token de ligação Stripe inválido. Confirme que `stripe-terminal-connection-token` está publicada e a conta Connect activa.";
  }
  if (m.includes("network") || m.includes("offline") || m.includes("internet")) {
    return "Sem internet ou edge function indisponível. Tente novamente em Wi-Fi.";
  }
  return undefined;
}

function buildDiagnostics(
  stage: TapToPayDiagnostics["stage"],
  err: unknown,
): TapToPayDiagnostics {
  let message = "";
  let code: string | undefined;
  let name: string | undefined;
  let rawErrorJson: string | undefined;

  if (err instanceof Error) {
    message = err.message;
    name = err.name;
    const anyErr = err as unknown as Record<string, unknown>;
    if (typeof anyErr.code === "string") code = anyErr.code;
  } else if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    message = typeof rec.message === "string" ? rec.message : JSON.stringify(rec);
    if (typeof rec.code === "string") code = rec.code;
    if (typeof rec.name === "string") name = rec.name;
  } else {
    message = String(err ?? "");
  }

  try {
    rawErrorJson = JSON.stringify(err, Object.getOwnPropertyNames(err ?? {})).slice(0, 800);
  } catch {
    rawErrorJson = undefined;
  }

  return {
    stage,
    timestamp: new Date().toISOString(),
    message: message || "(sem mensagem)",
    code,
    name,
    rawErrorJson,
    hint: buildTapToPayHint(message, code),
  };
}

export function formatTapToPayDiagnostics(d: TapToPayDiagnostics): string {
  const lines: string[] = [];
  lines.push(`Erro Tap to Pay (${d.stage})`);
  lines.push(`Mensagem: ${d.message}`);
  if (d.code) lines.push(`Código: ${d.code}`);
  if (d.name) lines.push(`Tipo: ${d.name}`);
  if (d.hint) lines.push(`Dica: ${d.hint}`);
  lines.push(`Hora: ${d.timestamp}`);
  if (d.rawErrorJson && d.rawErrorJson !== "{}") {
    lines.push(`Detalhe nativo: ${d.rawErrorJson}`);
  }
  return lines.join("\n");
}

const WARM_UP_TIMEOUT_MS = 60_000;
const PAYMENT_TIMEOUT_MS = 120_000;
const EDGE_INVOKE_TIMEOUT_MS = 20_000;

type EdgeInvokeResult<T> = {
  data: T | null;
  rawMessage: string;
  dataError: string | null;
};

async function invokeEdgeFunctionRaw<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<EdgeInvokeResult<T>> {
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke(functionName, { body }),
      EDGE_INVOKE_TIMEOUT_MS,
      "EDGE_TIMEOUT",
    );
    const dataError =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : null;
    return {
      data: (data as T) ?? null,
      rawMessage: error?.message ?? dataError ?? "",
      dataError,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "EDGE_TIMEOUT";
    return { data: null, rawMessage: msg, dataError: null };
  }
}

function shouldTryNextEdgeEndpoint(rawMessage: string): boolean {
  return isNetworkOrEdgeUnavailable(rawMessage) || rawMessage === "EDGE_TIMEOUT";
}

async function invokeEdgeWithFallbacks<T>(
  attempts: Array<{ functionName: string; body: Record<string, unknown> }>,
): Promise<T> {
  let lastMessage = "Falha na ligação ao servidor";

  for (const attempt of attempts) {
    const { data, rawMessage, dataError } = await invokeEdgeFunctionRaw<T>(
      attempt.functionName,
      attempt.body,
    );
    if (data && !dataError) {
      return data;
    }
    lastMessage = dataError || rawMessage || lastMessage;
    if (!shouldTryNextEdgeEndpoint(rawMessage) && !dataError?.toLowerCase().includes("not found")) {
      break;
    }
  }

  throw new Error(humanizeEdgeInvokeError(lastMessage));
}

async function invokeEdgeFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  return invokeEdgeWithFallbacks<T>([{ functionName, body }]);
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
  return invokeEdgeWithFallbacks<{
    secret: string;
    stripeConnectAccountId: string | null;
    stripeTerminalLocationId: string | null;
  }>([
    { functionName: "stripe-terminal-connection-token", body: { storeId } },
    { functionName: "stripe-create-payment-intent", body: { storeId, action: "terminal_connection_token" } },
  ]);
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
    const data = await invokeEdgeWithFallbacks<{ locationId: string; created?: boolean }>([
      { functionName: "stripe-create-terminal-location", body: { storeId, address } },
    ]);
    return {
      locationId: data.locationId,
      created: Boolean(data.created),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const token = await fetchTerminalConnectionToken(storeId).catch(() => null);
    const fromToken = token?.stripeTerminalLocationId?.trim();
    if (fromToken) {
      return { locationId: fromToken, created: false };
    }
    if (
      isNetworkOrEdgeUnavailable(msg) ||
      msg.toLowerCase().includes("permissão") ||
      msg.toLowerCase().includes("permission")
    ) {
      throw new Error(
        "Não foi possível criar a morada no servidor. Use «Verificar ubicación Stripe» — se já estiver confirmada, pode ignorar este botão.",
      );
    }
    throw e;
  }
}

export async function verifyStoreTerminalLocation(storeId: string): Promise<{
  ok: boolean;
  locationId: string;
  displayName?: string;
  stripeConnectAccountId: string;
  error?: string;
}> {
  type VerifyResult = {
    ok: boolean;
    locationId: string;
    displayName?: string;
    stripeConnectAccountId: string;
    error?: string;
  };

  const profile = await fetchStoreFinancialProfile(storeId).catch(() => null);
  const profileLoc = profile?.stripe_terminal_location_id?.trim() ?? "";
  const profileConnect = profile?.stripe_connect_account_id?.trim() ?? "";

  if (profileLoc && profileConnect && profile?.stripe_charges_enabled) {
    return {
      ok: true,
      locationId: profileLoc,
      displayName: profile.stripe_business_name ?? undefined,
      stripeConnectAccountId: profileConnect,
    };
  }

  try {
    return await invokeEdgeWithFallbacks<VerifyResult>([
      { functionName: "stripe-terminal-connection-token", body: { storeId, action: "verifyLocation" } },
      { functionName: "stripe-verify-terminal-location", body: { storeId } },
      { functionName: "stripe-create-payment-intent", body: { storeId, action: "verify_terminal_location" } },
    ]);
  } catch {
    /* tenta dados parciais abaixo */
  }

  let connectAccountId = profileConnect;
  let locationId = profileLoc;

  if (!connectAccountId || !locationId) {
    try {
      const tokenPayload = await fetchTerminalConnectionToken(storeId);
      connectAccountId = connectAccountId || tokenPayload.stripeConnectAccountId?.trim() || "";
      locationId = locationId || tokenPayload.stripeTerminalLocationId?.trim() || "";
    } catch {
      /* sem servidor */
    }
  }

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

  return {
    ok: true,
    locationId,
    displayName: profile?.stripe_business_name ?? undefined,
    stripeConnectAccountId: connectAccountId,
  };
}

export async function safeGetTapToPayReaderStatus(): Promise<{
  status: ReaderWarmUpStatus;
  ready: boolean;
}> {
  try {
    return await withTimeout(getTapToPayReaderStatus(), 3_000, "TIMEOUT");
  } catch {
    return { status: "idle", ready: false };
  }
}

export async function checkAppleTapToPayTerms(storeId: string): Promise<{
  linked: boolean;
  message: string;
}> {
  if (!isTapToPayPlatform()) {
    return { linked: false, message: getTapToPayUnavailableMessage() };
  }

  const profile = await fetchStoreFinancialProfile(storeId).catch(() => null);
  const hasLocation = Boolean(profile?.stripe_terminal_location_id?.trim());
  const connectOk =
    Boolean(profile?.stripe_connect_account_id?.trim()) && profile?.stripe_charges_enabled === true;

  if (!connectOk) {
    return { linked: false, message: "Recebimentos Stripe ainda não estão activos para esta loja." };
  }

  const reader = await safeGetTapToPayReaderStatus();

  if (reader.ready) {
    return { linked: true, message: "Leitor pronto — termos da Apple aceites." };
  }

  if (
    reader.status === "preparing" ||
    reader.status === "discovering" ||
    reader.status === "connecting" ||
    reader.status === "updating"
  ) {
    return {
      linked: false,
      message: "O leitor ainda está a ligar. Aguarde ou toque em Preparar leitor.",
    };
  }

  const locationNote = hasLocation ? " A morada da loja já está configurada." : "";

  return {
    linked: false,
    message: `Leitor ainda não preparado.${locationNote} Toque em Preparar leitor — quando a Apple pedir, leia até ao fim e toque Concordo uma vez.`,
  };
}

async function resolveTerminalContext(storeId: string) {
  const [tokenPayload, profile] = await Promise.all([
    fetchTerminalConnectionToken(storeId),
    fetchStoreFinancialProfile(storeId),
  ]);

  const locationId = tokenPayload.stripeTerminalLocationId ?? profile?.stripe_terminal_location_id;

  const resolvedLocationId = locationId?.trim() ?? "";
  if (!resolvedLocationId) {
    throw new Error(
      "Morada do terminal em falta. Vá a Definições → Tap to Pay e toque em Verificar ubicación Stripe.",
    );
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
      (profile?.stripe_business_name || (profile as { name?: string } | null)?.name || "Kebab Turco").trim().slice(0, 100),
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
      const diag = buildDiagnostics("warmup", new Error("O leitor não ficou pronto após inicializar (ready=false)."));
      lastWarmUpDiagnostics = diag;
      lastWarmUpError = formatTapToPayDiagnostics(diag);
    } else {
      lastWarmUpError = null;
      lastWarmUpDiagnostics = null;
    }
    opts?.onStatus?.(status);
    return status;
  } catch (e) {
    const diag = buildDiagnostics("warmup", e);
    lastWarmUpDiagnostics = diag;
    lastWarmUpError = formatTapToPayDiagnostics(diag);
    console.warn("[TapToPay warm-up]", diag, e);
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

  let readerStatus = await getTapToPayReaderStatus();
  if (!readerStatus.ready) {
    const warmed = await warmUpTapToPayReader(params.storeId, {
      onProgress: (message) => params.onStep?.("connecting", message),
    });
    if (warmed !== "ready") {
      const detail = consumeLastTapToPayWarmUpError();
      throw new Error(
        detail ??
          "O leitor Tap to Pay não está pronto. Vá a Definições → Preparar leitor e aceite os termos da Apple.",
      );
    }
    readerStatus = await getTapToPayReaderStatus();
  }

  if (!readerStatus.ready) {
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

  try {
    await pollStripePaymentConfirmation({
      storeId: params.storeId,
      paymentIntentId: result.paymentIntentId,
      orderId: params.orderId,
    });
  } catch (e) {
    console.warn("[TapToPay] verify payment intent", e);
  }

  await markOrderPaidAtCounter(params.orderId, "card", params.staffPin, result.paymentIntentId);

  params.onStep?.("success", "Pagamento aprovado!");
  return { paymentIntentId: result.paymentIntentId };
}

export async function cancelTapToPayPayment(): Promise<void> {
  if (!isTapToPayPlatform()) return;
  try {
    await (await loadStripeTerminal()).cancelPayment();
  } catch {
    /* ignore */
  }
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
