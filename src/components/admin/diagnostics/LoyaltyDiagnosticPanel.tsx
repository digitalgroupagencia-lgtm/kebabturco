import { useCallback, useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";
import AdminDiagnosticShell from "@/components/admin/diagnostics/AdminDiagnosticShell";
import AdminDiagnosticLogPanel from "@/components/admin/diagnostics/AdminDiagnosticLogPanel";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { loyaltyDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";
import {
  addTestLoyaltyStamp,
  probeLoyaltyDiagnostics,
  simulateLoyaltyRule,
  testLoyaltyStatus,
  type LoyaltyDiagnosticsSnapshot,
} from "@/lib/diagnostics/loyaltyTestService";
import type { DiagnosticLogEntry } from "@/lib/diagnostics/createDiagnosticLogger";

export default function LoyaltyDiagnosticPanel() {
  const { storeId } = useAdminStoreId();
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState<LoyaltyDiagnosticsSnapshot | null>(null);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>(() => loyaltyDiagnosticLogger.getLogs());
  const [phone, setPhone] = useState("");
  const [simStamps, setSimStamps] = useState("7");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!storeId) return;
    setRefreshing(true);
    setSnapshot(await probeLoyaltyDiagnostics(storeId));
    setRefreshing(false);
  }, [storeId]);

  useEffect(() => {
    void refresh();
    return loyaltyDiagnosticLogger.subscribe(() => setLogs(loyaltyDiagnosticLogger.getLogs()));
  }, [refresh]);

  const runSimulate = async () => {
    const stamps = parseInt(simStamps, 10) || 0;
    const r = await simulateLoyaltyRule(phone || "simulado", stamps);
    toast.info(r.rewardReady ? "Prémio pronto (simulação)" : `Faltam ${r.remaining} carimbos`);
  };

  const runStatus = async () => {
    if (!storeId || !phone.trim()) {
      toast.error("Indique telefone");
      return;
    }
    setBusy(true);
    try {
      const s = await testLoyaltyStatus(storeId, phone);
      toast.success(`${s.stamps ?? 0} carimbos · prémio: ${s.reward_ready ? "sim" : "não"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const runAddStamp = async () => {
    if (!storeId || !phone.trim()) {
      toast.error("Indique telefone para teste real");
      return;
    }
    setBusy(true);
    const r = await addTestLoyaltyStamp(storeId, phone);
    setBusy(false);
    if (r.ok) {
      toast.success("Carimbo adicionado");
      void refresh();
    } else toast.error(r.error ?? "Erro");
  };

  return (
    <AdminDiagnosticShell
      title="Fidelidade"
      description="Carimbos, regra 10=prémio e consulta por telefone."
      icon={<Gift className="h-5 w-5 text-primary" />}
      storeSwitcher={<AdminStoreSwitcher />}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      statusCards={
        snapshot ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{snapshot.accountCount}</p>
                <p className="text-xs text-muted-foreground">clientes (top 10)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-emerald-600">{snapshot.readyRewards}</p>
                <p className="text-xs text-muted-foreground">prémios prontos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{snapshot.activeCampaigns}</p>
                <p className="text-xs text-muted-foreground">campanhas activas</p>
              </CardContent>
            </Card>
          </div>
        ) : null
      }
      testSection={
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Testes</CardTitle>
            <CardDescription>Simulação não altera dados; carimbo real altera a conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Telefone (consulta / carimbo real)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34..." />
            </div>
            <div className="space-y-2">
              <Label>Carimbos (simulação)</Label>
              <Input value={simStamps} onChange={(e) => setSimStamps(e.target.value)} type="number" min="0" max="20" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void runSimulate()}>Simular regra</Button>
              <Button variant="outline" disabled={busy} onClick={() => void runStatus()}>Consultar estado</Button>
              <Button disabled={busy} onClick={() => void runAddStamp()}>Adicionar carimbo (real)</Button>
            </div>
          </CardContent>
        </Card>
      }
      logsPanel={
        <>
          {snapshot?.topAccounts.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1">
                  {snapshot.topAccounts.map((a) => (
                    <li key={a.phone} className="flex justify-between border-b py-1">
                      <span>{a.phone}</span>
                      <span>{a.stamps}/10 · {a.total_orders} pedidos</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          <AdminDiagnosticLogPanel
            title="Logs de fidelidade"
            logs={logs}
            onClear={() => {
              loyaltyDiagnosticLogger.clearLogs();
              setLogs([]);
            }}
          />
        </>
      }
    />
  );
}
