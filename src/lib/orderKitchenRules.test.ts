import { describe, expect, it } from "vitest";
import {
  blocksOperationalProgressUntilPaid,
  isAwaitingCounterPaymentConfirmation,
  isAwaitingOnlinePaymentConfirmation,
  isConfirmedPaidOrder,
  isDemoVisitOrder,
  shouldShowOrderInRestaurantPanel,
} from "./orderKitchenRules";

describe("orderKitchenRules", () => {
  it("hides takeaway card/bizum orders until Stripe confirms payment", () => {
    const unpaidCard = {
      order_type: "takeaway",
      payment_status: "pending",
      payment_method: "card",
      stripe_payment_intent_id: "pi_123",
      status: "pending",
    };
    expect(isAwaitingOnlinePaymentConfirmation(unpaidCard)).toBe(true);
    expect(shouldShowOrderInRestaurantPanel(unpaidCard)).toBe(false);
    expect(isAwaitingCounterPaymentConfirmation(unpaidCard)).toBe(false);
    expect(blocksOperationalProgressUntilPaid(unpaidCard)).toBe(false);
  });

  it("shows cash takeaway waiting for counter confirmation", () => {
    const cash = {
      order_type: "takeaway",
      payment_status: "pending",
      payment_method: "cash",
      status: "pending",
    };
    expect(shouldShowOrderInRestaurantPanel(cash)).toBe(true);
    expect(isAwaitingCounterPaymentConfirmation(cash)).toBe(true);
    expect(blocksOperationalProgressUntilPaid(cash)).toBe(true);
  });

  it("counts only paid orders as confirmed revenue", () => {
    expect(isConfirmedPaidOrder({ payment_status: "paid" })).toBe(true);
    expect(isConfirmedPaidOrder({ payment_status: "pending" })).toBe(false);
  });

  it("shows paid online orders after Stripe confirmation", () => {
    const paidBizum = {
      order_type: "takeaway",
      payment_status: "paid",
      payment_method: "bizum",
      stripe_payment_intent_id: "pi_123",
      status: "pending",
    };
    expect(shouldShowOrderInRestaurantPanel(paidBizum)).toBe(true);
    expect(isAwaitingOnlinePaymentConfirmation(paidBizum)).toBe(false);
  });

  it("hides demo visit orders from restaurant panel", () => {
    const demo = {
      order_type: "takeaway",
      payment_status: "paid",
      payment_method: "counter",
      status: "pending",
      coupon_code: "DEMO-IMPRESSAO",
    };
    expect(isDemoVisitOrder(demo)).toBe(true);
    expect(shouldShowOrderInRestaurantPanel(demo)).toBe(false);
  });
});
