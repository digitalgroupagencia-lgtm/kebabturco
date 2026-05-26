import { describe, expect, it } from "vitest";
import {
  PLATFORM_FEE_EUR,
  computeCustomerTotalEur,
  computeOnlineServiceFeeEur,
  computeRestaurantPortionEur,
} from "./processingFee";

describe("online service fee (checkout)", () => {
  it("restaurant portion is subtotal + delivery - discount", () => {
    expect(computeRestaurantPortionEur(18, 2, 0)).toBe(20);
    expect(computeRestaurantPortionEur(25, 0, 5)).toBe(20);
  });

  it("service fee includes €1 platform + stripe estimate on €20 order", () => {
    const fee = computeOnlineServiceFeeEur(20);
    expect(fee).toBeGreaterThan(PLATFORM_FEE_EUR);
    expect(fee).toBeLessThan(PLATFORM_FEE_EUR + 0.8);
    expect(computeCustomerTotalEur(20)).toBeCloseTo(20 + fee, 2);
  });

  it("customer total equals restaurant portion + service fee", () => {
    const portion = 15.5;
    const total = computeCustomerTotalEur(portion);
    const fee = computeOnlineServiceFeeEur(portion);
    expect(total).toBeCloseTo(portion + fee, 2);
  });
});
