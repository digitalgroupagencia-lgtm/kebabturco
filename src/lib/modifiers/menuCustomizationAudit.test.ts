import { describe, expect, it } from "vitest";
import {
  auditMenuProducts,
  auditProductCustomization,
  auditSummary,
} from "./menuCustomizationAudit";
import { safeSynthesizeModifierConfig } from "./safeCustomization";
import { hasFixedProtein, allowsPerUnitMeatChoice } from "./comboProductRules";
import {
  KEBAB_AUDIT_PRODUCTS,
  KEBAB_DRINK_CATALOG,
} from "./__fixtures__/kebabMenuAuditProducts";

const byName = (fragment: string) =>
  KEBAB_AUDIT_PRODUCTS.find((p) => (p.name.es || "").includes(fragment))!;

describe("menu customization audit (93-product matrix sample)", () => {
  it("audits full representative catalog without throwing", () => {
    const issues = auditMenuProducts(KEBAB_AUDIT_PRODUCTS);
    const summary = auditSummary(issues);
    expect(summary.total).toBeGreaterThanOrEqual(0);
  });

  it("Pan de Pita de Pollo has no meat selector and no audit errors", () => {
    const product = byName("Pan de Pita de Pollo");
    expect(hasFixedProtein(product)).toBe(true);
    const issues = auditProductCustomization(product, undefined, KEBAB_AUDIT_PRODUCTS);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("Pan de Pita Solo Carne offers meat choice", () => {
    const product = byName("Solo Carne");
    expect(hasFixedProtein(product)).toBe(false);
    const config = safeSynthesizeModifierConfig(product, KEBAB_AUDIT_PRODUCTS);
    const meat = config?.groups.find((g) => /carne/i.test(`${g.name.es} ${g.name.pt}`));
    expect(meat?.options.length).toBeGreaterThanOrEqual(2);
  });

  it("Combo 10 Piezas includes drink choice from menu catalog", () => {
    const product = byName("Combo 10 Piezas");
    const config = safeSynthesizeModifierConfig(product, KEBAB_AUDIT_PRODUCTS);
    const drink = config?.groups.find((g) => /bebida|refresco/i.test(`${g.name.es} ${g.name.pt}`));
    expect(drink?.options.length).toBeGreaterThanOrEqual(2);
    const issues = auditProductCustomization(product, config, KEBAB_AUDIT_PRODUCTS);
    expect(issues.filter((i) => i.problem.includes("bebida"))).toHaveLength(0);
  });

  it("Combo 4 Pan Pita Mixto asks meat per unit", () => {
    const product = byName("Combo 4 Pan Pita Mixto");
    expect(allowsPerUnitMeatChoice(product)).toBe(true);
    expect(hasFixedProtein(product)).toBe(false);
  });

  it("Combo 4 Piezas uses 33cl drinks when description says refresco 33cl", () => {
    const product = byName("Combo 4 Piezas");
    const config = safeSynthesizeModifierConfig(product, KEBAB_AUDIT_PRODUCTS);
    const drink = config?.groups.find((g) => /bebida|refresco/i.test(`${g.name.es} ${g.name.pt}`));
    const labels = (drink?.options || []).map((o) => o.name.es).join(" ");
    expect(labels).toMatch(/33|lata/i);
  });

  it("Menú Nuggets includes drink choice", () => {
    const product = byName("Menú Nuggets");
    const config = safeSynthesizeModifierConfig(product, KEBAB_AUDIT_PRODUCTS);
    const drink = config?.groups.find((g) => /bebida|refresco/i.test(`${g.name.es} ${g.name.pt}`));
    expect(drink?.options.length).toBeGreaterThanOrEqual(2);
  });

  it("drink products have no meat audit errors", () => {
    for (const drink of KEBAB_DRINK_CATALOG) {
      const issues = auditProductCustomization(drink, undefined, KEBAB_AUDIT_PRODUCTS);
      expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
    }
  });

  it("Pan Vegetal does not fix meat incorrectly", () => {
    const product = byName("Pan Vegetal");
    expect(hasFixedProtein(product)).toBe(false);
    const issues = auditProductCustomization(product, undefined, KEBAB_AUDIT_PRODUCTS);
    expect(issues.some((i) => i.problem.includes("proteína (pollo)"))).toBe(false);
  });
});
