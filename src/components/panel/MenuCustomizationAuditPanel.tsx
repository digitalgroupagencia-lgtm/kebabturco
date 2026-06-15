import { useMemo, useState } from "react";
import { AlertTriangle, ClipboardCopy, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMenuData } from "@/hooks/useMenuData";
import {
  auditMenuProducts,
  auditSummary,
  type CustomizationAuditIssue,
} from "@/lib/modifiers/menuCustomizationAudit";
import { toast } from "sonner";
import { useStaffT } from "@/hooks/useStaffT";

function toReportText(issues: CustomizationAuditIssue[], emptyLabel: string): string {
  if (!issues.length) return emptyLabel;
  return issues
    .map(
      (i) =>
        `Produto: ${i.productName}\nProblema: ${i.problem}\nSugestão: ${i.suggestion}\n`,
    )
    .join("\n");
}

export default function MenuCustomizationAuditPanel() {
  const { products, loading } = useMenuData();
  const [open, setOpen] = useState(false);
  const { t } = useStaffT();
  const issues = useMemo(() => auditMenuProducts(products), [products]);
  const summary = useMemo(() => auditSummary(issues), [issues]);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(toReportText(issues, t("audit.custom.no_issues")));
      toast.success(t("audit.custom.toast.copied"));
    } catch {
      toast.error(t("welcome.copy_error"));
    }
  };

  if (loading) return null;

  return (
    <Card className="border-primary/20 mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              {t("audit.custom.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("audit.custom.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {open ? t("common.hide") : t("audit.custom.show_report")}
            </Button>
            {issues.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => void copyReport()}>
                <ClipboardCopy className="h-4 w-4 mr-1" />
                {t("common.copy")}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="font-semibold text-destructive">
            {summary.errors} {t("audit.custom.count.errors")}
          </span>
          <span className="font-semibold text-amber-600">
            {summary.warnings} {t("audit.custom.count.warnings")}
          </span>
          <span className="text-muted-foreground">
            {products.length} {t("audit.custom.count.analyzed")}
          </span>
        </div>

        {summary.errors === 0 && summary.warnings === 0 && (
          <p className="text-sm text-success font-medium">{t("audit.custom.all_ok")}</p>
        )}

        {open && issues.length > 0 && (
          <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {issues.map((issue, idx) => (
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
      </CardContent>
    </Card>
  );
}
