import type { MenuProduct } from "@/hooks/useMenuData";
import type { ModifierGroup, ModifierOption } from "./types";
import { DEFAULT_DRINK_LABELS, type DrinkSizeRule } from "./drinkSizeRules";

export type CatalogAuditIssue = {
  optionId: string;
  optionName: string;
  groupName: string;
  severity: "error" | "warning";
  problem: string;
  suggestion: string;
  drinkRule?: DrinkSizeRule | null;
};

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function productLabel(product: MenuProduct): string {
  return normalizeLabel(
    `${product.name.es || ""} ${product.name.pt || ""} ${product.name.en || ""}`,
  );
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

function findMatchingProduct(option: ModifierOption, products: MenuProduct[]): MenuProduct | undefined {
  const label = optionLabel(option);
  if (!label) return undefined;

  const exact = products.find((p) => productLabel(p) === label);
  if (exact) return exact;

  return products.find((p) => {
    const pl = productLabel(p);
    return pl.includes(label) || label.includes(pl);
  });
}

function inferDrinkRule(label: string): DrinkSizeRule | null {
  if (/2\s*l|2l|botella\s*2/.test(label)) return "2l";
  if (/33\s*cl|33cl|lata/.test(label)) return "33cl";
  if (/1[\.,]25|125\s*cl/.test(label)) return "125l";
  if (/agua peque|agua mineral peque/.test(label)) return "small_water";
  return null;
}

export function auditModifierOptionsAgainstCatalog(
  groups: ModifierGroup[],
  products: MenuProduct[],
): CatalogAuditIssue[] {
  const issues: CatalogAuditIssue[] = [];
  const seenOptions = new Set<string>();

  for (const group of groups) {
    if (!isDrinkGroup(group)) continue;
    const gName = groupLabel(group);

    for (const option of group.options ?? []) {
      const label = optionLabel(option);
      const display =
        option.name.es || option.name.pt || option.name.en || option.id;
      if (!label || seenOptions.has(option.id)) continue;
      seenOptions.add(option.id);

      const match = findMatchingProduct(option, products);
      if (!match) {
        issues.push({
          optionId: option.id,
          optionName: display,
          groupName: gName,
          severity: "error",
          problem: "Opção usada em combos mas sem produto editável no cardápio",
          suggestion: "Criar produto na categoria Bebidas para poder editar nome, imagem e preço",
          drinkRule: inferDrinkRule(label),
        });
        continue;
      }

      if (!match.image) {
        issues.push({
          optionId: option.id,
          optionName: display,
          groupName: gName,
          severity: "warning",
          problem: `Produto "${match.name.es || match.name.pt}" existe mas sem imagem`,
          suggestion: "Editar no cardápio e adicionar foto",
        });
      }
    }
  }

  return issues;
}

export function auditExpectedDrinkCatalog(products: MenuProduct[]): CatalogAuditIssue[] {
  const issues: CatalogAuditIssue[] = [];
  const labels = products.map(productLabel);

  (Object.entries(DEFAULT_DRINK_LABELS) as [DrinkSizeRule, string[]][]).forEach(([rule, expected]) => {
    for (const name of expected) {
      const normalized = normalizeLabel(name);
      const found = labels.some(
        (l) => l === normalized || l.includes(normalized) || normalized.includes(l),
      );
      if (!found) {
        issues.push({
          optionId: `expected-${rule}-${normalized}`,
          optionName: name,
          groupName: "Catálogo recomendado",
          severity: "warning",
          problem: `Bebida recomendada (${rule}) ausente do cardápio`,
          suggestion: "Adicionar na categoria Bebidas para combos e vendas avulsas",
          drinkRule: rule,
        });
      }
    }
  });

  return issues;
}

export function mergeCatalogAudits(lists: CatalogAuditIssue[][]): CatalogAuditIssue[] {
  const byKey = new Map<string, CatalogAuditIssue>();
  for (const issue of lists.flat()) {
    const key = `${issue.optionId}:${issue.problem}`;
    if (!byKey.has(key)) byKey.set(key, issue);
  }
  return [...byKey.values()];
}

export function catalogAuditSummary(issues: CatalogAuditIssue[]) {
  return {
    total: issues.length,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    missingProducts: issues.filter((i) => i.problem.includes("sem produto editável")).length,
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
      pt: option.name.pt || nameEs,
      en: option.name.en || nameEs,
      es: nameEs,
      fr: option.name.fr || nameEs,
    },
    description: { pt: "", en: "", es: "", fr: "" },
    price: (option as any).price ?? 0,
    image_url: option.imageUrl ?? null,
    is_active: true,
    is_bestseller: false,
    is_promo: false,
    sort_order: sortOrder,
    product_type: "simple" as const,
  };
}
