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

  it("restricts operator from config segments but keeps orders", () => {
    expect(redirectTargetForPanelPath(nav.panel("menu"), "operator")).toBe(nav.panel());
    expect(redirectTargetForPanelPath(nav.panel(), "operator")).toBeNull();
    expect(redirectTargetForPanelPath(nav.panel("cashier"), "operator")).toBeNull();
  });

  it("allows manager access to team and menu", () => {
    expect(redirectTargetForPanelPath(nav.panel("menu"), "manager")).toBeNull();
    expect(redirectTargetForPanelPath(nav.panel("team"), "manager")).toBeNull();
  });

  it("treats /panel/menu as operational", () => {
    expect(isPanelOperationalPath(nav.panel("menu"))).toBe(true);
  });
});
