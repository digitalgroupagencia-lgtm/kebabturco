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
  const { t, lang } = useStaffT();

  const customizationIssues = useMemo(() => auditMenuProducts(menuProducts), [menuProducts]);
  const customizationSummary = useMemo(() => auditSummary(customizationIssues), [customizationIssues]);

  useEffect(() => {
    const refresh = () => void loadAuditData();
    window.addEventListener("menu-catalog-product-approved", refresh);
    return () => window.removeEventListener("menu-catalog-product-approved", refresh);
  }, [loadAuditData]);

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
        toast.error(t("audit.catalog.toast.no_category"));
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

      toast.success(panelT(lang, "audit.catalog.toast.added", { name: issue.optionName }));
      await loadAuditData();
      window.dispatchEvent(
        new CustomEvent("menu-catalog-audit-product-created", { detail: { categoryId } }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("audit.catalog.toast.error"));
    } finally {
      setCreatingId(null);
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
    <Card className="border-primary/20 mb-6 shadow-sm">
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

        {createIssues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t("audit.catalog.title")}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenCreate((v) => !v)}>
                {openCreate ? t("audit.catalog.hide") : t("audit.catalog.show_create")}
              </Button>
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
