import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MenuProduct } from "@/hooks/useMenuData";
import type { ModifierGroup } from "@/lib/modifiers/types";
import {
  auditExpectedDrinkCatalog,
  auditModifierOptionsAgainstCatalog,
  catalogAuditSummary,
  mergeCatalogAudits,
  type CatalogAuditIssue,
} from "@/lib/modifiers/menuCatalogAudit";
import {
  approveProductReview,
  approvedIdsFromProducts,
  persistProductReviewApproval,
  readApprovedProductIds,
  syncLocalReviewApprovalsToDb,
} from "@/lib/modifiers/menuCatalogReviewStorage";

function asName(value: unknown): Record<string, string> {
  if (value && typeof value === "object") return value as Record<string, string>;
  return { es: "", pt: "", en: "", fr: "" };
}

async function fetchCatalogProducts(storeId: string): Promise<MenuProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, category_id, name, description, price, image_url, is_bestseller, is_promo, sort_order, catalog_review_ok")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;

  return (data ?? []).map((row) => {
    const name = asName(row.name);
    return {
      id: row.id,
      name,
      description: asName(row.description),
      price: Number(row.price || 0),
      image: row.image_url || "",
      category: row.category_id,
      categorySlug: "",
      isBestseller: Boolean(row.is_bestseller),
      isPromo: Boolean(row.is_promo),
      sortOrder: row.sort_order ?? 0,
      catalogReviewOk: Boolean(row.catalog_review_ok),
      extras: [],
      ingredients: [],
    } as MenuProduct;
  });
}

async function fetchDrinkGroups(storeId: string): Promise<ModifierGroup[]> {
  const { data: groups } = await (supabase
    .from("modifier_groups" as never)
    .select("id, name, group_kind, sort_order, is_active")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order") as never);

  const groupsTyped = (groups ?? []) as Array<Record<string, unknown>>;
  if (!groupsTyped.length) return [];

  const ids = groupsTyped.map((g) => g.id as string);
  const { data: options } = await (supabase
    .from("modifier_options" as never)
    .select("id, group_id, name, price, image_url, sort_order, is_active")
    .in("group_id", ids)
    .eq("is_active", true)
    .order("sort_order") as never);

  const optionsTyped = (options ?? []) as Array<Record<string, unknown>>;

  return groupsTyped.map((g) => ({
    id: g.id as string,
    name: g.name as ModifierGroup["name"],
    groupKind: g.group_kind as ModifierGroup["groupKind"],
    options: optionsTyped
      .filter((o) => o.group_id === g.id)
      .map((o) => ({
        id: o.id as string,
        name: o.name as ModifierGroup["options"][0]["name"],
        price: Number(o.price ?? 0),
        imageUrl: (o.image_url as string | null) ?? undefined,
      })),
  })) as unknown as ModifierGroup[];
}

export function useMenuCatalogAudit(storeId: string | null) {
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(() =>
    storeId ? readApprovedProductIds(storeId) : new Set(),
  );

  const loadAuditData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const localApprovals = readApprovedProductIds(storeId);
      const [catalogProducts, drinkGroups] = await Promise.all([
        fetchCatalogProducts(storeId),
        fetchDrinkGroups(storeId),
      ]);
      setProducts(catalogProducts);
      setGroups(drinkGroups);
      setApprovedIds(approvedIdsFromProducts(catalogProducts, storeId));
      if (localApprovals.size > 0) {
        void syncLocalReviewApprovalsToDb(storeId, localApprovals);
      }
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadAuditData();
  }, [loadAuditData]);

  useEffect(() => {
    if (!storeId) return;
    setApprovedIds(readApprovedProductIds(storeId));
  }, [storeId]);

  const issues = useMemo(() => {
    if (!products.length) return [] as CatalogAuditIssue[];
    return mergeCatalogAudits([
      auditModifierOptionsAgainstCatalog(groups, products),
      auditExpectedDrinkCatalog(products),
    ]);
  }, [groups, products]);

  const reviewIssues = useMemo(
    () =>
      issues.filter(
        (issue) =>
          issue.action === "review" &&
          issue.matchedProductId &&
          !approvedIds.has(issue.matchedProductId),
      ),
    [issues, approvedIds],
  );

  const createIssues = useMemo(
    () => issues.filter((issue) => issue.action === "create"),
    [issues],
  );

  const summary = useMemo(() => {
    const base = catalogAuditSummary(issues);
    return {
      ...base,
      warnings: reviewIssues.length,
      total: createIssues.length + reviewIssues.length,
    };
  }, [issues, reviewIssues, createIssues]);

  const approveReview = useCallback(
    async (productId: string) => {
      if (!storeId) return;
      try {
        const next = await persistProductReviewApproval(storeId, productId);
        setApprovedIds(next);
        setProducts((prev) =>
          prev.map((product) =>
            product.id === productId ? { ...product, catalogReviewOk: true } : product,
          ),
        );
        window.dispatchEvent(
          new CustomEvent("menu-catalog-product-approved", { detail: { productId } }),
        );
      } catch {
        setApprovedIds(approveProductReview(storeId, productId));
      }
    },
    [storeId],
  );

  return {
    products,
    groups,
    loading,
    issues,
    reviewIssues,
    createIssues,
    summary,
    loadAuditData,
    approveReview,
  };
}
