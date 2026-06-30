import { describe, expect, it } from "vitest";
import type { MenuProduct } from "@/hooks/useMenuData";
import { KEBAB_DRINK_CATALOG } from "@/lib/modifiers/__fixtures__/kebabMenuAuditProducts";
import {
  filterProductsForCategory,
  isCustomerMenuProduct,
  listCustomerDrinkProducts,
} from "./menuDrinkCatalog";
import { isGenericDrinkPlaceholder } from "@/lib/modifiers/drinkProduct";

function drink(id: string, name: string): MenuProduct {
  return {
    id,
    name: { es: name, pt: name, en: name, fr: name },
    description: { es: "", pt: "", en: "", fr: "" },
    price: 2,
    image: "",
    category: "bebidas",
    categorySlug: "bebidas",
    isBestseller: false,
    isPromo: false,
    sortOrder: 0,
  } as MenuProduct;
}

const categories = [
  {
    id: "bebidas",
    name: { es: "Bebidas", pt: "Bebidas", en: "Drinks", fr: "Boissons" },
    image: "",
    icon: "",
  },
];

describe("menuDrinkCatalog", () => {
  it("hides generic Refresco Lata/Botella placeholders from drinks category", () => {
    const products = [
      drink("g-lata", "Refresco Lata 33cl"),
      drink("g-2l", "Refresco Botella 2L"),
      drink("coca", "Coca-Cola Lata 33cl"),
      drink("fanta", "Fanta Naranja 2L"),
    ];
    products[0].description = { es: "Coca-Cola, Fanta, Sprite, Nestea", pt: "", en: "", fr: "" };
    products[1].description = { es: "Coca-Cola, Fanta o similar", pt: "", en: "", fr: "" };

    expect(isGenericDrinkPlaceholder(products[0])).toBe(true);
    expect(isGenericDrinkPlaceholder(products[1])).toBe(true);
    expect(isGenericDrinkPlaceholder(products[2])).toBe(false);
    expect(isGenericDrinkPlaceholder(products[3])).toBe(false);

    const visible = filterProductsForCategory(products, categories, "bebidas");
    expect(visible.map((p) => p.id)).toEqual(["coca", "fanta"]);
  });

  it("lists concrete drinks from full catalog fixture", () => {
    const visible = listCustomerDrinkProducts(KEBAB_DRINK_CATALOG);
    const names = visible.map((p) => p.name.es);
    expect(names).toContain("Coca-Cola 2L");
    expect(names).toContain("Coca-Cola Lata 33cl");
    expect(names).not.toContain("Refresco Botella 1.25L");
  });

  it("blocks generic drinks from bestsellers strip", () => {
    const generic = drink("g", "Refresco Lata 33cl");
    generic.isBestseller = true;
    expect(isCustomerMenuProduct(generic)).toBe(false);
    expect(isCustomerMenuProduct(drink("c", "Coca-Cola 2L"))).toBe(true);
  });
});
