import { describe, expect, it } from "vitest";
import {
  PLATFORM_FEE_EUR,
  PLATFORM_FEE_SMALL_EUR,
  computeCustomerTotalEur,
  computePlatformDeductionEur,
  computePlatformFeeEur,
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

  it("platform fee is €0.50 below €10 and €1 from €10", () => {
    expect(computePlatformFeeEur(4.5)).toBe(PLATFORM_FEE_SMALL_EUR);
    expect(computePlatformFeeEur(9.99)).toBe(PLATFORM_FEE_SMALL_EUR);
    expect(computePlatformFeeEur(10)).toBe(PLATFORM_FEE_EUR);
    expect(computePlatformFeeEur(20)).toBe(PLATFORM_FEE_EUR);
  });

  it("platform deduction includes tiered platform fee + stripe estimate", () => {
    const small = computePlatformDeductionEur(5.5);
    expect(small).toBeGreaterThan(PLATFORM_FEE_SMALL_EUR);
    expect(small).toBeLessThan(PLATFORM_FEE_SMALL_EUR + 0.5);

    const large = computePlatformDeductionEur(20);
    expect(large).toBeGreaterThan(PLATFORM_FEE_EUR);
    expect(large).toBeLessThan(PLATFORM_FEE_EUR + 0.8);
    expect(20 - large).toBeGreaterThan(18);
  });

  it("€50 order: €2.00 retained, restaurant net €48.00 (Stripe-confirmed formula)", () => {
    expect(computePlatformDeductionEur(50)).toBe(2);
    expect(computeCustomerTotalEur(50)).toBe(50);
    expect(50 - computePlatformDeductionEur(50)).toBe(48);
  });
});
