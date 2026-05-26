import { describe, expect, it } from "vitest";
import {
  detectDrinkSizeRule,
  drinkLabelMatchesRule,
  drinkProductMatchesRule,
} from "./drinkSizeRules";
import { safeSynthesizeModifierConfig } from "./safeCustomization";
import { auditComboConfigurations, applyComboDescriptionRules } from "./comboConfigFilter";
import {
  KEBAB_AUDIT_PRODUCTS,
  KEBAB_DRINK_CATALOG,
} from "./__fixtures__/kebabMenuAuditProducts";
import type { MenuProduct } from "@/hooks/useMenuData";

const byName = (fragment: string) =>
  KEBAB_AUDIT_PRODUCTS.find((p) => (p.name.es || "").includes(fragment))!;

const ALL_DRINK_EXTRAS = [
  { id: "d1", name: { es: "Agua Pequeña" }, price: 0 },
  { id: "d2", name: { es: "Agua Grande" }, price: 0 },
  { id: "d3", name: { es: "Refresco Lata 33cl" }, price: 0 },
  { id: "d4", name: { es: "Refresco Botella 1.25L" }, price: 0 },
  { id: "d5", name: { es: "Refresco Botella 2L" }, price: 0 },
  { id: "d6", name: { es: "Monster Pequeño" }, price: 0 },
  { id: "d7", name: { es: "Zumo Bi Frutas" }, price: 0 },
];

const BRAVAS_150_EXTRA = { id: "br", name: { es: "Patatas bravas (+1,50€)" }, price: 1.5 };
const LUX_050_EXTRA = { id: "lx", name: { es: "Patatas de lux" }, price: 0.5 };

describe("drinkSizeRules", () => {
  it("detects 2L from combo description", () => {
    expect(detectDrinkSizeRule("10 piezas + patatas fritas + bebida 2L a elegir")).toBe("2l");
  });

  it("2L rule excludes small cans and water", () => {
    expect(drinkLabelMatchesRule("Agua Pequeña", "2l")).toBe(false);
    expect(drinkLabelMatchesRule("Refresco Lata 33cl", "2l")).toBe(false);
    expect(drinkLabelMatchesRule("Coca-Cola 2L", "2l")).toBe(true);
    expect(drinkLabelMatchesRule("Refresco Botella 2L", "2l")).toBe(true);
  });

  it("33cl rule excludes 2L bottles", () => {
    expect(drinkLabelMatchesRule("Refresco Lata 33cl", "33cl")).toBe(true);
    expect(drinkLabelMatchesRule("Coca-Cola 2L", "33cl")).toBe(false);
  });
});

describe("combo drink and potato filtering", () => {
  it("Combo 10 Piezas shows only 2L drinks even with mixed extras in DB", () => {
    const product: MenuProduct = {
      ...byName("Combo 10 Piezas"),
      extras: [...ALL_DRINK_EXTRAS, BRAVAS_150_EXTRA, LUX_050_EXTRA],
    };
    const config = safeSynthesizeModifierConfig(product, KEBAB_AUDIT_PRODUCTS);
    const drink = config?.groups.find((g) => /bebida|refresco/i.test(`${g.name.es} ${g.name.pt}`));
    const labels = (drink?.options || []).map((o) => o.name.es).join(" | ");

    expect(labels).toMatch(/2L|2l/i);
    expect(labels).not.toMatch(/33cl|Pequeña|1\.25|Monster|Zumo|Agua Grande/i);
  });

  it("Combo 10 Piezas potato upgrades are both +0.50€", () => {
    const product: MenuProduct = {
      ...byName("Combo 10 Piezas"),
      extras: [...ALL_DRINK_EXTRAS, BRAVAS_150_EXTRA, LUX_050_EXTRA],
    };
    const config = safeSynthesizeModifierConfig(product, KEBAB_AUDIT_PRODUCTS);
    const potato = config?.groups.find((g) => g.groupKind === "substitution");
    const upgrades = (potato?.options || []).filter((o) => o.priceDelta > 0);

    expect(upgrades.length).toBeGreaterThanOrEqual(2);
    upgrades.forEach((opt) => expect(opt.priceDelta).toBe(0.5));
  });

  it("Combo 4 Pan Pita Mixto shows only 2L drinks", () => {
    const product: MenuProduct = {
      ...byName("Combo 4 Pan Pita"),
      extras: ALL_DRINK_EXTRAS,
    };
    const config = safeSynthesizeModifierConfig(product, KEBAB_AUDIT_PRODUCTS);
    const drink = config?.groups.find((g) => /bebida|refresco/i.test(`${g.name.es} ${g.name.pt}`));
    const labels = (drink?.options || []).map((o) => o.name.es).join(" | ");

    expect(labels).toMatch(/2L|2l/i);
    expect(labels).not.toMatch(/33cl|Pequeña|Monster/i);
  });

  it("Combo 4 Piezas uses 33cl drinks only", () => {
    const product = byName("Combo 4 Piezas");
    const config = safeSynthesizeModifierConfig(product, KEBAB_AUDIT_PRODUCTS);
    const drink = config?.groups.find((g) => /bebida|refresco/i.test(`${g.name.es} ${g.name.pt}`));
    const labels = (drink?.options || []).map((o) => o.name.es).join(" ");
    expect(labels).toMatch(/33|lata/i);
    expect(labels).not.toMatch(/2L|2l/i);
  });

  it("audit report covers representative combos", () => {
    const rows = auditComboConfigurations(KEBAB_AUDIT_PRODUCTS);
    expect(rows.length).toBeGreaterThanOrEqual(5);
    const c10 = rows.find((r) => r.comboName.includes("Combo 10 Piezas"));
    expect(c10?.drinkRule).toBe("2l");
    expect(c10?.drinksShown.join(" ")).toMatch(/2L|2l/i);
  });

  it("rebuilds drink list from menu only when DB has all sizes mixed", () => {
    const product: MenuProduct = {
      ...byName("Combo 10 Piezas"),
      extras: [...ALL_DRINK_EXTRAS],
    };
    const dbDrinkGroup = {
      id: "db-drink",
      storeId: "",
      name: { es: "Bebida", pt: "Bebida", en: "Drink", fr: "Boisson" },
      description: {},
      groupKind: "choice" as const,
      selectionMode: "single" as const,
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      sortOrder: 1,
      repeatPerUnit: false,
      linkSortOrder: 1,
      options: ALL_DRINK_EXTRAS.map((extra, index) => ({
        id: extra.id,
        groupId: "db-drink",
        name: extra.name,
        priceDelta: 0,
        maxQty: 1,
        isDefault: index === 0,
        sortOrder: index,
      })),
    };
    const raw = {
      productId: product.id,
      productType: "combo" as const,
      comboUnitCount: 0,
      unitLabel: { es: "Unidad", pt: "Unidade", en: "Unit", fr: "Unité" },
      groups: [dbDrinkGroup],
      hasStructuredModifiers: true,
    };
    const config = applyComboDescriptionRules(product, raw, KEBAB_AUDIT_PRODUCTS);
    const labels = (config?.groups[0]?.options || []).map((o) => o.name.es).join(" | ");
    expect(labels).toMatch(/2L|2l/i);
    expect(labels).not.toMatch(/33cl|Pequeña|Monster|Zumo|Agua Grande/i);
  });
});

describe("drink catalog matching", () => {
  it("KEBAB_DRINK_CATALOG 2L products match 2l rule", () => {
    const twoL = KEBAB_DRINK_CATALOG.filter((p) => drinkProductMatchesRule(p, "2l"));
    expect(twoL.length).toBe(4);
  });
});
