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

function toReportText(issues: CustomizationAuditIssue[]): string {
  if (!issues.length) return "Nenhuma inconsistência detectada.";
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
  const issues = useMemo(() => auditMenuProducts(products), [products]);
  const summary = useMemo(() => auditSummary(issues), [issues]);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(toReportText(issues));
      toast.success("Relatório copiado");
    } catch {
      toast.error("Não foi possível copiar");
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
              Auditoria de personalização
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Revê automaticamente todos os produtos e detecta escolhas incoerentes (ex.: pedir carne num produto que já é pollo).
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {open ? "Ocultar" : "Ver relatório"}
            </Button>
            {issues.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => void copyReport()}>
                <ClipboardCopy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="font-semibold text-destructive">{summary.errors} erros</span>
          <span className="font-semibold text-amber-600">{summary.warnings} avisos</span>
          <span className="text-muted-foreground">{products.length} produtos analisados</span>
        </div>

        {summary.errors === 0 && summary.warnings === 0 && (
          <p className="text-sm text-success font-medium">Cardápio coerente — nenhum problema detectado.</p>
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
                      <span className="font-semibold">Problema:</span> {issue.problem}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Sugestão:</span> {issue.suggestion}
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
