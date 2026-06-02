import { describe, expect, it } from "vitest";
import type { MenuProduct } from "@/hooks/useMenuData";
import {
  productIncludesSidePotato,
  shouldOfferPotatoExtra,
  resolvePotatoMenuOptions,
} from "./potatoRules";
import { synthesizeModifierConfigFromProduct } from "./synthesizeConfig";
import { applyComboDescriptionRules, applySimpleProductRules } from "./comboConfigFilter";
import type { ProductModifierConfig } from "./types";
import { KEBAB_AUDIT_PRODUCTS } from "./__fixtures__/kebabMenuAuditProducts";

function food(
  id: string,
  name: string,
  desc: string,
  extra?: Partial<MenuProduct>,
): MenuProduct {
  return {
    id,
    name: { es: name, pt: name, en: name, fr: name },
    description: { es: desc, pt: desc, en: desc, fr: desc },
    price: 5,
    image: "",
    category: "test",
    categorySlug: extra?.categorySlug || "test",
    isBestseller: false,
    isPromo: false,
    sortOrder: 0,
    extras: extra?.extras,
    ...extra,
  } as MenuProduct;
}

const menu = [...KEBAB_AUDIT_PRODUCTS];

describe("potatoRules", () => {
  it("Rollo de Ternera does not include side potato", () => {
    const rollo = food("r2", "Rollo de Ternera", "Carne de ternera, lechuga, col, tomate", {
      categorySlug: "rollo-kebab",
      extras: [
        { id: "pb", name: { es: "Patatas bravas", pt: "Patatas bravas" }, price: 0.5 },
        { id: "pl", name: { es: "Patatas de lux", pt: "Patatas de lux" }, price: 0.5 },
      ],
    });
    expect(productIncludesSidePotato(rollo)).toBe(false);
    expect(shouldOfferPotatoExtra(rollo)).toBe(true);
  });

  it("Combo 4 Rollos includes side potato", () => {
    const combo = food("c4r", "Combo 4 Rollos Kebab", "4 rollos + patatas + bebida 2L", {
      categorySlug: "ofertas-combo",
      productType: "combo",
      comboUnitCount: 4,
    });
    expect(productIncludesSidePotato(combo)).toBe(true);
    expect(shouldOfferPotatoExtra(combo)).toBe(false);
  });

  it("Menú includes side potato", () => {
    const menuItem = food("m1", "Menú Nuggets", "Nuggets + patatas + lata 33cl", {
      categorySlug: "menus",
    });
    expect(productIncludesSidePotato(menuItem)).toBe(true);
  });

  it("resolvePotatoMenuOptions uses catalog prices not upgrade delta", () => {
    const opts = resolvePotatoMenuOptions(menu);
    expect(opts.length).toBeGreaterThanOrEqual(2);
    const bravas = opts.find((o) => /bravas/i.test(o.name.es));
    expect(bravas?.price).toBeGreaterThan(0.5);
  });
});

