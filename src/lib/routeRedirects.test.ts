import { describe, expect, it } from "vitest";
import { resolveLegacyRouteRedirect } from "./routeRedirects";

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
    expect(resolveLegacyRouteRedirect("/panel/menu")).toBe("/admin/menu");
    expect(resolveLegacyRouteRedirect("/panel/finance")).toBe("/admin/finance");
  });

  it("returns null for canonical routes", () => {
    expect(resolveLegacyRouteRedirect("/panel")).toBeNull();
    expect(resolveLegacyRouteRedirect("/admin/finance")).toBeNull();
    expect(resolveLegacyRouteRedirect("/")).toBeNull();
  });
});
