import { describe, expect, it } from "vitest";
import {
  collectMenuCatalogFields,
  collectTranslationSources,
  menuItemNeedsTranslation,
} from "./menuLocale";

describe("menuLocale", () => {
  it("detects missing target language on localized menu fields", () => {
    const name = { es: "Pan de pita", pt: "Pão de pita" };
    expect(menuItemNeedsTranslation(name, "en", "es")).toBe(true);
    expect(menuItemNeedsTranslation(name, "es", "es")).toBe(false);
    expect(menuItemNeedsTranslation({ es: "Pan", en: "Pita bread" }, "en", "es")).toBe(false);
  });

  it("collects source strings only when translation is needed", () => {
    const sources = collectTranslationSources(
      [{ es: "Pollo" }, { es: "Chicken", en: "Chicken" }],
      "es",
      "en",
    );
    expect(sources).toEqual(["Pollo"]);
  });

  it("collects product and category fields from menu catalog", () => {
    const fields = collectMenuCatalogFields(
      [{ id: "c1", name: { es: "Kebabs" }, image: "", icon: "" } as never],
      [
        {
          id: "p1",
          name: { es: "Menu 1" },
          description: { es: "Con patatas" },
          price: 5,
          image: "",
          category: "c1",
          isBestseller: false,
          isPromo: false,
          extras: [{ id: "e1", name: { es: "Extra queso" }, price: 1 }],
        } as never,
      ],
    );
    expect(fields.length).toBeGreaterThanOrEqual(4);
  });
});
