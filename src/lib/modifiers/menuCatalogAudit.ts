import type { MenuProduct } from "@/hooks/useMenuData";
import type { ModifierGroup, ModifierOption } from "./types";
import { isGenericDrinkPlaceholder } from "./drinkProduct";
import {
  DEFAULT_DRINK_LABELS,
  drinkLabelMatchesRule,
  drinkProductMatchesRule,
  type DrinkSizeRule,
} from "./drinkSizeRules";

export type CatalogAuditAction = "create" | "review";

export type CatalogAuditIssue = {
  optionId: string;
  optionName: string;
  groupName: string;
  severity: "error" | "warning";
  problem: string;
  suggestion: string;
  drinkRule?: DrinkSizeRule | null;
  action: CatalogAuditAction;
  matchedProductId?: string;
  matchedCategoryId?: string;
  matchedProductName?: string;
};

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productLabel(product: MenuProduct): string {
  return normalizeLabel(
    `${product.name.es || ""} ${product.name.pt || ""} ${product.name.en || ""}`,
  );
}

function productDisplayName(product: MenuProduct): string {
  return product.name.es || product.name.pt || product.name.en || product.id;
}

function optionLabel(option: ModifierOption): string {
  return normalizeLabel(
    `${option.name.es || ""} ${option.name.pt || ""} ${option.name.en || ""}`,
  );
}

function groupLabel(group: ModifierGroup): string {
  return `${group.name.es || ""} ${group.name.pt || ""}`.trim();
}

function isDrinkGroup(group: ModifierGroup): boolean {
  const label = groupLabel(group).toLowerCase();
  return /bebida|refresco|drink|boisson/i.test(label) || group.groupKind === "choice";
}

function extractDrinkBrand(label: string): string | null {
  const n = normalizeLabel(label);
  if (/coca/.test(n)) return "coca";
  if (/fanta/.test(n)) return "fanta";
  if (/sprite/.test(n)) return "sprite";
  if (/nestea/.test(n)) return "nestea";
  if (/agua/.test(n)) return "agua";
  return null;
}

/** Exclui cartões genéricos («Refresco Botella 2L») — só contam produtos com marca real. */
export function catalogDrinkProductsForAudit(products: MenuProduct[]): MenuProduct[] {
  return products.filter((p) => !isGenericDrinkPlaceholder(p));
}

function productMatchesDrinkRule(product: MenuProduct, rule: DrinkSizeRule | null): boolean {
  if (!rule) return false;
  const label = productLabel(product);
  return drinkProductMatchesRule(product, rule) || drinkLabelMatchesRule(label, rule);
}

function labelsLooselyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const tokensA = a.split(" ").filter((t) => t.length > 2);
  const tokensB = b.split(" ").filter((t) => t.length > 2);
  if (!tokensA.length || !tokensB.length) return false;

  const shared = tokensA.filter((t) => tokensB.includes(t));
  return shared.length >= Math.min(tokensA.length, tokensB.length, 2);
}

function findMatchingProductByName(
  expectedName: string,
  rule: DrinkSizeRule | null,
  products: MenuProduct[],
): MenuProduct | undefined {
  const normalized = normalizeLabel(expectedName);
  if (!normalized) return undefined;

  const direct = products.find((p) => {
    const pl = productLabel(p);
    return pl === normalized || pl.includes(normalized) || normalized.includes(pl);
  });
  if (direct) return direct;

  const brand = extractDrinkBrand(expectedName);
  if (brand) {
    const byBrand = products.filter((p) => {
      const pl = productLabel(p);
      if (!pl.includes(brand)) return false;
      if (rule) return productMatchesDrinkRule(p, rule);
      return true;
    });
    if (byBrand.length === 1) return byBrand[0];
    if (byBrand.length > 1) {
      return (
        byBrand.find((p) => labelsLooselyMatch(productLabel(p), normalized)) ?? byBrand[0]
      );
    }
  }

  if (rule) {
    const byRule = products.filter((p) => productMatchesDrinkRule(p, rule));
    const byTokens = byRule.filter((p) => labelsLooselyMatch(productLabel(p), normalized));
    if (byTokens.length === 1) return byTokens[0];
  }

  return products.find((p) => labelsLooselyMatch(productLabel(p), normalized));
}

