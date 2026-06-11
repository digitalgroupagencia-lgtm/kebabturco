import { describe, expect, it } from "vitest";
import {
  PLATFORM_FEE_EUR,
  computeCustomerTotalEur,
  computePlatformDeductionEur,
  computeRestaurantPortionEur,
} from "./processingFee";

describe("checkout fees", () => {
  it("restaurant portion is subtotal + delivery - discount", () => {
    expect(computeRestaurantPortionEur(18, 2, 0)).toBe(20);
    expect(computeRestaurantPortionEur(25, 0, 5)).toBe(20);
  });

  it("customer pays only restaurant portion (no extra fee line)", () => {
    expect(computeCustomerTotalEur(20)).toBe(20);
    expect(computeCustomerTotalEur(15.5)).toBe(15.5);
  });

  it("platform deduction includes €1 + stripe estimate from restaurant portion", () => {
    const fee = computePlatformDeductionEur(20);
    expect(fee).toBeGreaterThan(PLATFORM_FEE_EUR);
    expect(fee).toBeLessThan(PLATFORM_FEE_EUR + 0.8);
    expect(20 - fee).toBeGreaterThan(18);
  });

  it("€50 order: €2.00 retained, restaurant net €48.00 (Stripe-confirmed formula)", () => {
    expect(computePlatformDeductionEur(50)).toBe(2);
    expect(computeCustomerTotalEur(50)).toBe(50);
    expect(50 - computePlatformDeductionEur(50)).toBe(48);
  });
});
