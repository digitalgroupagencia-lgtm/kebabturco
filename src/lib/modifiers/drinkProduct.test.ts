import { describe, expect, it } from "vitest";
import type { MenuProduct } from "@/hooks/useMenuData";
import { KEBAB_DRINK_CATALOG } from "./__fixtures__/kebabMenuAuditProducts";
import { isGenericDrinkPlaceholder, resolveDrinkExtrasFromMenu } from "./drinkProduct";

function drink(name: string, desc = ""): MenuProduct {
  return {
    id: `p-${name}`,
    name: { es: name, pt: name, en: name, fr: name },
    description: { es: desc, pt: desc, en: desc, fr: desc },
    price: 3,
    image: "",
    category: "bebidas",
    categorySlug: "bebidas",
  } as MenuProduct;
}

describe("drinkProduct", () => {
  it("resolves 2L drink options for generic botella placeholder", () => {
    const generic = drink("Refresco Botella 2L", "Coca-Cola, Fanta o similar");
    const extras = resolveDrinkExtrasFromMenu(generic, KEBAB_DRINK_CATALOG);
    const labels = extras.map((e) => e.name.es);
    expect(labels).toContain("Coca-Cola 2L");
    expect(labels).toContain("Fanta Naranja 2L");
    expect(labels).not.toContain("Refresco Botella 2L");
    expect(labels).not.toContain("Coca-Cola Lata 33cl");
  });

  it("resolves 33cl drink options for generic lata placeholder", () => {
    const generic = drink("Refresco Lata 33cl", "Coca-Cola, Fanta, Sprite, Nestea");
    const extras = resolveDrinkExtrasFromMenu(generic, KEBAB_DRINK_CATALOG);
    const labels = extras.map((e) => e.name.es);
    expect(labels).toContain("Coca-Cola Lata 33cl");
    expect(labels).toContain("Fanta Naranja Lata 33cl");
    expect(labels).not.toContain("Refresco Lata 33cl");
    expect(labels).not.toContain("Coca-Cola 2L");
  });
});
