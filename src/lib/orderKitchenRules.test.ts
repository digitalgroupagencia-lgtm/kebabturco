import { describe, expect, it } from "vitest";
import {
  blocksOperationalProgressUntilPaid,
  isAwaitingCounterPaymentConfirmation,
  isAwaitingOnlinePaymentConfirmation,
  isConfirmedPaidOrder,
  orderReadyForKitchen,
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

  it("hides unpaid seller orders until payment is confirmed", () => {
    const sellerPending = {
      order_type: "takeaway",
      payment_status: "pending",
      seller_id: "seller-uuid",
      status: "pending",
    };
    expect(shouldShowOrderInRestaurantPanel(sellerPending)).toBe(false);
    expect(orderReadyForKitchen(sellerPending)).toBe(false);
    expect(isAwaitingCounterPaymentConfirmation(sellerPending)).toBe(false);
  });

  it("shows seller orders after payment confirmed", () => {
    const sellerPaid = {
      order_type: "takeaway",
      payment_status: "paid",
      seller_id: "seller-uuid",
      status: "pending",
    };
    expect(shouldShowOrderInRestaurantPanel(sellerPaid)).toBe(true);
    expect(orderReadyForKitchen(sellerPaid)).toBe(true);
  });
});