describe("synthesize potato groups", () => {
  it("Rollo shows potato extra group with real prices, not upgrade substitution", () => {
    const rollo = food("r2", "Rollo de Ternera", "Carne de ternera, lechuga, col, tomate", {
      categorySlug: "rollo-kebab",
      extras: [
        { id: "pb", name: { es: "Patatas bravas", pt: "Patatas bravas" }, price: 0.5 },
        { id: "pl", name: { es: "Patatas de lux", pt: "Patatas de lux" }, price: 0.5 },
      ],
    });

    const raw = synthesizeModifierConfigFromProduct(rollo, menu);
    const config = applyComboDescriptionRules(rollo, raw, menu);
    expect(config?.groups.some((g) => g.groupKind === "substitution")).toBe(false);

    const potatoExtra = config?.groups.find((g) => g.id.includes("potato-extra"));
    expect(potatoExtra?.groupKind).toBe("extra");
    expect(potatoExtra?.name.es).toContain("añadir patatas");

    const bravas = potatoExtra?.options.find((o) => /bravas/i.test(o.name.es || ""));
    expect(bravas?.priceDelta).toBeGreaterThan(0.5);
  });

  it("Combo 10 Piezas shows upgrade group at +0.50", () => {
    const combo = menu.find((p) => /Combo 10 Piezas/i.test(p.name.es || ""))!;
    const raw = synthesizeModifierConfigFromProduct(combo, menu);
    const config = applyComboDescriptionRules(combo, raw, menu);
    const potato = config?.groups.find((g) => g.groupKind === "substitution");
    expect(potato).toBeTruthy();
    expect(potato?.options.some((o) => o.priceDelta === 0)).toBe(true);
    const upgrades = potato?.options.filter((o) => o.priceDelta > 0) ?? [];
    expect(upgrades.every((o) => o.priceDelta === 0.5)).toBe(true);
  });

  const simpleProductsWithPotatoUpsell = [
    { label: "pita", product: menu.find((p) => p.id === "2")! },
    { label: "rollo", product: menu.find((p) => p.id === "r2")! },
    { label: "pizza", product: menu.find((p) => p.id === "pz1")! },
    {
      label: "burger",
      product: food("b1", "Burger de Ternera", "Carne de ternera, lechuga, tomate", {
        categorySlug: "burgers",
      }),
    },
  ];

  it.each(simpleProductsWithPotatoUpsell)(
    "$label simple product uses potato extra with catalog prices, not +0.50 upgrade",
    ({ product }) => {
      expect(productIncludesSidePotato(product)).toBe(false);
      expect(shouldOfferPotatoExtra(product)).toBe(true);

      const raw = synthesizeModifierConfigFromProduct(product, menu);
      const config = applyComboDescriptionRules(product, raw, menu);
      expect(config?.groups.some((g) => g.groupKind === "substitution")).toBe(false);

      const potatoExtra = config?.groups.find((g) => g.id.includes("potato-extra"));
      expect(potatoExtra?.groupKind).toBe("extra");
      for (const opt of potatoExtra?.options ?? []) {
        expect(opt.priceDelta).not.toBe(0.5);
        if (/bravas|lux|fritas/i.test(opt.name.es || "")) {
          expect(opt.priceDelta).toBeGreaterThan(0.5);
        }
      }
    },
  );

  it("strips legacy DB substitution potato group on simple products", () => {
    const rollo = menu.find((p) => p.id === "r2")!;
    const legacyConfig: ProductModifierConfig = {
      productId: rollo.id,
      hasStructuredModifiers: true,
      groups: [
        {
          id: "db-potato-sub",
          storeId: "",
          name: { es: "¿Quieres añadir patatas?", pt: "", en: "", fr: "" },
          description: {},
          groupKind: "substitution",
          selectionMode: "single",
          minSelect: 0,
          maxSelect: 1,
          isRequired: false,
          sortOrder: 1,
          repeatPerUnit: false,
          linkSortOrder: 1,
          options: [
            {
              id: "pb",
              groupId: "db-potato-sub",
              name: { es: "Patatas bravas", pt: "Patatas bravas", en: "", fr: "" },
              priceDelta: 0.5,
              maxQty: 1,
              isDefault: false,
              sortOrder: 1,
            },
            {
              id: "pl",
              groupId: "db-potato-sub",
              name: { es: "Patatas de lux", pt: "Patatas de lux", en: "", fr: "" },
              priceDelta: 0.5,
              maxQty: 1,
              isDefault: false,
              sortOrder: 2,
            },
          ],
        },
      ],
    };

    const config = applySimpleProductRules(rollo, legacyConfig, menu);
    expect(config?.groups.some((g) => g.groupKind === "substitution")).toBe(false);
    const potatoExtra = config?.groups.find((g) => g.id.includes("potato-extra"));
    expect(potatoExtra?.options.every((o) => o.priceDelta !== 0.5)).toBe(true);
  });
});
