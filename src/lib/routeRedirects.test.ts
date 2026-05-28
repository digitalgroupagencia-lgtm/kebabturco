import { describe, expect, it } from "vitest";
import { resolveAdminRestaurantPanelAlias, resolveCustomerRouteRedirect, resolveLegacyRouteRedirect } from "./routeRedirects";

describe("resolveLegacyRouteRedirect", () => {
  it("resolves /admin/panel aliases as restaurant panel without legacy navigation", () => {
    expect(resolveLegacyRouteRedirect("/admin/panel")).toBeNull();
    expect(resolveAdminRestaurantPanelAlias("/admin/panel")).toBe("/panel");
  });

  it("resolves /admin/orders to /panel", () => {
    expect(resolveLegacyRouteRedirect("/admin/orders")).toBeNull();
    expect(resolveAdminRestaurantPanelAlias("/admin/orders")).toBe("/panel");
  });

  it("resolves /admin/qrcodes to tables QR page", () => {
    expect(resolveAdminRestaurantPanelAlias("/admin/qrcodes")).toBe("/panel/tables");
  });

  it("redirects legacy panel config paths to admin", () => {
    expect(resolveLegacyRouteRedirect("/panel/modifiers")).toBe("/admin/modifiers");
    expect(resolveLegacyRouteRedirect("/panel/branding")).toBe("/admin/branding");
  });

  it("keeps restaurant-admin paths inside the restaurant panel", () => {
    expect(resolveAdminRestaurantPanelAlias("/admin/menu")).toBeNull();
    expect(resolveAdminRestaurantPanelAlias("/admin/finance")).toBeNull();
    expect(resolveAdminRestaurantPanelAlias("/admin/settings")).toBe("/panel/settings");
    expect(resolveLegacyRouteRedirect("/panel/menu")).toBe("/admin/menu");
    expect(resolveLegacyRouteRedirect("/panel/finance")).toBeNull();
  });

  it("returns null for canonical routes", () => {
    expect(resolveLegacyRouteRedirect("/panel")).toBeNull();
    expect(resolveLegacyRouteRedirect("/admin/routes")).toBeNull();
    expect(resolveLegacyRouteRedirect("/")).toBeNull();
  });

  it("redirects public customer aliases to the customer app with screen query", () => {
    expect(resolveCustomerRouteRedirect("/menu")).toEqual({ pathname: "/", search: "?screen=home" });
    expect(resolveCustomerRouteRedirect("/checkout", "?order=abc")).toEqual({ pathname: "/", search: "?order=abc&screen=payment" });
    expect(resolveCustomerRouteRedirect("/meus-pedidos")).toEqual({ pathname: "/", search: "?screen=account" });
  });
});
