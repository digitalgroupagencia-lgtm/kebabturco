import { describe, expect, it } from "vitest";
import {
  canAccessDeliveryPanel,
  canAssignDeliveryDriver,
  canManageTeam,
  panelSegmentAllowed,
  primaryAppAreaForRole,
  STAFF_ROLE_LABELS,
} from "./staffPermissions";

describe("staffPermissions", () => {
  it("routes delivery role to delivery area", () => {
    expect(primaryAppAreaForRole("delivery")).toBe("delivery");
    expect(canAccessDeliveryPanel("delivery")).toBe(true);
  });

  it("restricts kitchen to orders only", () => {
    expect(panelSegmentAllowed("kitchen", "")).toBe(true);
    expect(panelSegmentAllowed("kitchen", "finance")).toBe(false);
    expect(panelSegmentAllowed("kitchen", "menu")).toBe(false);
  });

  it("allows manager full panel access", () => {
    expect(panelSegmentAllowed("manager", "team")).toBe(true);
    expect(canManageTeam("manager")).toBe(true);
  });

  it("allows assign driver for operational roles", () => {
    expect(canAssignDeliveryDriver("operator")).toBe(true);
    expect(canAssignDeliveryDriver("kitchen")).toBe(false);
    expect(canAssignDeliveryDriver("delivery")).toBe(false);
  });

  it("allows cashier live orders and cashier screen", () => {
    expect(panelSegmentAllowed("cashier", "live")).toBe(true);
    expect(panelSegmentAllowed("cashier", "cashier")).toBe(true);
    expect(panelSegmentAllowed("cashier", "finance")).toBe(false);
  });

  it("has labels for all staff roles", () => {
    expect(STAFF_ROLE_LABELS.delivery).toBe("Entregador");
    expect(STAFF_ROLE_LABELS.manager).toBe("Gerente");
  });
});
