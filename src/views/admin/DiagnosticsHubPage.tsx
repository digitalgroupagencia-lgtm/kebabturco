import { useSearchParams } from "react-router-dom";
import {
  Activity,
  Bell,
  CreditCard,
  Gift,
  Megaphone,
  Printer,
  Tag,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { nav } from "@/lib/navPaths.ts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PushDiagnosticPanel from "@/components/admin/diagnostics/PushDiagnosticPanel";
import PrinterDiagnosticPanel from "@/components/admin/diagnostics/PrinterDiagnosticPanel";
import CouponDiagnosticPanel from "@/components/admin/diagnostics/CouponDiagnosticPanel";
import LoyaltyDiagnosticPanel from "@/components/admin/diagnostics/LoyaltyDiagnosticPanel";
import CampaignDiagnosticPanel from "@/components/admin/diagnostics/CampaignDiagnosticPanel";
import PlanDiagnosticPanel from "@/components/admin/diagnostics/PlanDiagnosticPanel";
import { useFullAppAudit } from "@/hooks/useFullAppAudit";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import type { AuditSeverity } from "@/services/adminSystemAudit";

const TABS = [
  { id: "overview", label: "Visão geral", icon: Activity },
  { id: "push", label: "Push", icon: Bell },
  { id: "printer", label: "Impressora", icon: Printer },
  { id: "coupons", label: "Cupões", icon: Tag },
  { id: "loyalty", label: "Fidelidade", icon: Gift },
  { id: "campaigns", label: "Campanhas", icon: Megaphone },
  { id: "plans", label: "Planos", icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]["id"];

const FULL_PAGE_LINKS: Partial<Record<TabId, string>> = {
  push: nav.admin("push-test"),
  printer: nav.admin("printer"),
  coupons: nav.admin("coupons"),
  loyalty: nav.admin("loyalty"),
  plans: nav.admin("plans"),
};

const SEV_ICON: Record<AuditSeverity, typeof CheckCircle2> = {
  ok: CheckCircle2,
  suggestion: Activity,
  warning: AlertTriangle,
  critical: XCircle,
};

export default function DiagnosticsHubPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabId) || "overview";
  const validTab = TABS.some((t) => t.id === tab) ? tab : "overview";
  const { storeId } = useAdminStoreId();
  const { tenant } = useSelectedTenant();
  const { report, running, run } = useFullAppAudit(storeId, tenant?.id ?? null);

  const topIssues = report?.allFindings.filter((f) => f.severity !== "ok").slice(0, 5) ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Centro de testes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Testes interactivos por módulo e ligação à auditoria completa do sistema.
        </p>
      </div>

      <Tabs
        value={validTab}
        onValueChange={(v) => setParams({ tab: v })}
        className="w-full"
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5 text-xs sm:text-sm">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-bold">Auditoria completa</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifica cliente, equipa, delivery, pagamentos, RPCs e servidores num só relatório.
                  </p>
                  {report && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Última execução: {new Date(report.ranAt).toLocaleString("pt-PT")} ·{" "}
                      {report.summary.ok} OK · {report.summary.totalIssues} problema(s)
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => void run()} disabled={running}>
                    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-1.5">{running ? "A auditar…" : "Auditar tudo"}</span>
                  </Button>
                  <Button asChild size="sm">
                    <Link to={nav.admin("diagnostics")}>
                      Ver relatório
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>

              {!report && !running && (
                <p className="text-sm text-muted-foreground border-t pt-4">
                  Ainda não há auditoria guardada. Clique em <strong>Auditar tudo</strong> ou abra{" "}
                  <Link to={nav.admin("diagnostics")} className="text-primary underline">
                    Estado do sistema
                  </Link>
                  .
                </p>
              )}

              {topIssues.length > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Principais alertas
                  </p>
                  {topIssues.map((f) => {
                    const Icon = SEV_ICON[f.severity];
                    return (
                      <div key={f.id} className="flex items-start gap-2 text-sm">
                        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{f.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {report && report.summary.totalIssues === 0 && (
                <div className="flex items-center gap-2 text-sm text-success border-t pt-4">
                  <CheckCircle2 className="h-4 w-4" />
                  Última auditoria sem problemas detectados.
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground">
            Use as outras tabs para testes manuais (enviar push, imprimir teste, validar cupões, etc.).
          </p>
        </TabsContent>

        {TABS.filter((t) => t.id !== "overview").map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-4 space-y-4">
            {FULL_PAGE_LINKS[t.id] ? (
              <p className="text-xs text-muted-foreground">
                <Link to={FULL_PAGE_LINKS[t.id]!} className="text-primary underline">
                  Abrir página operacional completa
                </Link>
              </p>
            ) : null}
            {t.id === "push" && <PushDiagnosticPanel embedded showStoreSwitcher />}
            {t.id === "printer" && <PrinterDiagnosticPanel />}
            {t.id === "coupons" && <CouponDiagnosticPanel />}
            {t.id === "loyalty" && <LoyaltyDiagnosticPanel />}
            {t.id === "campaigns" && <CampaignDiagnosticPanel />}
            {t.id === "plans" && <PlanDiagnosticPanel />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
