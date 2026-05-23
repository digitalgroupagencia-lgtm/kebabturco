import { useEffect, type ElementType } from "react";
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOperationalDiagnostics, type DiagnosticStatus } from "@/features/ops/useOperationalDiagnostics";

const statusStyle: Record<
  DiagnosticStatus,
  { icon: ElementType; ring: string; badge: string; label: string }
> = {
  ok: {
    icon: CheckCircle2,
    ring: "border-success/40 bg-success/5",
    badge: "text-success",
    label: "OK",
  },
  warn: {
    icon: AlertTriangle,
    ring: "border-amber-500/40 bg-amber-500/5",
    badge: "text-amber-600",
    label: "Atenção",
  },
  fail: {
    icon: XCircle,
    ring: "border-destructive/40 bg-destructive/5",
    badge: "text-destructive",
    label: "Problema",
  },
  pending: {
    icon: Loader2,
    ring: "border-border bg-muted/30",
    badge: "text-muted-foreground",
    label: "…",
  },
};

const DiagnosticsPage = () => {
  const { items, running, lastRun, run } = useOperationalDiagnostics();

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Diagnóstico operacional
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Seis luzes do sistema — o que está verde, amarelo ou vermelho agora.
          </p>
          {lastRun && (
            <p className="text-xs text-muted-foreground mt-2">
              Última verificação:{" "}
              {lastRun.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </div>
        <Button type="button" variant="outline" onClick={() => void run()} disabled={running} className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-1.5 ${running ? "animate-spin" : ""}`} />
          Verificar
        </Button>
      </div>

      <div className="space-y-3">
        {(items.length ? items : [{ id: "loading", label: "A verificar…", status: "pending" as const, detail: "" }]).map(
          (item) => {
            const style = statusStyle[item.status];
            const Icon = style.icon;
            return (
              <Card key={item.id} className={`border-2 ${style.ring}`}>
                <CardContent className="p-4 flex gap-3">
                  <Icon
                    className={`h-6 w-6 shrink-0 mt-0.5 ${style.badge} ${item.status === "pending" ? "animate-spin" : ""}`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-base">{item.label}</p>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>
                    {item.detail && <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>}
                  </div>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      <p className="text-xs text-muted-foreground border-t pt-4">
        Objectivo pós-estabilização: todas as luzes verdes excepto Push (opcional). Se algo falhar, corrigir antes de
        activar novas funcionalidades premium.
      </p>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Segurança (scanner Lovable)</p>
        <p className="text-xs text-muted-foreground">
          Avisos laranja do scanner — revisão manual sem afectar operação diária. Correr{" "}
          <code className="text-[10px]">supabase/diagnostics/phase0_security_audit.sql</code> no SQL Editor.
        </p>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
          <li>Telefones clientes (customers) — RLS por tenant; fases 1–2 SQL</li>
          <li>Chaves push (push_subscriptions) — só staff autenticado; fase 3 SQL</li>
          <li>Stripe Connect — rotas autenticadas; sem exposição anon</li>
          <li>Campos pedido públicos — get_order_public limita o que o cliente vê; fase 8 OK</li>
        </ul>
      </div>
    </div>
  );
};

export default DiagnosticsPage;
