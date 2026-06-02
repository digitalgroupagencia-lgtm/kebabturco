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
  if (!opsFlag(settings, "pay_cash_enabled", true)) return false;
  if (orderType === "here") return opsFlag(settings, "pay_cash_dine_in", true);
  if (orderType === "takeaway") return opsFlag(settings, "pay_cash_takeaway", true);
  if (orderType === "delivery") return opsFlag(settings, "pay_cash_delivery", false);
  return false;
}

/** Cartão listado no checkout (chave publicável). Pagamento efectivo exige stripeReady. */
export function cardListedInCheckout(input: PaymentPolicyInput): boolean {
  const { settings, stripePublishableKey } = input;
  return stripePublishableKey && opsFlag(settings, "pay_card_enabled", true);
}

/** Métodos disponíveis no checkout conforme tipo de pedido e configuração. */
export function resolveCheckoutMethods(input: PaymentPolicyInput): PaymentMethodId[] {
  const { orderType, mesaValidated, settings } = input;
  const cardVisible = cardListedInCheckout(input);

  if (orderType === "here") {
    if (!mesaValidated) return [];
    const methods: PaymentMethodId[] = [];
    if (cardVisible) methods.push("card");
    if (opsFlag(settings, "pay_cash_dine_in", true)) methods.push("cash");
    if (opsFlag(settings, "pay_counter_enabled", false)) methods.push("counter");
    return methods;
  }

  const methods: PaymentMethodId[] = [];
  if (cardVisible) methods.push("card");

  if (cashAllowedForOrderType(orderType, settings)) {
    methods.push("cash");
  }

  if (orderType === "delivery") {
    return methods;
  }

  return methods;
}

export function requiresPrepayment(
  orderType: CustomerOrderType,
  settings: OperationsSettings | null,
): boolean {
  if (orderType === "takeaway") return false;
  if (orderType === "delivery") return opsFlag(settings, "require_prepayment_delivery", true);
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
  return selected === "card" || selected === null;
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
  if (!stripeReady) {
    return "Pagamentos online ainda não activos — complete os dados bancários em Recebimentos.";
  }
  return null;
}

/** Mensagem para o painel admin (mais detalhada). */
export function stripeAdminConfigIssue(
  stripeReady: boolean,
  hasPublishableKey: boolean,
): { message: string; action: string } | null {
  if (!hasPublishableKey) {
    return {
      message: "Chave pública da Stripe em falta no site publicado.",
      action: "Sync + Publish na Lovable. A chave publicável já está incluída no projecto Kebab Turco.",
    };
  }
  if (!stripeReady) {
    return {
      message: "Conta Stripe do restaurante incompleta.",
      action: "Admin → Recebimentos → Conectar recebimentos do restaurante.",
    };
  }
  return null;
}
