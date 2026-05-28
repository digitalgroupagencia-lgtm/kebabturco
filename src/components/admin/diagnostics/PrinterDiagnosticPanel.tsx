import { useCallback, useEffect, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";
import AdminDiagnosticShell from "@/components/admin/diagnostics/AdminDiagnosticShell";
import AdminDiagnosticLogPanel from "@/components/admin/diagnostics/AdminDiagnosticLogPanel";
import AdminDiagnosticStatusBadge from "@/components/admin/diagnostics/AdminDiagnosticStatusBadge";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { printerDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";
import {
  probePrinterDiagnostics,
  runGuidedPrintTest,
  type PrinterDiagnosticsSnapshot,
} from "@/lib/diagnostics/printerDiagnostics";
import type { DiagnosticLogEntry } from "@/lib/diagnostics/createDiagnosticLogger";

export default function PrinterDiagnosticPanel() {
  const { storeId } = useAdminStoreId();
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState<PrinterDiagnosticsSnapshot | null>(null);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>(() => printerDiagnosticLogger.getLogs());
  const [testing, setTesting] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Restaurante");

  const refresh = useCallback(async () => {
    if (!storeId) return;
    setRefreshing(true);
    const snap = await probePrinterDiagnostics(storeId);
    setSnapshot(snap);
    const { data } = await supabase.from("company_settings").select("company_name").eq("store_id", storeId).maybeSingle();
    if (data?.company_name) setCompanyName(data.company_name);
    setRefreshing(false);
  }, [storeId]);

  useEffect(() => {
    void refresh();
    return printerDiagnosticLogger.subscribe(() => setLogs(printerDiagnosticLogger.getLogs()));
  }, [refresh]);

  const runTest = async (type: "basic" | "sample") => {
    if (!storeId) return;
    setTesting(type);
    const result = await runGuidedPrintTest(storeId, type, companyName);
    setTesting(null);
    if (result.ok) toast.success("Impressão concluída");
    else toast.error(result.error ?? "Falha no teste");
    void refresh();
  };

  return (
    <AdminDiagnosticShell
      title="Impressora"
      description="Bridge, fila print_jobs e testes de ticket."
      icon={<Printer className="h-5 w-5 text-primary" />}
      storeSwitcher={<AdminStoreSwitcher hint="Cada unidade tem a sua impressora." />}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      statusCards={
        snapshot ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Configuração</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminDiagnosticStatusBadge ok={snapshot.configEnabled} label={snapshot.configEnabled ? "Activa" : "Desactivada"} />
                <p className="text-xs mt-2 font-mono">{snapshot.ipAddress}:{snapshot.port}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Print Bridge</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminDiagnosticStatusBadge
                  ok={snapshot.bridgeStatus === "active"}
                  label={snapshot.bridgeStatus === "active" ? "Online" : snapshot.bridgeStatus}
                />
                {snapshot.bridgeLastSeen ? (
                  <p className="text-xs mt-2 text-muted-foreground">
                    Último sinal: {new Date(snapshot.bridgeLastSeen).toLocaleString("pt-PT")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Fila pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{snapshot.jobCounts.pending ?? 0}</p>
                <p className="text-xs text-muted-foreground">jobs aguardando</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Falhas recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{snapshot.jobCounts.failed ?? 0}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )
      }
      testSection={
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Testes de impressão</CardTitle>
            <CardDescription>Cria job na fila e aguarda até 45s pelo bridge</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button disabled={!storeId || testing !== null} onClick={() => void runTest("basic")}>
              {testing === "basic" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ticket teste
            </Button>
            <Button variant="outline" disabled={!storeId || testing !== null} onClick={() => void runTest("sample")}>
              {testing === "sample" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Pedido exemplo
            </Button>
          </CardContent>
        </Card>
      }
      logsPanel={
        <>
          {snapshot?.recentJobs.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Últimos jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 font-mono">
                  {snapshot.recentJobs.map((j) => (
                    <li key={j.id} className="flex justify-between gap-2 border-b py-1">
                      <span>{j.status}</span>
                      <span className="text-muted-foreground truncate">{new Date(j.created_at).toLocaleString("pt-PT")}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          <AdminDiagnosticLogPanel
            title="Logs de impressão"
            logs={logs}
            onClear={() => {
              printerDiagnosticLogger.clearLogs();
              setLogs([]);
            }}
          />
        </>
      }
    />
  );
}
