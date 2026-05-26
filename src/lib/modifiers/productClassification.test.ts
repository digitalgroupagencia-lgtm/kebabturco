import { describe, expect, it } from "vitest";
import type { MenuProduct } from "@/hooks/useMenuData";
import {
  descriptionIncludesDrink,
  normalizeProductClassification,
  resolveIsComboProduct,
} from "./productClassification";
import { synthesizeModifierConfigFromProduct } from "./synthesizeConfig";

const p = (name: string, desc = "", extra: Partial<MenuProduct> = {}): MenuProduct =>
  ({
    id: "test",
    name: { es: name, pt: name, en: name },
    description: { es: desc, pt: desc, en: desc },
    price: 10,
    image: "",
    category: "cat",
    categorySlug: "ofertas-combo",
    extras: [],
    ingredients: [],
    ...extra,
  }) as MenuProduct;

describe("product classification", () => {
  it("Combo 10 Piezas is combo with zero units from category", () => {
    const product = p("Combo 10 Piezas Pollo Crispy", "Incluye bebida 2L a elegir");
    expect(normalizeProductClassification(product)).toEqual({ productType: "combo", comboUnitCount: 0 });
    expect(resolveIsComboProduct(product)).toBe(true);
  });

  it("Combo 4 Pan Pita Mixto is multi-unit combo", () => {
    const product = p("Combo 4 Pan Pita Mixto", "", { productType: "combo", comboUnitCount: 4 });
    expect(normalizeProductClassification(product)).toEqual({ productType: "combo", comboUnitCount: 4 });
  });

  it("Menú is closed combo", () => {
    const product = p("Menú Kebab", "Patatas y bebida 33cl", { categorySlug: "menus" });
    expect(normalizeProductClassification(product)).toEqual({ productType: "combo", comboUnitCount: 0 });
  });

  it("detects drink in description", () => {
    expect(descriptionIncludesDrink(p("X", "Bebida 2L a elegir"))).toBe(true);
    expect(descriptionIncludesDrink(p("X", "Solo patatas"))).toBe(false);
  });

  it("synthesizes drink group for closed combo with drink in description", () => {
    const product = p("Combo 10 Piezas Pollo Crispy", "Incluye bebida 2L a elegir", {
      productType: "combo",
      comboUnitCount: 0,
    });
    const config = synthesizeModifierConfigFromProduct(product);
    expect(config?.productType).toBe("combo");
    const drinkGroup = config?.groups.find((g) => /bebida|refresco/i.test(`${g.name.es} ${g.name.pt}`));
    expect(drinkGroup?.options.length).toBeGreaterThanOrEqual(2);
  });
});