function findMatchingProduct(option: ModifierOption, products: MenuProduct[]): MenuProduct | undefined {
  const label = optionLabel(option);
  if (!label) return undefined;
  const display =
    option.name.es || option.name.pt || option.name.en || option.id;
  return findMatchingProductByName(display, inferDrinkRule(label), products);
}

function inferDrinkRule(label: string): DrinkSizeRule | null {
  if (/2\s*l|2l|botella\s*2/.test(label)) return "2l";
  if (/33\s*cl|33cl|lata/.test(label)) return "33cl";
  if (/1[\.,]25|125\s*cl/.test(label)) return "125l";
  if (/agua peque|agua mineral peque/.test(label)) return "small_water";
  return null;
}

function isPlaceholderImage(image?: string): boolean {
  if (!image) return true;
  return /placeholder|product-default|via\.placeholder/i.test(image);
}

function buildReviewIssue(
  base: Omit<CatalogAuditIssue, "action" | "severity" | "problem" | "suggestion"> & {
    match: MenuProduct;
    reviewParts: string[];
  },
): CatalogAuditIssue {
  const displayName = productDisplayName(base.match);
  return {
    ...base,
    severity: "warning",
    action: "review",
    matchedProductId: base.match.id,
    matchedCategoryId: base.match.category,
    matchedProductName: displayName,
    problem: `Produto «${displayName}» já está no cardápio, convém rever ${base.reviewParts.join(" e ")}`,
    suggestion: "Abrir no cardápio para confirmar foto, nome e preço",
  };
}

function reviewPartsForMatch(expectedName: string, match: MenuProduct): string[] {
  const parts: string[] = [];
  const expected = normalizeLabel(expectedName);
  const actual = productLabel(match);

  if (isPlaceholderImage(match.image)) {
    parts.push("foto");
  }
  if (expected && actual && !labelsLooselyMatch(expected, actual)) {
    parts.push("nome");
  }
  return parts;
}

export function auditModifierOptionsAgainstCatalog(
  groups: ModifierGroup[],
  products: MenuProduct[],
): CatalogAuditIssue[] {
  const issues: CatalogAuditIssue[] = [];
  const seenOptions = new Set<string>();
  const catalogProducts = catalogDrinkProductsForAudit(products);

  for (const group of groups) {
    if (!isDrinkGroup(group)) continue;
    const gName = groupLabel(group);

    for (const option of group.options ?? []) {
      const label = optionLabel(option);
      const display =
        option.name.es || option.name.pt || option.name.en || option.id;
      if (!label || seenOptions.has(option.id)) continue;
      seenOptions.add(option.id);

      const match = findMatchingProduct(option, catalogProducts);
      if (!match) {
        issues.push({
          optionId: option.id,
          optionName: display,
          groupName: gName,
          severity: "error",
          action: "create",
          problem: "Opção usada em combos mas sem produto editável no cardápio",
          suggestion: "Criar produto na categoria Bebidas para poder editar nome, imagem e preço",
          drinkRule: inferDrinkRule(label),
        });
        continue;
      }

      if (isPlaceholderImage(match.image)) {
        issues.push(
          buildReviewIssue({
            optionId: option.id,
            optionName: display,
            groupName: gName,
            drinkRule: inferDrinkRule(label),
            match,
            reviewParts: ["foto"],
          }),
        );
      }
    }
  }

  return issues;
}

export function auditExpectedDrinkCatalog(products: MenuProduct[]): CatalogAuditIssue[] {
  const issues: CatalogAuditIssue[] = [];
  const catalogProducts = catalogDrinkProductsForAudit(products);

  (Object.entries(DEFAULT_DRINK_LABELS) as [DrinkSizeRule, string[]][]).forEach(([rule, expected]) => {
    for (const name of expected) {
      const match = findMatchingProductByName(name, rule, catalogProducts);
      if (!match) {
        issues.push({
          optionId: `expected-${rule}-${normalizeLabel(name)}`,
          optionName: name,
          groupName: "Catálogo recomendado",
          severity: "error",
          action: "create",
          problem: "Bebida recomendada ainda não está no cardápio",
          suggestion: "Criar produto na categoria Bebidas para combos e vendas avulsas",
          drinkRule: rule,
        });
        continue;
      }

      const reviewParts = reviewPartsForMatch(name, match);
      if (reviewParts.length) {
        issues.push(
          buildReviewIssue({
            optionId: match.id,
            optionName: name,
            groupName: "Catálogo recomendado",
            drinkRule: rule,
            match,
            reviewParts,
          }),
        );
      }
    }
  });

  return issues;
}

