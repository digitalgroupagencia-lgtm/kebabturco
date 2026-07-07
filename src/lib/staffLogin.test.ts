import { describe, expect, it } from "vitest";
import {
  resolveStaffLoginDestination,
  shouldRedirectRootToStaffPanel,
  shouldAdminMasterStartAsCustomer,
  markAdminStaffAreaEntry,
  clearAdminStaffAreaEntry,
} from "@/lib/staffLogin";
import { nav } from "@/lib/navPaths";

describe("shouldRedirectRootToStaffPanel", () => {
  it("does not redirect logged-in admins without staff tablet session", () => {
    expect(
      shouldRedirectRootToStaffPanel({ pathname: "/", staffSessionFlag: false, hasUser: true }),
    ).toBe(false);
  });

  it("does not redirect admin geral even with staff tablet session", () => {
    expect(
      shouldRedirectRootToStaffPanel({
        pathname: "/",
        staffSessionFlag: true,
        hasUser: true,
        role: "admin_master",
      }),
    ).toBe(false);
  });

  it("redirects staff tablet session on root", () => {
    expect(
      shouldRedirectRootToStaffPanel({ pathname: "/", staffSessionFlag: true, hasUser: true }),
    ).toBe(true);
  });

  it("ignores non-root paths", () => {
    expect(
      shouldRedirectRootToStaffPanel({ pathname: "/admin", staffSessionFlag: true, hasUser: true }),
    ).toBe(false);
  });

  it("allows demo visit customer flow on root", () => {
    expect(
      shouldRedirectRootToStaffPanel({
        pathname: "/",
        staffSessionFlag: true,
        hasUser: true,
        search: "?screen=home&demo_visita=1",
      }),
    ).toBe(false);
  });
});

describe("shouldAdminMasterStartAsCustomer", () => {
  it("admin geral reopens as customer on staff paths without session entry", () => {
    expect(
      shouldAdminMasterStartAsCustomer({ pathname: "/admin", role: "admin_master" }),
    ).toBe(true);
    expect(
      shouldAdminMasterStartAsCustomer({ pathname: "/panel/live", role: "admin_master" }),
    ).toBe(true);
  });

  it("admin geral stays on staff path when session entry is marked", () => {
    markAdminStaffAreaEntry();
    expect(
      shouldAdminMasterStartAsCustomer({ pathname: "/admin", role: "admin_master" }),
    ).toBe(false);
    clearAdminStaffAreaEntry();
  });
});

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
