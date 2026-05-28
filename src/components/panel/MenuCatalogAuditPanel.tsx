import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Pencil, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import type { MenuProduct } from "@/hooks/useMenuData";
import type { ModifierGroup } from "@/lib/modifiers/types";
import {
  auditExpectedDrinkCatalog,
  auditModifierOptionsAgainstCatalog,
  buildProductPayloadFromIssue,
  buildProductPayloadFromOption,
  catalogAuditSummary,
  mergeCatalogAudits,
  type CatalogAuditIssue,
} from "@/lib/modifiers/menuCatalogAudit";
import { toast } from "sonner";

function asName(value: unknown): Record<string, string> {
  if (value && typeof value === "object") return value as Record<string, string>;
  return { es: "", pt: "", en: "", fr: "" };
}

async function fetchCatalogProducts(storeId: string): Promise<MenuProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, category_id, name, description, price, image_url, is_bestseller, is_promo, sort_order")
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

async function findDrinksCategoryId(storeId: string): Promise<string | null> {
  const { data } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("store_id", storeId)
    .order("sort_order");

  const match = (data ?? []).find((c) => {
    const name = c.name as Record<string, string>;
    const label = `${name?.es || ""} ${name?.pt || ""}`.toLowerCase();
    return /bebida|drink|boisson|refresco/i.test(label);
  });

  return match?.id ?? data?.[0]?.id ?? null;
}

export default function MenuCatalogAuditPanel() {
  const { storeId } = useAdminStoreId();
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const loadAuditData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [catalogProducts, drinkGroups] = await Promise.all([
        fetchCatalogProducts(storeId),
        fetchDrinkGroups(storeId),
      ]);
      setProducts(catalogProducts);
      setGroups(drinkGroups);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao auditar cardápio");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadAuditData();
  }, [loadAuditData]);

  const issues = useMemo(() => {
    if (!products.length) return [] as CatalogAuditIssue[];
    return mergeCatalogAudits([
      auditModifierOptionsAgainstCatalog(groups, products),
      auditExpectedDrinkCatalog(products),
    ]);
  }, [groups, products]);

  const summary = useMemo(() => catalogAuditSummary(issues), [issues]);

  const createProductForOption = async (issue: CatalogAuditIssue) => {
    if (!storeId || issue.action !== "create") {
      return;
    }

    const group = groups.find((g) =>
      (g.options ?? []).some((o) => o.id === issue.optionId),
    );
    const option = group?.options?.find((o) => o.id === issue.optionId);
    const isExpectedCatalogItem = issue.optionId.startsWith("expected-");
    if (!option && !isExpectedCatalogItem) return;

    setCreatingId(issue.optionId);
    try {
      const categoryId = await findDrinksCategoryId(storeId);
      if (!categoryId) {
        toast.error("Crie primeiro uma categoria Bebidas");
        return;
      }

      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", categoryId);

      const payload = option
        ? buildProductPayloadFromOption(option, categoryId, storeId, (count ?? 0) + 1)
        : buildProductPayloadFromIssue(issue, categoryId, storeId, (count ?? 0) + 1);
      if (!(payload as { image_url?: string | null }).image_url) {
        (payload as { image_url?: string | null }).image_url = "/product-placeholder.svg";
      }

      const { error } = await supabase.from("products").insert(payload as never);
      if (error) throw error;

      toast.success(`"${issue.optionName}" adicionado ao cardápio`);
      await loadAuditData();
      window.dispatchEvent(
        new CustomEvent("menu-catalog-audit-product-created", { detail: { categoryId } }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar produto");
    } finally {
      setCreatingId(null);
    }
  };

  const reviewProduct = (issue: CatalogAuditIssue) => {
    if (!issue.matchedProductId) return;
    window.dispatchEvent(
      new CustomEvent("menu-catalog-audit-review-product", {
        detail: {
          productId: issue.matchedProductId,
          categoryId: issue.matchedCategoryId,
        },
      }),
    );
  };

  if (loading) {
    return (
      <Card className="border-primary/20 mb-6">
        <CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          A auditar opções do cardápio…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 mb-6 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Auditoria de opções do cardápio
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Mostra o que falta criar e o que já existe mas convém rever (foto, nome ou preço).
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void loadAuditData()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
              {open ? "Ocultar" : "Ver relatório"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="font-semibold text-destructive">{summary.errors} a criar</span>
          <span className="font-semibold text-amber-600">{summary.warnings} a rever</span>
          <span className="text-muted-foreground">{products.length} produtos no cardápio</span>
        </div>

        {summary.total === 0 && (
          <p className="text-sm text-success font-medium">
            Todas as bebidas de combo estão no cardápio e não precisam de revisão.
          </p>
        )}

        {open && issues.length > 0 && (
          <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {issues.map((issue) => (
              <li
                key={`${issue.optionId}-${issue.action}-${issue.problem}`}
                className={`rounded-xl border p-3 text-sm ${
                  issue.action === "create"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 mt-0.5 ${
                      issue.action === "create" ? "text-destructive" : "text-amber-600"
                    }`}
                  />
                  <div className="flex-1 space-y-1">
                    <p className="font-bold">{issue.optionName}</p>
                    <p className="text-xs text-muted-foreground">{issue.groupName}</p>
                    {issue.matchedProductName && issue.action === "review" && (
                      <p className="text-xs text-muted-foreground">
                        No cardápio como: <span className="font-medium">{issue.matchedProductName}</span>
                      </p>
                    )}
                    <p>
                      <span className="font-semibold">Problema:</span> {issue.problem}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Sugestão:</span>{" "}
                      {issue.suggestion}
                    </p>
                    {issue.action === "create" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="mt-2 h-8"
                        disabled={creatingId === issue.optionId}
                        onClick={() => void createProductForOption(issue)}
                      >
                        {creatingId === issue.optionId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 mr-1" />
                        )}
                        Criar no cardápio
                      </Button>
                    )}
                    {issue.action === "review" && issue.matchedProductId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="mt-2 h-8"
                        onClick={() => reviewProduct(issue)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Rever no cardápio
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
