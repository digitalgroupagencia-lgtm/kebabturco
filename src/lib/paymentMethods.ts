import type { PaymentMethodId } from "@/contexts/OrderContext";

/** Métodos com integração real no totem (fase estabilização). */
const IMPLEMENTED: ReadonlySet<PaymentMethodId> = new Set(["card", "cash", "counter"]);

export function isPaymentMethodImplemented(
  method: PaymentMethodId,
  stripeChargesEnabled: boolean,
): boolean {
  if (!IMPLEMENTED.has(method)) return false;
  if (method === "card") return stripeChargesEnabled;
  return true;
}

export function filterImplementedPaymentMethods(
  methods: PaymentMethodId[],
  stripeChargesEnabled: boolean,
): PaymentMethodId[] {
  return methods.filter((id) => isPaymentMethodImplemented(id, stripeChargesEnabled));
}
