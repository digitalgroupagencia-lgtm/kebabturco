import { Capacitor } from "@capacitor/core";
import { StripeTerminal } from "capacitor-stripe-terminal";
import { supabase } from "@/integrations/supabase/client";
import {
  createStripePaymentIntent,
  fetchStoreFinancialProfile,
  markOrderPaidAtCounter,
} from "@/services/orderService";
import { getStripePublishableKeyForEnvironment } from "@/lib/stripePublishableKey";
import { normalizeOptionalEmail } from "@/lib/emailValidation";

export type TapToPayStep =
  | "idle"
  | "connecting"
  | "waiting_card"
  | "processing"
  | "success"
  | "error";

export function isTapToPayPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function fetchTerminalConnectionToken(storeId: string): Promise<{
  secret: string;
  stripeConnectAccountId: string | null;
  stripeTerminalLocationId: string | null;
}> {
  const { data, error } = await supabase.functions.invoke("stripe-terminal-connection-token", {
    body: { storeId },
  });
  if (error) throw new Error(error.message || "Falha ao ligar ao Terminal");
  if (data?.error) throw new Error(data.error);
  return data as {
    secret: string;
    stripeConnectAccountId: string | null;
    stripeTerminalLocationId: string | null;
  };
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

  const support = await StripeTerminal.isTapToPaySupported();
  if (!support.supported) {
    throw new Error("Este iPhone não suporta Tap to Pay (requer iOS 15.4+).");
  }

  params.onStep?.("connecting", "A preparar leitor…");

  const [tokenPayload, profile] = await Promise.all([
    fetchTerminalConnectionToken(params.storeId),
    fetchStoreFinancialProfile(params.storeId),
  ]);

  const locationId = tokenPayload.stripeTerminalLocationId ?? profile?.stripe_terminal_location_id;
  const connectAccountId = tokenPayload.stripeConnectAccountId ?? profile?.stripe_connect_account_id;

  if (!locationId?.trim()) {
    throw new Error(
      "Falta configurar o local Stripe Terminal da loja (Dashboard Stripe → Terminal → Locations).",
    );
  }
  if (!connectAccountId?.trim()) {
    throw new Error("Recebimentos Stripe ainda não estão activos para esta loja.");
  }

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

  const env = pi.connectEnvironment ?? profile?.stripe_connect_environment ?? "live";
  const publishableKey =
    pi.publishableKey ?? getStripePublishableKeyForEnvironment(env === "test" ? "test" : "live");
  if (!publishableKey) {
    throw new Error("Chave pública Stripe em falta.");
  }

  params.onStep?.("waiting_card", "Aproxime o cartão ou telemóvel do cliente…");

  const simulated = profile?.stripe_connect_test_simulated === true || env === "test";

  const result = await StripeTerminal.processTapToPayPayment({
    publishableKey,
    connectionToken: tokenPayload.secret,
    locationId: locationId.trim(),
    onBehalfOf: connectAccountId.trim(),
    clientSecret: pi.clientSecret,
    simulated,
  });

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
    await StripeTerminal.disconnectReader();
  } catch {
    /* ignore */
  }
}
