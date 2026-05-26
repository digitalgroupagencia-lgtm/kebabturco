import { describe, expect, it } from "vitest";
import { resolveStaffLoginDestination } from "@/lib/staffLogin";
import { nav } from "@/lib/navPaths";

describe("resolveStaffLoginDestination", () => {
  it("routes delivery to delivery panel", () => {
    expect(resolveStaffLoginDestination("delivery")).toBe(nav.delivery());
  });

  it("routes kitchen to live orders", () => {
    expect(resolveStaffLoginDestination("kitchen")).toBe(nav.panel("live"));
  });

  it("routes cashier to cashier page", () => {
    expect(resolveStaffLoginDestination("cashier")).toBe(nav.panel("cashier"));
  });

  it("routes manager to dashboard", () => {
    expect(resolveStaffLoginDestination("manager")).toBe(nav.panel("dashboard"));
  });
});
