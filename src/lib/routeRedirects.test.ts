import { describe, expect, it } from "vitest";
import { resolveCustomerRouteRedirect, resolveLegacyRouteRedirect } from "./routeRedirects";

describe("resolveLegacyRouteRedirect", () => {
  it("redirects /admin/panel to restaurant orders panel", () => {
    expect(resolveLegacyRouteRedirect("/admin/panel")).toBe("/panel");
  });

  it("redirects /admin/orders to /panel", () => {
    expect(resolveLegacyRouteRedirect("/admin/orders")).toBe("/panel");
  });

  it("redirects /admin/qrcodes to tables QR page", () => {
    expect(resolveLegacyRouteRedirect("/admin/qrcodes")).toBe("/panel/tables");
  });

  it("redirects legacy panel config paths to admin", () => {
    expect(resolveLegacyRouteRedirect("/panel/modifiers")).toBe("/admin/modifiers");
    expect(resolveLegacyRouteRedirect("/panel/branding")).toBe("/admin/branding");
  });

  it("keeps restaurant-admin paths inside the restaurant panel", () => {
    expect(resolveLegacyRouteRedirect("/admin/menu")).toBe("/panel/menu");
    expect(resolveLegacyRouteRedirect("/admin/finance")).toBe("/panel/finance");
    expect(resolveLegacyRouteRedirect("/admin/settings")).toBe("/panel/settings");
    expect(resolveLegacyRouteRedirect("/panel/menu")).toBeNull();
    expect(resolveLegacyRouteRedirect("/panel/finance")).toBeNull();
  });

  it("returns null for canonical routes", () => {
    expect(resolveLegacyRouteRedirect("/panel")).toBeNull();
    expect(resolveLegacyRouteRedirect("/admin/finance")).toBeNull();
    expect(resolveLegacyRouteRedirect("/")).toBeNull();
  });

  it("redirects public customer aliases to the customer app with screen query", () => {
    expect(resolveCustomerRouteRedirect("/menu")).toEqual({ pathname: "/", search: "?screen=home" });
    expect(resolveCustomerRouteRedirect("/checkout", "?order=abc")).toEqual({ pathname: "/", search: "?order=abc&screen=payment" });
    expect(resolveCustomerRouteRedirect("/meus-pedidos")).toEqual({ pathname: "/", search: "?screen=account" });
  });
});
