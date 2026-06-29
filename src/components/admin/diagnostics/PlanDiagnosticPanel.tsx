import { useCallback, useEffect, useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";
import AdminDiagnosticShell from "@/components/admin/diagnostics/AdminDiagnosticShell";
import AdminDiagnosticLogPanel from "@/components/admin/diagnostics/AdminDiagnosticLogPanel";
import AdminDiagnosticStatusBadge from "@/components/admin/diagnostics/AdminDiagnosticStatusBadge";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { planDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";
import { runPlanFeatureProbe, type PlanFeatureProbeRow } from "@/lib/diagnostics/planFeatureProbe";
import { PLAN_LABELS } from "@/lib/platformFeatures";
import type { DiagnosticLogEntry } from "@/lib/diagnostics/createDiagnosticLogger";

export default function PlanDiagnosticPanel() {
  const { storeId } = useAdminStoreId();
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>(() => planDiagnosticLogger.getLogs());
  const [tenantPlan, setTenantPlan] = useState<string>("start");
  const [rows, setRows] = useState<PlanFeatureProbeRow[]>([]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const result = await runPlanFeatureProbe(storeId);
    setTenantPlan(result.tenantPlan);
    setRows(result.rows);
    setRefreshing(false);
  }, [storeId]);

  useEffect(() => {
    void refresh();
    return planDiagnosticLogger.subscribe(() => setLogs(planDiagnosticLogger.getLogs()));
  }, [refresh]);

  return (
    <AdminDiagnosticShell
      title="Planos & funcionalidades"
      description="Verifica se cada funcionalidade está no plano, activa e operacional."
      icon={<CreditCard className="h-5 w-5 text-primary" />}
      storeSwitcher={<AdminStoreSwitcher hint="Algumas verificações dependem da loja." />}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      statusCards={
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Plano actual</p>
              <p className="text-2xl font-bold">{PLAN_LABELS[tenantPlan as keyof typeof PLAN_LABELS] ?? tenantPlan}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificação completa"}
            </Button>
          </CardContent>
        </Card>
      }
      testSection={
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matriz de funcionalidades</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.featureKey} className="rounded-lg border px-3 py-2 text-sm flex flex-wrap items-center gap-2 justify-between">
                  <div>
                    <p className="font-semibold">{r.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Plano mín. {r.minPlan.toUpperCase()} · {r.probeDetail}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <AdminDiagnosticStatusBadge ok={r.availableOnPlan} label={r.availableOnPlan ? "No plano" : "Bloqueado"} />
                    <AdminDiagnosticStatusBadge ok={r.enabledForTenant} label={r.enabledForTenant ? "Activo" : "Off"} />
                    {r.probeStatus !== "skip" ? (
                      <AdminDiagnosticStatusBadge ok={r.probeStatus === "ok"} label={r.probeStatus} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {!rows.length && !refreshing ? (
              <p className="text-sm text-muted-foreground">Nenhum resultado — verifique tenant.</p>
            ) : null}
          </CardContent>
        </Card>
      }
      logsPanel={
        <AdminDiagnosticLogPanel
          title="Logs de planos"
          logs={logs}
          onClear={() => {
            planDiagnosticLogger.clearLogs();
            setLogs([]);
          }}
        />
      }
    />
  );
}
