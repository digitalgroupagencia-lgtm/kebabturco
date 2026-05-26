import type { MenuProduct } from "@/hooks/useMenuData";
import type { ModifierGroup, ProductModifierConfig } from "./types";
import { synthesizeModifierConfigFromProduct } from "./synthesizeConfig";
import {
  detectFixedProtein,
  hasFixedProtein,
  isClosedProteinCombo,
  isVariableProteinProduct,
  productText,
} from "./comboProductRules";
import { isDrinkProduct } from "./drinkProduct";
import { filterProductModifierConfig, isMeatChoiceGroup } from "./proteinRules";

export type CustomizationAuditIssue = {
  productId: string;
  productName: string;
  severity: "error" | "warning";
  problem: string;
  suggestion: string;
};

function displayName(product: MenuProduct): string {
  return product.name?.es || product.name?.pt || product.name?.en || product.id;
}

function collectMeatGroups(groups: ModifierGroup[]): ModifierGroup[] {
  return (groups ?? []).filter(isMeatChoiceGroup);
}

function findDuplicateOptions(groups: ModifierGroup[]): string[] {
  const dupes: string[] = [];
  for (const g of groups) {
    const labels = (g.options ?? []).map((o) => (o.name.es || o.name.pt || "").toLowerCase());
    const seen = new Set<string>();
    for (const l of labels) {
      if (seen.has(l)) dupes.push(l);
      seen.add(l);
    }
  }
  return dupes;
}

export function auditProductCustomization(
  product: MenuProduct,
  effectiveConfig?: ProductModifierConfig | null,
): CustomizationAuditIssue[] {
  const issues: CustomizationAuditIssue[] = [];
  const label = displayName(product);
  const fixed = detectFixedProtein(product);
  const synthesized = synthesizeModifierConfigFromProduct(product);
  const effective = effectiveConfig
    ? filterProductModifierConfig(product, effectiveConfig)
    : synthesized
      ? filterProductModifierConfig(product, synthesized)
      : null;

  const rawGroups = effectiveConfig?.groups ?? synthesized?.groups ?? [];
  const meatBeforeFilter = collectMeatGroups(rawGroups);

  if (fixed && meatBeforeFilter.length > 0) {
    issues.push({
      productId: product.id,
      productName: label,
      severity: "error",
      problem: `Produto já define proteína (${fixed}) mas ainda usa seletor de carne/sabor principal`,
      suggestion: "Remover escolha de proteína — manter só bebida, batata, molho ou extras coerentes",
    });
  }

  if (isClosedProteinCombo(product) && meatBeforeFilter.length > 0) {
    issues.push({
      productId: product.id,
      productName: label,
      severity: "error",
      problem: "Combo fechado a usar seletor genérico de kebab/carne",
      suggestion: "Usar apenas bebida, molho, batata ou opções específicas deste combo",
    });
  }

  if (isDrinkProduct(product) && meatBeforeFilter.length > 0) {
    issues.push({
      productId: product.id,
      productName: label,
      severity: "error",
      problem: "Bebida com grupo de carne ou ingredientes",
      suggestion: "Remover grupos de carne/ingredientes — usar só tipo, temperatura e gelo",
    });
  }

  if (product.variants && product.variants.length >= 2 && hasFixedProtein(product)) {
    issues.push({
      productId: product.id,
      productName: label,
      severity: "warning",
      problem: "Variantes automáticas incoerentes com proteína fixa no nome",
      suggestion: "Limpar variantes inferidas — o nome já define o sabor",
    });
  }

  if (isVariableProteinProduct(product) && collectMeatGroups(effective?.groups ?? []).length === 0 && !isDrinkProduct(product)) {
    const name = productText(product);
    if (/\bpita\b|\brollo\b|\bkebab\b/i.test(name) && !hasFixedProtein(product)) {
      issues.push({
        productId: product.id,
        productName: label,
        severity: "warning",
        problem: "Produto configurável sem seletor de carne visível",
        suggestion: "Confirmar se o cliente deve escolher pollo/ternera/mixto",
      });
    }
  }

  const dupes = findDuplicateOptions(effective?.groups ?? []);
  if (dupes.length) {
    issues.push({
      productId: product.id,
      productName: label,
      severity: "warning",
      problem: `Opções duplicadas: ${dupes.slice(0, 3).join(", ")}`,
      suggestion: "Rever modificadores do produto e remover duplicados",
    });
  }

  if (!effective?.hasStructuredModifiers && !isDrinkProduct(product) && /combo/i.test(productText(product))) {
    issues.push({
      productId: product.id,
      productName: label,
      severity: "warning",
      problem: "Combo sem regras de personalização detectadas",
      suggestion: "Verificar descrição, extras e modificadores ligados na base de dados",
    });
  }

  return issues;
}

export function auditMenuProducts(products: MenuProduct[]): CustomizationAuditIssue[] {
  return products.flatMap((p) => auditProductCustomization(p));
}

export function auditSummary(issues: CustomizationAuditIssue[]) {
  return {
    total: issues.length,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
  };
}
