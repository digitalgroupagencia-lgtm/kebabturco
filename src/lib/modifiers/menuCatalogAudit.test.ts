import { describe, expect, it } from "vitest";
import {
  auditExpectedDrinkCatalog,
  auditModifierOptionsAgainstCatalog,
  mergeCatalogAudits,
} from "./menuCatalogAudit";
import { KEBAB_DRINK_CATALOG } from "./__fixtures__/kebabMenuAuditProducts";
import type { MenuProduct } from "@/hooks/useMenuData";
import type { ModifierGroup } from "./types";

function product(name: string, image?: string): MenuProduct {
  return {
    id: `p-${name}`,
    name: { es: name, pt: name, en: name, fr: name },
    description: { es: "", pt: "", en: "", fr: "" },
    price: 2,
    image: image ?? "",
    category: "bebidas",
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
          { id: "o1", name: { es: "Coca-Cola 2L" }, price: 0 } as never,
          { id: "o2", name: { es: "Fanta Naranja 2L" }, price: 0 } as never,
        ],
      } as never,
    ];
    const products = [product("Refresco Botella 2L")];

    const issues = auditModifierOptionsAgainstCatalog(groups, products);
    expect(issues.some((i) => i.optionName.includes("Coca-Cola"))).toBe(true);
    expect(issues.some((i) => i.action === "create")).toBe(true);
  });

  it("suggests review when matched product has no image", () => {
    const groups: ModifierGroup[] = [
      {
        id: "g1",
        name: { es: "Bebida 2L", pt: "Bebida 2L" },
        groupKind: "choice",
        options: [{ id: "o1", name: { es: "Refresco Botella 2L" }, price: 0 } as never],
      } as never,
    ];
    const products = [product("Refresco Botella 2L", "")];

    const issues = auditModifierOptionsAgainstCatalog(groups, products);
    expect(issues.some((i) => i.action === "review" && i.problem.includes("foto"))).toBe(true);
  });

  it("treats existing recommended drinks as review instead of create", () => {
    const issues = auditExpectedDrinkCatalog(KEBAB_DRINK_CATALOG);
    expect(issues.some((i) => i.optionName === "Coca-Cola 2L" && i.action === "create")).toBe(false);
    expect(
      issues.some(
        (i) => i.optionName === "Coca-Cola 2L" && i.action === "review" && i.matchedProductId,
      ),
    ).toBe(true);
  });

  it("merges expected drink catalog gaps", () => {
    const products = [product("Refresco Botella 2L")];
    const merged = mergeCatalogAudits([
      auditModifierOptionsAgainstCatalog([], products),
      auditExpectedDrinkCatalog(products),
    ]);
    expect(merged.some((i) => i.action === "create")).toBe(true);
  });
});
