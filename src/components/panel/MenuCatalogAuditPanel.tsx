import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCopy, Loader2, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useMenuCatalogAudit } from "@/hooks/useMenuCatalogAudit";
import { useMenuData } from "@/hooks/useMenuData";
import {
  buildProductPayloadFromIssue,
  buildProductPayloadFromOption,
  type CatalogAuditIssue,
} from "@/lib/modifiers/menuCatalogAudit";
import {
  auditMenuProducts,
  auditSummary,
  type CustomizationAuditIssue,
} from "@/lib/modifiers/menuCustomizationAudit";
import { toast } from "sonner";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";

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

function toCustomizationReport(issues: CustomizationAuditIssue[], emptyLabel: string): string {
  if (!issues.length) return emptyLabel;
  return issues
    .map(
      (i) =>
        `Produto: ${i.productName}\nProblema: ${i.problem}\nSugestão: ${i.suggestion}\n`,
    )
    .join("\n");
}

export default function MenuCatalogAuditPanel() {
  const { storeId } = useAdminStoreId();
  const { loading, createIssues, summary, groups, products, loadAuditData } = useMenuCatalogAudit(storeId);
  const { products: menuProducts, loading: menuLoading } = useMenuData();
  const [openCreate, setOpenCreate] = useState(false);
  const [openCustom, setOpenCustom] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [creatingAll, setCreatingAll] = useState(false);
  const { t, lang } = useStaffT();

  const customizationIssues = useMemo(() => auditMenuProducts(menuProducts), [menuProducts]);
  const customizationSummary = useMemo(() => auditSummary(customizationIssues), [customizationIssues]);

  useEffect(() => {
    if (createIssues.length > 0) setOpenCreate(true);
  }, [createIssues.length]);

  useEffect(() => {
    const refresh = () => void loadAuditData();
    window.addEventListener("menu-catalog-product-approved", refresh);
    return () => window.removeEventListener("menu-catalog-product-approved", refresh);
  }, [loadAuditData]);

  const createProductForOption = async (issue: CatalogAuditIssue): Promise<boolean> => {
    if (!storeId || issue.action !== "create") {
      return false;
    }

    const group = groups.find((g) =>
      (g.options ?? []).some((o) => o.id === issue.optionId),
    );
    const option = group?.options?.find((o) => o.id === issue.optionId);
    const isExpectedCatalogItem = issue.optionId.startsWith("expected-");
    if (!option && !isExpectedCatalogItem) return false;

    setCreatingId(issue.optionId);
    try {
      const categoryId = await findDrinksCategoryId(storeId);
      if (!categoryId) {
        toast.error(t("audit.catalog.toast.no_category"));
        return false;
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

      toast.success(panelT(lang, "audit.catalog.toast.added", { name: issue.optionName }));
      await loadAuditData();
      window.dispatchEvent(
        new CustomEvent("menu-catalog-audit-product-created", { detail: { categoryId } }),
      );
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("audit.catalog.toast.error"));
      return false;
    } finally {
      setCreatingId(null);
    }
  };

  const createAllMissingDrinks = async () => {
    if (!createIssues.length || creatingAll) return;
    setCreatingAll(true);
    let created = 0;
    try {
      for (const issue of createIssues) {
        const ok = await createProductForOption(issue);
        if (ok) created += 1;
      }
      if (created > 0) {
        toast.success(t("audit.catalog.create_all_done"));
      }
    } finally {
      setCreatingAll(false);
    }
  };

  const missing2lIssues = useMemo(
    () => createIssues.filter((issue) => issue.drinkRule === "2l"),
    [createIssues],
  );

  const createMissing2lDrinks = async () => {
    if (!missing2lIssues.length || creatingAll) return;
    setCreatingAll(true);
    let created = 0;
    try {
      for (const issue of missing2lIssues) {
        const ok = await createProductForOption(issue);
        if (ok) created += 1;
      }
      if (created > 0) {
        toast.success(t("audit.catalog.create_all_done"));
        window.dispatchEvent(new CustomEvent("menu-catalog-audit-product-created"));
      }
    } finally {
      setCreatingAll(false);
    }
  };

  const copyCustomizationReport = async () => {
    try {
      await navigator.clipboard.writeText(
        toCustomizationReport(customizationIssues, t("audit.custom.no_issues")),
      );
      toast.success(t("audit.custom.toast.copied"));
    } catch {
      toast.error(t("welcome.copy_error"));
    }
  };

  const allOk =
    summary.total === 0 &&
    customizationSummary.errors === 0 &&
    customizationSummary.warnings === 0;

  if (loading || menuLoading) {
    return (
      <Card className="border-primary/20 mb-6">
        <CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("audit.catalog.loading")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="menu-catalog-audit" className="border-primary/20 mb-6 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              {t("audit.unified.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("audit.unified.subtitle")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadAuditData()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {t("common.refresh")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="font-semibold text-destructive">
            {summary.errors} {t("audit.catalog.count.create")}
          </span>
          <span className="font-semibold text-amber-600">
            {summary.warnings} {t("audit.catalog.count.review")}
          </span>
          <span className="font-semibold text-destructive">
            {customizationSummary.errors} {t("audit.custom.count.errors")}
          </span>
          <span className="font-semibold text-amber-600">
            {customizationSummary.warnings} {t("audit.custom.count.warnings")}
          </span>
          <span className="text-muted-foreground">
            {products.length} {t("audit.catalog.count.products")}
          </span>
        </div>

        {allOk && (
          <p className="text-sm text-success font-medium">{t("audit.unified.all_ok")}</p>
        )}

        {missing2lIssues.length > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 space-y-3">
            <p className="text-sm font-semibold text-destructive">
              {panelT(lang, "menu.drinks.missing_2l", {
                names: missing2lIssues.map((i) => i.optionName).join(", "),
              })}
            </p>
            <Button
              type="button"
              size="sm"
              disabled={creatingAll || !!creatingId}
              onClick={() => void createMissing2lDrinks()}
            >
              {creatingAll ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {panelT(lang, "menu.drinks.add_2l_btn")}
            </Button>
          </div>
        )}

        {createIssues.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t("audit.catalog.title")}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={creatingAll || !!creatingId}
                  onClick={() => void createAllMissingDrinks()}
                >
                  {creatingAll ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  {t("audit.catalog.create_all_btn")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setOpenCreate((v) => !v)}>
                  {openCreate ? t("audit.catalog.hide") : t("audit.catalog.show_create")}
                </Button>
              </div>
            </div>
            {openCreate && (
              <ul className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {createIssues.map((issue) => (
                  <li
                    key={`${issue.optionId}-${issue.problem}`}
                    className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                      <div className="flex-1 space-y-1">
                        <p className="font-bold">{issue.optionName}</p>
                        <p className="text-xs text-muted-foreground">{issue.groupName}</p>
                        <p>
                          <span className="font-semibold">{t("audit.catalog.problem")}</span> {issue.problem}
                        </p>
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
                          {t("audit.catalog.create_btn")}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {customizationIssues.length > 0 && (
          <div className="space-y-2 border-t border-border/50 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t("audit.custom.title")}</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpenCustom((v) => !v)}>
                  {openCustom ? t("common.hide") : t("audit.custom.show_report")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void copyCustomizationReport()}>
                  <ClipboardCopy className="h-4 w-4 mr-1" />
                  {t("common.copy")}
                </Button>
              </div>
            </div>
            {openCustom && (
              <ul className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {customizationIssues.map((issue, idx) => (
                  <li
                    key={`${issue.productId}-${idx}`}
                    className={`rounded-xl border p-3 text-sm ${
                      issue.severity === "error"
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-amber-500/30 bg-amber-500/5"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 shrink-0 mt-0.5 ${issue.severity === "error" ? "text-destructive" : "text-amber-600"}`}
                      />
                      <div className="space-y-1">
                        <p className="font-bold">{issue.productName}</p>
                        <p>
                          <span className="font-semibold">{t("audit.catalog.problem")}</span> {issue.problem}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">{t("audit.custom.suggestion")}</span>{" "}
                          {issue.suggestion}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
