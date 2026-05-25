import { useEffect, type ElementType } from "react";
import { Link } from "react-router-dom";
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_BUILD_ID } from "@/lib/appCacheBust";
import { useOperationalDiagnostics, type DiagnosticStatus } from "@/features/ops/useOperationalDiagnostics";
import { nav } from "@/lib/navPaths";

function formatBuildStamp(id: string) {
  const n = Number(id);
  if (!Number.isFinite(n) || n < 1e12) return id;
  return new Date(n).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const { items, running, lastRun, run, failCount, warnCount } = useOperationalDiagnostics();

  useEffect(() => {
    void run();
  }, [run]);

  const critical = items.filter((i) => i.critical && i.status === "fail");
  const optional = items.filter((i) => i.id === "push" || i.id === "lovable-maps");

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Estado do sistema
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Verificação automática — pagamentos, mesas, impressão e versão publicada.
          </p>
          {lastRun && (
            <p className="text-xs text-muted-foreground mt-2">
              Última verificação:{" "}
              {lastRun.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              {" · "}
              Versão: {formatBuildStamp(APP_BUILD_ID)}
            </p>
          )}
        </div>
        <Button type="button" variant="outline" onClick={() => void run()} disabled={running} className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-1.5 ${running ? "animate-spin" : ""}`} />
          Verificar
        </Button>
      </div>

      {(failCount > 0 || warnCount > 0) && (
        <div
          className={`rounded-xl border-2 p-4 ${
            failCount > 0 ? "border-destructive/50 bg-destructive/5" : "border-amber-500/50 bg-amber-500/5"
          }`}
        >
          <p className="font-black text-base">
            {failCount > 0
              ? `${failCount} problema(s) — corrija antes de confiar em pagamentos online`
              : `${warnCount} aviso(s) — reveja quando puder`}
          </p>
          {critical.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {critical.slice(0, 3).map((c) => (
                <li key={c.id}>• {c.label}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-3">
        {items
          .filter((i) => !optional.some((o) => o.id === i.id))
          .map((item) => {
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
                    {item.action && (
                      <p className="text-sm font-semibold mt-2 text-foreground/90">O que fazer: {item.action}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {optional.length > 0 && (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground pt-2">Informação</p>
          <div className="space-y-3">
            {optional.map((item) => {
              const style = statusStyle[item.status];
              const Icon = style.icon;
              return (
                <Card key={item.id} className={`border ${style.ring}`}>
                  <CardContent className="p-4 flex gap-3">
                    <Icon className={`h-5 w-5 shrink-0 ${style.badge}`} />
                    <div>
                      <p className="font-bold text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                      {item.action && <p className="text-xs font-semibold mt-1">{item.action}</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
        <p className="font-bold">Fluxo ideal para si</p>
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground text-xs">
          <li>Eu envio alterações para o GitHub (automático).</li>
          <li>Você faz <strong>Sync + Publish</strong> na Lovable.</li>
          <li>Volta aqui e clique <strong>Verificar</strong> — todas as luzes verdes = pronto para operar.</li>
        </ol>
        <p className="text-xs text-muted-foreground pt-1">
          Pagamentos e mesas:{" "}
          <Link to={nav.admin("finance")} className="text-primary underline font-semibold">
            Recebimentos
          </Link>
          {" · "}
          <Link to={nav.panel("tables")} className="text-primary underline font-semibold">
            Mesas
          </Link>
        </p>
      </div>
    </div>
  );
};

export default DiagnosticsPage;
