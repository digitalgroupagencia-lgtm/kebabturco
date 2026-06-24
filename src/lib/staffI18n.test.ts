import { describe, expect, it } from "vitest";
import { staffT } from "@/lib/staffI18n";
import { panelT } from "@/lib/staffPanelLocale";
import { getRestaurantGuideSections } from "@/lib/restaurantGuideByLang";

describe("staffI18n", () => {
  it("returns Spanish by default for nav keys", () => {
    expect(staffT("es", "nav.live")).toBe("Pedidos en vivo");
    expect(staffT("en", "nav.live")).toBe("Live orders");
    expect(staffT("pt", "nav.live")).toBe("Pedidos ao vivo");
  });

  it("interpolates panelT variables", () => {
    expect(panelT("en", "old_pending.confirm", { number: "42" })).toBe(
      "Cancel order #42? This cannot be undone.",
    );
  });

  it("provides cashier how-to in all languages", () => {
    expect(staffT("es", "howto.cashier.purpose")).toMatch(/caja/i);
    expect(staffT("en", "howto.cashier.purpose")).toMatch(/register/i);
    expect(staffT("pt", "howto.cashier.purpose")).toMatch(/caixa/i);
  });

  it("switches restaurant guide content by language", () => {
    expect(getRestaurantGuideSections("es")[0]?.title).toBe("Primeros pasos");
    expect(getRestaurantGuideSections("en")[0]?.title).toBe("Getting started");
    expect(getRestaurantGuideSections("pt")[0]?.title).toBe("Primeiros passos");
  });
});
