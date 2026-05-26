import { describe, expect, it } from "vitest";
import type { MenuProduct } from "@/hooks/useMenuData";
import {
  detectFixedProtein,
  hasFixedProtein,
  isVariableProteinProduct,
  allowsGlobalMeatChoice,
  allowsPerUnitMeatChoice,
} from "./comboProductRules";
import { isMeatChoiceGroup } from "./proteinRules";
import { synthesizeModifierConfigFromProduct } from "./synthesizeConfig";

const p = (name: string, desc = "", extra: Partial<MenuProduct> = {}): MenuProduct =>
  ({
    id: "test",
    name: { es: name, pt: name, en: name },
    description: { es: desc, pt: desc, en: desc },
    price: 10,
    image: "",
    category: "cat",
    categorySlug: "pita-kebab",
    extras: [],
    ingredients: [],
    ...extra,
  }) as MenuProduct;

describe("protein detection", () => {
  it("Pan de Pita de Pollo is fixed pollo", () => {
    const product = p("Pan de Pita de Pollo", "Carne de pollo, lechuga, col");
    expect(detectFixedProtein(product)).toBe("pollo");
    expect(hasFixedProtein(product)).toBe(true);
    expect(allowsGlobalMeatChoice(product)).toBe(false);
  });

  it("Combo 10 Piezas Pollo Crispy is closed", () => {
    const product = p("Combo 10 Piezas Pollo Crispy");
    expect(hasFixedProtein(product)).toBe(true);
    expect(allowsPerUnitMeatChoice(product)).toBe(false);
  });

  it("generic Pan Pita allows meat choice", () => {
    const product = p("Pan Pita", "Elige pollo o ternera o mixto");
    expect(isVariableProteinProduct(product)).toBe(true);
  });

  it("Pan de Pita Solo Carne offers global meat choice", () => {
    const product = p("Pan de Pita Solo Carne", "Elige pollo o ternera, lechuga, patatas fritas");
    expect(allowsGlobalMeatChoice(product)).toBe(true);
    const config = synthesizeModifierConfigFromProduct(product);
    const meat = config?.groups.find((g) => /carne/i.test(`${g.name.es} ${g.name.pt}`));
    expect(meat?.options.length).toBeGreaterThanOrEqual(2);
  });

  it("Combo 4 Pan Pita allows per-unit meat", () => {
    const product = p("Combo 4 Pan Pita Mixto", "", { productType: "combo", comboUnitCount: 4 });
    expect(allowsPerUnitMeatChoice(product)).toBe(true);
    expect(hasFixedProtein(product)).toBe(false);
  });

  it("Pan de Pita Mixto single product fixes mixto protein", () => {
    const product = p("Pan de Pita Mixto", "Pollo y ternera");
    expect(detectFixedProtein(product)).toBe("mixto");
    expect(allowsPerUnitMeatChoice(product)).toBe(false);
  });

  it("Combo 10 Piezas with drink description synthesizes as combo", () => {
    const product = p("Combo 10 Piezas Pollo Crispy", "Bebida 2L incluida", {
      categorySlug: "ofertas-combo",
      productType: "combo",
      comboUnitCount: 0,
    });
    expect(hasFixedProtein(product)).toBe(true);
  });

  it("detects meat choice groups", () => {
    expect(
      isMeatChoiceGroup({
        id: "g1",
        storeId: "",
        name: { es: "Elige la carne", pt: "Escolhe a carne", en: "", fr: "" },
        description: {},
        groupKind: "choice",
        selectionMode: "single",
        minSelect: 1,
        maxSelect: 1,
        isRequired: true,
        sortOrder: 0,
        repeatPerUnit: false,
        linkSortOrder: 0,
        options: [
          {
            id: "pollo",
            groupId: "g1",
            name: { es: "Pollo", pt: "Pollo", en: "", fr: "" },
            priceDelta: 0,
            maxQty: 1,
            isDefault: true,
            sortOrder: 0,
          },
          {
            id: "ternera",
            groupId: "g1",
            name: { es: "Ternera", pt: "Ternera", en: "", fr: "" },
            priceDelta: 0,
            maxQty: 1,
            isDefault: false,
            sortOrder: 1,
          },
        ],
      }),
    ).toBe(true);
  });
});
