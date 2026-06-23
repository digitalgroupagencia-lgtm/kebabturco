import { describe, expect, it } from "vitest";
import { requiresPrepayment, resolveCheckoutMethods, shouldPrintAfterCheckout } from "./paymentPolicy";

const baseSettings = {
  pay_card_enabled: true,
  pay_bizum_enabled: true,
  pay_cash_enabled: true,
  pay_cash_dine_in: true,
  pay_cash_takeaway: false,
  pay_cash_delivery: false,
  pay_counter_enabled: false,
  require_prepayment_takeaway: true,
  require_prepayment_delivery: true,
  print_pending_dine_in: true,
} as any;

describe("paymentPolicy", () => {
  it("takeaway: dinheiro por defeito; cartão continua visível em modo teste", () => {
    expect(
      resolveCheckoutMethods({
        orderType: "takeaway",
        mesaValidated: false,
        settings: null,
        stripeReady: false,
        stripePublishableKey: true,
      }),
    ).toEqual(["bizum", "card", "cash"]);
    expect(
      resolveCheckoutMethods({
        orderType: "takeaway",
        mesaValidated: false,
        settings: null,
        stripeReady: true,
        stripePublishableKey: true,
      }),
    ).toEqual(["bizum", "card", "cash"]);
  });

  it("takeaway: dinheiro desactivado só se flag explícita; delivery sem dinheiro", () => {
    expect(
      resolveCheckoutMethods({
        orderType: "takeaway",
        mesaValidated: false,
        settings: baseSettings,
        stripeReady: true,
        stripePublishableKey: true,
      }),
    ).toEqual(["bizum", "card"]);
    expect(
      resolveCheckoutMethods({
        orderType: "takeaway",
        mesaValidated: false,
        settings: { ...baseSettings, pay_cash_takeaway: true, require_prepayment_takeaway: false },
        stripeReady: true,
        stripePublishableKey: true,
      }),
    ).toEqual(["bizum", "card", "cash"]);
    expect(
      resolveCheckoutMethods({
        orderType: "delivery",
        mesaValidated: false,
        settings: baseSettings,
        stripeReady: true,
        stripePublishableKey: true,
      }),
    ).toEqual(["bizum", "card"]);
    expect(
      resolveCheckoutMethods({
        orderType: "delivery",
        mesaValidated: false,
        settings: { ...baseSettings, pay_cash_delivery: true, require_prepayment_delivery: false },
        stripeReady: true,
        stripePublishableKey: true,
      }),
    ).toEqual(["bizum", "card", "cash"]);
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

  it("bizum desactivado: só cartão online", () => {
    expect(
      resolveCheckoutMethods({
        orderType: "takeaway",
        mesaValidated: false,
        settings: { ...baseSettings, pay_bizum_enabled: false },
        stripeReady: true,
        stripePublishableKey: true,
      }),
    ).toEqual(["card"]);
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
    expect(methods).toContain("bizum");
  });

  it("prepayment: takeaway e delivery respeitam flags; mesa não exige online", () => {
    expect(requiresPrepayment("takeaway", baseSettings)).toBe(true);
    expect(requiresPrepayment("takeaway", { ...baseSettings, require_prepayment_takeaway: false })).toBe(false);
    expect(requiresPrepayment("delivery", baseSettings)).toBe(true);
    expect(requiresPrepayment("here", baseSettings)).toBe(false);
  });

  it("takeaway com pré-pagamento obrigatório: sem dinheiro no checkout", () => {
    expect(
      resolveCheckoutMethods({
        orderType: "takeaway",
        mesaValidated: false,
        settings: { ...baseSettings, pay_cash_takeaway: true, require_prepayment_takeaway: true },
        stripeReady: true,
        stripePublishableKey: true,
      }),
    ).toEqual(["bizum", "card"]);
  });

  it("não imprime takeaway pendente; imprime mesa validada pendente", () => {
    expect(shouldPrintAfterCheckout("takeaway", "pending", baseSettings, false)).toBe(false);
    expect(shouldPrintAfterCheckout("here", "pending", baseSettings, true)).toBe(true);
    expect(shouldPrintAfterCheckout("takeaway", "paid", baseSettings, false)).toBe(true);
  });
});
