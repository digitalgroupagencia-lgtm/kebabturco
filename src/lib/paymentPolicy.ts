import type { PaymentMethodId } from "@/contexts/OrderContext";
import type { OperationsSettings } from "@/hooks/useOperationsSettings";

export type CustomerOrderType = "here" | "takeaway" | "delivery";

export type PaymentPolicyInput = {
  orderType: CustomerOrderType;
  mesaValidated: boolean;
  settings: OperationsSettings | null;
  stripeReady: boolean;
  stripePublishableKey: boolean;
};

function opsFlag(settings: OperationsSettings | null, key: string, fallback: boolean): boolean {
  if (!settings) return fallback;
  const v = (settings as Record<string, unknown>)[key];
  return typeof v === "boolean" ? v : fallback;
}

function cashAllowedForOrderType(
  orderType: CustomerOrderType,
  settings: OperationsSettings | null,
): boolean {
  if (orderType === "here") return opsFlag(settings, "pay_cash_dine_in", true);
  if (orderType === "takeaway") return opsFlag(settings, "pay_cash_takeaway", true);
  if (orderType === "delivery") return opsFlag(settings, "pay_cash_delivery", true);
  return false;
}

/** Cartão listado no checkout quando existe chave publicável (inclui modo teste). */
export function cardListedInCheckout(input: PaymentPolicyInput): boolean {
  const { settings, stripePublishableKey } = input;
  return stripePublishableKey && opsFlag(settings, "pay_card_enabled", true);
}

/** Bizum e cartão como opções online separadas (não embutidas no mesmo fluxo). */
function onlineCheckoutMethods(
  cardVisible: boolean,
  settings: OperationsSettings | null,
): PaymentMethodId[] {
  if (!cardVisible) return [];
  const methods: PaymentMethodId[] = [];
  if (opsFlag(settings, "pay_bizum_enabled", true)) methods.push("bizum");
  methods.push("card");
  return methods;
}

/** Métodos disponíveis no checkout conforme tipo de pedido e configuração. */
export function resolveCheckoutMethods(input: PaymentPolicyInput): PaymentMethodId[] {
  const { orderType, mesaValidated, settings } = input;
  const cardVisible = cardListedInCheckout(input);

  if (orderType === "here") {
    if (!mesaValidated) return [];
    const methods = onlineCheckoutMethods(cardVisible, settings);
    if (opsFlag(settings, "pay_cash_dine_in", true)) methods.push("cash");
    if (opsFlag(settings, "pay_counter_enabled", false)) methods.push("counter");
    return methods;
  }

  const methods = onlineCheckoutMethods(cardVisible, settings);

  if (cashAllowedForOrderType(orderType, settings) && !requiresPrepayment(orderType, settings)) {
    methods.push("cash");
  }

  return methods;
}

export function requiresPrepayment(
  orderType: CustomerOrderType,
  settings: OperationsSettings | null,
): boolean {
  if (orderType === "takeaway") {
    return opsFlag(settings, "require_prepayment_takeaway", false);
  }
  if (orderType === "delivery") return opsFlag(settings, "require_prepayment_delivery", false);
  return false;
}

export function mustPayOnlineBeforeSubmit(
  orderType: CustomerOrderType,
  selected: PaymentMethodId | null,
  settings: OperationsSettings | null,
  stripeReady: boolean,
): boolean {
  if (!requiresPrepayment(orderType, settings)) return false;
  if (!stripeReady) return false;
  return selected === "card" || selected === "bizum" || selected === null;
}

/** Impressão automática após checkout. */
export function shouldPrintAfterCheckout(
  orderType: CustomerOrderType,
  paymentStatus: "pending" | "paid",
  settings: OperationsSettings | null,
  mesaValidated: boolean,
): boolean {
  if (paymentStatus === "paid") return true;
  if (orderType === "here" && mesaValidated && opsFlag(settings, "print_pending_dine_in", true)) {
    return true;
  }
  return false;
}

export function stripeConfigIssue(stripeReady: boolean, hasPublishableKey: boolean): string | null {
  if (!hasPublishableKey) {
    return "Pagamento com cartão indisponível — peça ao administrador para configurar a Stripe no site.";
  }
  return null;
}

/** Mensagem para o painel admin (mais detalhada). */
export function stripeAdminConfigIssue(
  stripeReady: boolean,
  hasPublishableKey: boolean,
  setupHint?: { message: string; steps: string[] },
): { message: string; action: string } | null {
  if (!hasPublishableKey) {
    return {
      message: "Chave pública da Stripe em falta no site publicado.",
      action: "Sync + Publish na Lovable. A chave publicável já está incluída no projecto Kebab Turco.",
    };
  }
  if (!stripeReady) {
    const steps = setupHint?.steps?.length
      ? setupHint.steps.map((s, i) => `${i + 1}. ${s}`).join(" ")
      : "Admin → Recebimentos → Recriar conta Stripe → Sincronizar com Stripe.";
    return {
      message: setupHint?.message ?? "Conta Stripe do restaurante incompleta.",
      action: steps,
    };
  }
  return null;
}
