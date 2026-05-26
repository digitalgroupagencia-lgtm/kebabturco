import { describe, expect, it } from "vitest";
import {
  isPanelOperationalPath,
  redirectTargetForPanelPath,
} from "./panelAccess";
import { nav } from "./navPaths.ts";

describe("redirectTargetForPanelPath", () => {
  it("never redirects admin_master away from restaurant panel routes", () => {
    const paths = [
      nav.panel(),
      nav.panel("menu"),
      nav.panel("finance"),
      nav.panel("settings"),
      nav.panel("cashier"),
      nav.panel("tables"),
      nav.panel("modifiers"),
      nav.panel("branding"),
    ];

    for (const path of paths) {
      expect(redirectTargetForPanelPath(path, "admin_master")).toBeNull();
    }
  });

  it("keeps operational panel paths for restaurant admin", () => {
    expect(redirectTargetForPanelPath(nav.panel("menu"), "restaurant_admin")).toBeNull();
    expect(redirectTargetForPanelPath(nav.panel(), "restaurant_admin")).toBeNull();
  });

  it("never redirects restaurant menu/finance/settings for any role", () => {
    for (const role of ["admin_master", "restaurant_admin", "operator"] as const) {
      expect(redirectTargetForPanelPath(nav.panel("menu"), role)).toBeNull();
      expect(redirectTargetForPanelPath(nav.panel("finance"), role)).toBeNull();
      expect(redirectTargetForPanelPath(nav.panel("settings"), role)).toBeNull();
    }
  });

  it("treats /panel/menu as operational", () => {
    expect(isPanelOperationalPath(nav.panel("menu"))).toBe(true);
  });
});
