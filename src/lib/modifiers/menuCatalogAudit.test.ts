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

  it("does not flag recommended drinks that already match the catalog", () => {
    const issues = auditExpectedDrinkCatalog(KEBAB_DRINK_CATALOG);
    expect(issues.some((i) => i.optionName === "Coca-Cola 2L" && i.action === "create")).toBe(false);
    expect(issues.some((i) => i.optionName === "Coca-Cola Lata 33cl" && i.action === "review")).toBe(false);
    expect(issues.some((i) => i.optionName === "Agua Pequeña" && i.action === "review")).toBe(false);
  });

  it("flags recommended drinks only when photo or name needs attention", () => {
    const coca = product("Coca-Cola Lata 33cl", "/product-placeholder.svg");
    const agua = product("Agua Pequeña", "/product-placeholder.svg");
    const issues = auditExpectedDrinkCatalog([coca, agua]);
    expect(issues.some((i) => i.matchedProductId === coca.id && i.problem.includes("foto"))).toBe(true);
    expect(issues.some((i) => i.matchedProductId === agua.id && i.problem.includes("foto"))).toBe(true);
  });

  it("dedupes multiple review warnings for the same product", () => {
    const match = product("Coca-Cola Lata 33cl", "");
    const merged = mergeCatalogAudits([
      [
        {
          optionId: "o1",
          optionName: "Coca-Cola Lata 33cl",
          groupName: "Bebida",
          severity: "warning",
          action: "review",
          problem: "convém rever foto",
          suggestion: "",
          matchedProductId: match.id,
          match,
        } as never,
      ],
      [
        {
          optionId: match.id,
          optionName: "Coca-Cola Lata 33cl",
          groupName: "Catálogo recomendado",
          severity: "warning",
          action: "review",
          problem: "convém rever nome",
          suggestion: "",
          matchedProductId: match.id,
          match,
        } as never,
      ],
    ]);
    expect(merged.filter((i) => i.action === "review")).toHaveLength(1);
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
