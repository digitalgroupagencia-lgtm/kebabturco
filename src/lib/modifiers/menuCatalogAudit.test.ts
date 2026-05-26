import { describe, expect, it } from "vitest";
import {
  auditExpectedDrinkCatalog,
  auditModifierOptionsAgainstCatalog,
  mergeCatalogAudits,
} from "./menuCatalogAudit";
import type { MenuProduct } from "@/hooks/useMenuData";
import type { ModifierGroup } from "./types";

function product(name: string, image?: string): MenuProduct {
  return {
    id: `p-${name}`,
    name: { es: name, pt: name, en: name, fr: name },
    description: { es: "", pt: "", en: "", fr: "" },
    price: 2,
    image: image ?? "",
    categoryId: "bebidas",
    categorySlug: "bebidas",
    isBestseller: false,
    isPromo: false,
    sortOrder: 0,
  } as unknown as MenuProduct;
}

describe("menuCatalogAudit", () => {
  it("flags modifier options without matching catalog product", () => {
    const groups: ModifierGroup[] = [
      {
        id: "g1",
        name: { es: "Bebida 2L", pt: "Bebida 2L" },
        groupKind: "choice",
        options: [
          { id: "o1", name: { es: "Coca-Cola 2L" }, price: 0 } as any,
          { id: "o2", name: { es: "Fanta Naranja 2L" }, price: 0 } as any,
        ],
      } as any,
    ];
    const products = [product("Refresco Botella 2L")];

    const issues = auditModifierOptionsAgainstCatalog(groups, products);
    expect(issues.some((i) => i.optionName.includes("Coca-Cola"))).toBe(true);
    expect(issues.some((i) => i.problem.includes("sem produto editável"))).toBe(true);
  });

  it("warns when matched product has no image", () => {
    const groups: ModifierGroup[] = [
      {
        id: "g1",
        name: { es: "Bebida 2L", pt: "Bebida 2L" },
        groupKind: "choice",
        options: [{ id: "o1", name: { es: "Refresco Botella 2L" }, price: 0 } as any],
      } as any,
    ];
    const products = [product("Refresco Botella 2L", "")];

    const issues = auditModifierOptionsAgainstCatalog(groups, products);
    expect(issues.some((i) => i.problem.includes("sem imagem"))).toBe(true);
  });

  it("merges expected drink catalog gaps", () => {
    const products = [product("Refresco Botella 2L")];
    const merged = mergeCatalogAudits([
      auditModifierOptionsAgainstCatalog([], products),
      auditExpectedDrinkCatalog(products),
    ]);
    expect(merged.length).toBeGreaterThan(0);
  });
});
