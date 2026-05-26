import { describe, expect, it } from "vitest";
import { requiresPrepayment, resolveCheckoutMethods, shouldPrintAfterCheckout } from "./paymentPolicy";

const baseSettings = {
  pay_card_enabled: true,
  pay_cash_dine_in: true,
  pay_cash_takeaway: false,
  pay_cash_delivery: false,
  pay_counter_enabled: false,
  require_prepayment_takeaway: true,
  require_prepayment_delivery: true,
  print_pending_dine_in: true,
} as any;

describe("paymentPolicy", () => {
  it("takeaway default: cartão e dinheiro, sem delivery dinheiro", () => {
    const methods = resolveCheckoutMethods({
      orderType: "takeaway",
      mesaValidated: false,
      settings: baseSettings,
      stripeReady: true,
      stripePublishableKey: true,
    });
    expect(methods).toEqual(["card", "cash"]);
    expect(resolveCheckoutMethods({
      orderType: "delivery",
      mesaValidated: false,
      settings: { ...baseSettings, pay_cash_delivery: true },
      stripeReady: true,
      stripePublishableKey: true,
    })).toEqual(["card"]);
  });

  it("mesa sem QR validado: nenhum método", () => {
    expect(
      resolveCheckoutMethods({
        orderType: "here",
        mesaValidated: false,
        settings: baseSettings,
        stripeReady: true,
        stripePublishableKey: true,
      }),
    ).toEqual([]);
  });

  it("mesa validada: dinheiro e cartão", () => {
    const methods = resolveCheckoutMethods({
      orderType: "here",
      mesaValidated: true,
      settings: baseSettings,
      stripeReady: true,
      stripePublishableKey: true,
    });
    expect(methods).toContain("cash");
    expect(methods).toContain("card");
  });

  it("prepayment default: balcão não exige online; delivery exige", () => {
    expect(requiresPrepayment("takeaway", baseSettings)).toBe(false);
    expect(requiresPrepayment("delivery", baseSettings)).toBe(true);
    expect(requiresPrepayment("here", baseSettings)).toBe(false);
  });

  it("não imprime takeaway pendente; imprime mesa validada pendente", () => {
    expect(shouldPrintAfterCheckout("takeaway", "pending", baseSettings, false)).toBe(false);
    expect(shouldPrintAfterCheckout("here", "pending", baseSettings, true)).toBe(true);
    expect(shouldPrintAfterCheckout("takeaway", "paid", baseSettings, false)).toBe(true);
  });
});
