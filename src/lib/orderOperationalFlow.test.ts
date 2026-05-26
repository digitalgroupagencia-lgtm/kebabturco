import { describe, expect, it } from "vitest";
import {
  customerTrackingStepIndex,
  generateDeliveryConfirmationCode,
  getPanelOrderAction,
  isDeliveryOrder,
  panelColumnStatus,
  resolveOrderType,
} from "./orderOperationalFlow";

describe("orderOperationalFlow", () => {
  it("resolves order type from fields", () => {
    expect(resolveOrderType({ order_type: "delivery" })).toBe("delivery");
    expect(resolveOrderType({ delivery_street: "Rua A" })).toBe("delivery");
    expect(resolveOrderType({ table_number: "5" })).toBe("dine_in");
    expect(resolveOrderType({ order_type: "takeaway" })).toBe("takeaway");
  });

  it("maps legacy out_for_delivery to ready column", () => {
    expect(panelColumnStatus("out_for_delivery")).toBe("ready");
    expect(panelColumnStatus("preparing")).toBe("preparing");
  });

  it("generates 4-digit delivery codes", () => {
    const code = generateDeliveryConfirmationCode();
    expect(code).toMatch(/^\d{4}$/);
  });

  it("requires delivery code action for delivery at ready", () => {
    const action = getPanelOrderAction({ status: "ready", order_type: "delivery" });
    expect(action).toEqual({ kind: "delivery_code", label: "Confirmar entrega" });
  });

  it("allows direct delivery for counter orders at ready", () => {
    const action = getPanelOrderAction({ status: "ready", order_type: "takeaway" });
    expect(action).toEqual({ kind: "advance", next: "delivered", label: "Pedido entregue" });
  });

  it("requires ETA before accept for pending orders", () => {
    const action = getPanelOrderAction({ status: "pending", order_type: "takeaway" });
    expect(action).toEqual({ kind: "accept_eta", label: "Aceitar" });
  });

  it("tracks customer steps without separate out_for_delivery step", () => {
    expect(customerTrackingStepIndex("ready")).toBe(2);
    expect(customerTrackingStepIndex("out_for_delivery")).toBe(2);
    expect(customerTrackingStepIndex("delivered")).toBe(3);
  });

  it("detects delivery orders", () => {
    expect(isDeliveryOrder({ order_type: "delivery" })).toBe(true);
    expect(isDeliveryOrder({ order_type: "takeaway" })).toBe(false);
  });
});
