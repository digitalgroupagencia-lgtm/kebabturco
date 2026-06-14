import { describe, expect, it } from "vitest";
import { buildFinanceAnalytics } from "@/services/financeAnalyticsService";
import type { FinanceMovement } from "@/services/restaurantFinanceService";

function payment(overrides: Partial<FinanceMovement> & { createdAt: string }): FinanceMovement {
  return {
    id: "1",
    kind: "payment",
    title: "Pedido",
    orderNumber: "100",
    customerPaidCents: 450,
    serviceFeeCents: 100,
    youReceiveCents: 350,
    paymentMethod: "card",
    ...overrides,
  };
}

describe("buildFinanceAnalytics", () => {
  it("agrupa volume por método de pagamento", () => {
    const analytics = buildFinanceAnalytics([
      payment({ id: "a", paymentMethod: "card", customerPaidCents: 1000, createdAt: new Date().toISOString() }),
      payment({ id: "b", paymentMethod: "bizum", customerPaidCents: 500, createdAt: new Date().toISOString() }),
    ]);
    expect(analytics.byMethod).toHaveLength(2);
    expect(analytics.byMethod[0]?.key).toBe("card");
    expect(analytics.byMethod[0]?.volumeCents).toBe(1000);
    expect(analytics.byMethod[1]?.key).toBe("bizum");
  });

  it("calcula totais do dia", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const analytics = buildFinanceAnalytics([
      payment({ id: "a", customerPaidCents: 800, serviceFeeCents: 100, youReceiveCents: 700, createdAt: today.toISOString() }),
    ]);
    expect(analytics.today.grossCents).toBe(800);
    expect(analytics.today.feesCents).toBe(100);
    expect(analytics.today.netCents).toBe(700);
    expect(analytics.today.count).toBe(1);
  });
});
