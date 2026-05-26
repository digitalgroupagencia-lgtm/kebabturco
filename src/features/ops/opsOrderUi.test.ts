import { describe, expect, it } from "vitest";
import {
  ETA_QUICK_OPTIONS,
  getCompactActionLabel,
  orderItemCount,
  requiresEtaBeforeAccept,
  validateAcceptPrepMinutes,
} from "./opsOrderUi";
import type { PanelOrder } from "./usePanelOrders";

const baseOrder = {
  id: "1",
  order_number: 1,
  status: "pending",
  order_type: "takeaway",
  total: 10,
  created_at: new Date().toISOString(),
} as unknown as PanelOrder;

describe("opsOrderUi", () => {
  it("counts items by quantity", () => {
    expect(
      orderItemCount([
        { id: "a", quantity: 2 } as never,
        { id: "b", quantity: 1 } as never,
      ]),
    ).toBe(3);
  });

  it("requires ETA before accepting pending orders", () => {
    expect(requiresEtaBeforeAccept("pending", "preparing")).toBe(true);
    expect(requiresEtaBeforeAccept("preparing", "ready")).toBe(false);
  });

  it("validates prep minutes between 5 and 180", () => {
    expect(validateAcceptPrepMinutes(15)).toBe(true);
    expect(validateAcceptPrepMinutes(4)).toBe(false);
    expect(validateAcceptPrepMinutes(undefined)).toBe(false);
  });

  it("uses quick ETA options requested by operations", () => {
    expect(ETA_QUICK_OPTIONS).toEqual([10, 15, 20, 25, 30]);
  });

  it("blocks pending takeaway until payment is confirmed", () => {
    expect(getCompactActionLabel(baseOrder)).toBe(null);
    expect(getCompactActionLabel({ ...baseOrder, payment_status: "paid" } as PanelOrder)).toBe("Aceitar");
  });

  it("shows assign driver label for ready delivery orders", () => {
    expect(
      getCompactActionLabel({ ...baseOrder, status: "ready", order_type: "delivery" } as PanelOrder, "operator"),
    ).toBe("Atribuir entregador");
  });

  it("shows mark ready label for preparing orders", () => {
    expect(
      getCompactActionLabel({ ...baseOrder, status: "preparing" } as PanelOrder),
    ).toBe("Marcar pronto");
  });
});
