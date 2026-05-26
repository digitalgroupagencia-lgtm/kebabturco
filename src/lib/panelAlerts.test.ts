import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/deployDebugLog", () => ({
  deployDebugLog: vi.fn(),
}));

import {
  acknowledgePendingOrderAlert,
  countUnacknowledgedPendingOrders,
  isPendingOrderAlerting,
  registerNewPendingOrderAlert,
  silenceAllPendingAlerts,
  setPanelAlertsEnabled,
} from "./panelAlerts";

describe("panelAlerts pending order tracking", () => {
  beforeEach(() => {
    silenceAllPendingAlerts();
    setPanelAlertsEnabled(false);
  });

  it("tracks each new pending order separately", () => {
    registerNewPendingOrderAlert("order-a");
    registerNewPendingOrderAlert("order-b");
    expect(countUnacknowledgedPendingOrders()).toBe(2);
    expect(isPendingOrderAlerting("order-a")).toBe(true);
    expect(isPendingOrderAlerting("order-b")).toBe(true);
  });

  it("does not duplicate the same order id", () => {
    registerNewPendingOrderAlert("order-a");
    registerNewPendingOrderAlert("order-a");
    expect(countUnacknowledgedPendingOrders()).toBe(1);
  });

  it("clears alert for one order when acknowledged", () => {
    registerNewPendingOrderAlert("order-a");
    registerNewPendingOrderAlert("order-b");
    acknowledgePendingOrderAlert("order-a");
    expect(isPendingOrderAlerting("order-a")).toBe(false);
    expect(isPendingOrderAlerting("order-b")).toBe(true);
    expect(countUnacknowledgedPendingOrders()).toBe(1);
  });

  it("silences all pending alerts at once", () => {
    registerNewPendingOrderAlert("order-a");
    registerNewPendingOrderAlert("order-b");
    silenceAllPendingAlerts();
    expect(countUnacknowledgedPendingOrders()).toBe(0);
  });
});
