import { useCallback, useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";
import AdminDiagnosticShell from "@/components/admin/diagnostics/AdminDiagnosticShell";
import AdminDiagnosticLogPanel from "@/components/admin/diagnostics/AdminDiagnosticLogPanel";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { couponDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";
import {
  probeCouponDiagnostics,
  testCouponValidation,
} from "@/lib/diagnostics/couponTestService";
import type { DiagnosticLogEntry } from "@/lib/diagnostics/createDiagnosticLogger";

export default function CouponDiagnosticPanel() {
  const { storeId } = useAdminStoreId();
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>(() => couponDiagnosticLogger.getLogs());
  const [code, setCode] = useState("");
  const [subtotal, setSubtotal] = useState("25");
  const [stats, setStats] = useState<{ activeCoupons: number; totalCoupons: number; recentRedemptions: unknown[] } | null>(null);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(async () => {
    if (!storeId) return;
    setRefreshing(true);
    setStats(await probeCouponDiagnostics(storeId));
    setRefreshing(false);
  }, [storeId]);

  useEffect(() => {
    void refresh();
    return couponDiagnosticLogger.subscribe(() => setLogs(couponDiagnosticLogger.getLogs()));
  }, [refresh]);

  const runTest = async () => {
    if (!storeId || !code.trim()) {
      toast.error("Indique o código do cupão");
      return;
    }
    setTesting(true);
    try {
      const result = await testCouponValidation(storeId, code, parseFloat(subtotal) || 0);
      if (result.valid) toast.success(`Válido — desconto ${result.discount_amount}€`);
      else toast.error(result.error ?? "Cupão inválido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setTesting(false);
    }
  };

  return (
    <AdminDiagnosticShell
      title="Cupões"
      description="Validar cupão com subtotal simulado e ver utilizações recentes."
      icon={<Tag className="h-5 w-5 text-primary" />}
      storeSwitcher={<AdminStoreSwitcher />}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      statusCards={
        stats ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{stats.activeCoupons}</p>
                <p className="text-xs text-muted-foreground">cupões activos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{stats.totalCoupons}</p>
                <p className="text-xs text-muted-foreground">total criados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{stats.recentRedemptions.length}</p>
                <p className="text-xs text-muted-foreground">usos recentes (amostra)</p>
              </CardContent>
            </Card>
          </div>
        ) : null
      }
      testSection={
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Testar validação</CardTitle>
            <CardDescription>Chama validate_coupon como no checkout</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PROMO10" />
              </div>
              <div className="space-y-2">
                <Label>Subtotal simulado (€)</Label>
                <Input value={subtotal} onChange={(e) => setSubtotal(e.target.value)} type="number" min="0" step="0.01" />
              </div>
            </div>
            <Button disabled={testing || !storeId} onClick={() => void runTest()}>
              Validar cupão
            </Button>
          </CardContent>
        </Card>
      }
      logsPanel={
        <>
          {stats?.recentRedemptions.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Utilizações recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1">
                  {(stats.recentRedemptions as Array<{ customer_phone: string | null; discount_amount: number; created_at: string }>).map((r, i) => (
                    <li key={i} className="flex justify-between border-b py-1">
                      <span>{r.customer_phone ?? "—"}</span>
                      <span>-{r.discount_amount}€ · {new Date(r.created_at).toLocaleDateString("pt-PT")}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          <AdminDiagnosticLogPanel
            title="Logs de cupões"
            logs={logs}
            onClear={() => {
              couponDiagnosticLogger.clearLogs();
              setLogs([]);
            }}
          />
        </>
      }
    />
  );
}