export function mergeCatalogAudits(lists: CatalogAuditIssue[][]): CatalogAuditIssue[] {
  const byKey = new Map<string, CatalogAuditIssue>();
  for (const issue of lists.flat()) {
    const key = `${issue.optionId}:${issue.action}:${issue.problem}`;
    if (!byKey.has(key)) byKey.set(key, issue);
  }
  return dedupeReviewIssuesByProduct([...byKey.values()]);
}

function dedupeReviewIssuesByProduct(issues: CatalogAuditIssue[]): CatalogAuditIssue[] {
  const reviewByProduct = new Map<string, CatalogAuditIssue>();
  const result: CatalogAuditIssue[] = [];

  for (const issue of issues) {
    if (issue.action !== "review" || !issue.matchedProductId) {
      result.push(issue);
      continue;
    }

    const existing = reviewByProduct.get(issue.matchedProductId);
    if (!existing) {
      reviewByProduct.set(issue.matchedProductId, issue);
      continue;
    }

    const mergedParts = new Set<string>();
    for (const text of [existing.problem, issue.problem]) {
      if (text.includes("foto")) mergedParts.add("foto");
      if (text.includes("nome")) mergedParts.add("nome");
      if (text.includes("dados")) mergedParts.add("dados");
    }
    const displayName = existing.matchedProductName || issue.matchedProductName || existing.optionName;
    reviewByProduct.set(issue.matchedProductId, {
      ...existing,
      problem: `Produto «${displayName}» já está no cardápio, convém rever ${[...mergedParts].join(" e ") || "dados"}`,
    });
  }

  result.push(...reviewByProduct.values());
  return result;
}

export function catalogAuditSummary(issues: CatalogAuditIssue[]) {
  return {
    total: issues.length,
    errors: issues.filter((i) => i.action === "create").length,
    warnings: issues.filter((i) => i.action === "review").length,
    missingProducts: issues.filter((i) => i.action === "create").length,
  };
}

export function buildProductPayloadFromOption(
  option: ModifierOption,
  categoryId: string,
  storeId: string,
  sortOrder: number,
) {
  const nameEs = option.name.es || option.name.pt || option.name.en || "Bebida";
  return {
    store_id: storeId,
    category_id: categoryId,
    name: {
      pt: option.name.pt || "",
      en: option.name.en || "",
      es: option.name.es || nameEs,
      fr: option.name.fr || "",
    },
    description: { pt: "", en: "", es: "", fr: "" },
    price: (option as { price?: number }).price ?? 0,
    image_url: option.imageUrl ?? null,
    is_active: true,
    is_bestseller: false,
    is_promo: false,
    sort_order: sortOrder,
    product_type: "simple" as const,
  };
}

function defaultDrinkPrice(rule?: DrinkSizeRule | null): number {
  if (rule === "2l") return 3;
  if (rule === "125l") return 2.5;
  if (rule === "33cl") return 1.8;
  if (rule === "small_water") return 1;
  return 0;
}

export function buildProductPayloadFromIssue(
  issue: CatalogAuditIssue,
  categoryId: string,
  storeId: string,
  sortOrder: number,
) {
  const label = issue.optionName || "Produto";
  return {
    store_id: storeId,
    category_id: categoryId,
    name: { es: label },
    description: { pt: "", en: "", es: "", fr: "" },
    price: defaultDrinkPrice(issue.drinkRule),
    image_url: "/product-placeholder.svg",
    is_active: true,
    is_bestseller: false,
    is_promo: false,
    sort_order: sortOrder,
    product_type: "simple" as const,
  };
}
