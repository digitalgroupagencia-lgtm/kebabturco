import { useCallback, useState, useMemo, type ElementType } from "react";
import { Link } from "react-router-dom";
import { nav } from "@/lib/navPaths.ts";
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ChefHat,
  ShoppingBag,
  CreditCard,
  Truck,
  QrCode,
  Users,
  Server,
  Printer,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_BUILD_ID } from "@/lib/appCacheBust";
import { useOperationalDiagnostics, type DiagnosticItem } from "@/features/ops/useOperationalDiagnostics";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import {
  fetchAdminSystemAudit,
  type AuditFinding,
  type AuditCategory,
  type AuditSeverity,
} from "@/services/adminSystemAudit";

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

const CATEGORY_META: Record<AuditCategory, { label: string; icon: ElementType }> = {
  menu: { label: "Cardápio", icon: ChefHat },
  orders: { label: "Pedidos", icon: ShoppingBag },
  payments: { label: "Pagamentos", icon: CreditCard },
  delivery: { label: "Delivery", icon: Truck },
  tables: { label: "Mesas & QR", icon: QrCode },
  team: { label: "Equipe & Permissões", icon: Users },
  system: { label: "Sistema", icon: Server },
  printing: { label: "Impressão", icon: Printer },
};

const SEVERITY_META: Record<
  AuditSeverity,
  { label: string; ring: string; badge: string; icon: ElementType; order: number }
> = {
  critical: {
    label: "CRÍTICO",
    ring: "border-destructive/50 bg-destructive/5",
    badge: "bg-destructive text-destructive-foreground",
    icon: XCircle,
    order: 0,
  },
  warning: {
    label: "ATENÇÃO",
    ring: "border-amber-500/50 bg-amber-500/5",
    badge: "bg-amber-500 text-white",
    icon: AlertTriangle,
    order: 1,
  },
  suggestion: {
    label: "SUGESTÃO",
    ring: "border-sky-500/40 bg-sky-500/5",
    badge: "bg-sky-500 text-white",
    icon: Activity,
    order: 2,
  },
  ok: {
    label: "OK",
    ring: "border-success/40 bg-success/5",
    badge: "bg-success text-success-foreground",
    icon: CheckCircle2,
    order: 3,
  },
};

/** Converte item legado (pagamentos/sistema) em finding com severidade. */
function legacyToFindings(items: DiagnosticItem[]): AuditFinding[] {
  return items
    .filter((i) => i.status !== "ok" && i.status !== "pending")
    .map((i) => {
      const sev: AuditSeverity =
        i.status === "fail" ? (i.critical ? "critical" : "warning") : "warning";
      // Classifica por id em categorias
      const isPayment =
        i.id.startsWith("stripe-") ||
        i.id === "database" ||
        i.id.includes("payment") ||
        i.id.includes("webhook");
      const cat: AuditCategory = isPayment ? "payments" : "system";
      return {
        id: `legacy-${i.id}`,
        category: cat,
        severity: sev,
        label: i.label,
        detail: i.detail,
        action: i.action,
        link: i.link ?? (isPayment ? "/admin/finance" : undefined),
        linkLabel: i.linkLabel ?? (isPayment ? "Abrir Recebimentos" : undefined),
      };
    });
}

const DiagnosticsPage = () => {
  const { storeId } = useAdminStoreId();
  const opsDiag = useOperationalDiagnostics();
  const [audit, setAudit] = useState<AuditFinding[]>([]);
  const [auditing, setAuditing] = useState(false);
  const [lastFullRun, setLastFullRun] = useState<Date | null>(null);

  const runFull = useCallback(async () => {
    setAuditing(true);
    try {
      const [, extra] = await Promise.all([opsDiag.run(), fetchAdminSystemAudit(storeId)]);
      setAudit(extra);
      setLastFullRun(new Date());
    } finally {
      setAuditing(false);
    }
  }, [opsDiag, storeId]);

  const running = opsDiag.running || auditing;

  const allFindings = useMemo<AuditFinding[]>(() => {
    return [...legacyToFindings(opsDiag.items), ...audit];
  }, [opsDiag.items, audit]);

  const byCategory = useMemo(() => {
    const map = new Map<AuditCategory, AuditFinding[]>();
    for (const f of allFindings) {
      if (!map.has(f.category)) map.set(f.category, []);
      map.get(f.category)!.push(f);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => SEVERITY_META[a.severity].order - SEVERITY_META[b.severity].order);
    }
    return map;
  }, [allFindings]);

  const counts = useMemo(() => {
    return {
      critical: allFindings.filter((f) => f.severity === "critical").length,
      warning: allFindings.filter((f) => f.severity === "warning").length,
      suggestion: allFindings.filter((f) => f.severity === "suggestion").length,
    };
  }, [allFindings]);

  const everythingOk = lastFullRun && allFindings.length === 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Estado do sistema
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Auditoria completa: cardápio, pedidos, pagamentos, delivery, mesas, equipe, sistema e impressão.
          </p>
          <p className="text-sm mt-2">
            <Link to={nav.admin("diagnostics-hub")} className="text-primary font-semibold underline">
              Testes detalhados por módulo → Centro de testes
            </Link>
            <span className="text-muted-foreground"> (push, impressora, cupões, fidelidade, campanhas)</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {lastFullRun
              ? `Última verificação: ${lastFullRun.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · Versão: ${formatBuildStamp(APP_BUILD_ID)}`
              : `Nunca verificado. Versão: ${formatBuildStamp(APP_BUILD_ID)}`}
          </p>
        </div>
        <Button type="button" onClick={() => void runFull()} disabled={running} className="shrink-0">
          {running ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          {running ? "Analisando…" : "Verificar agora"}
        </Button>
      </div>

      {lastFullRun && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryTile
            sev="critical"
            count={counts.critical}
            label="Críticos"
            sub="impedem operação"
          />
          <SummaryTile
            sev="warning"
            count={counts.warning}
            label="Atenção"
            sub="podem causar erro"
          />
          <SummaryTile
            sev="suggestion"
            count={counts.suggestion}
            label="Sugestões"
            sub="melhorias"
          />
        </div>
      )}

      {!lastFullRun && !running && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Clique em <strong>Verificar agora</strong> para rodar a auditoria completa. Nada é
            consultado automaticamente.
          </CardContent>
        </Card>
      )}

      {everythingOk && (
        <Card className="border-2 border-success/40 bg-success/5">
          <CardContent className="p-6 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <div>
              <p className="font-black text-lg">Tudo OK</p>
              <p className="text-sm text-muted-foreground">
                Nenhum problema detectado. Sistema pronto para operar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {Array.from(byCategory.entries()).map(([cat, findings]) => {
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        const worstSev = findings[0]?.severity ?? "ok";
        return (
          <section key={cat} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">{meta.label}</h3>
              <span className="text-xs text-muted-foreground">
                ({findings.length} {findings.length === 1 ? "alerta" : "alertas"})
              </span>
            </div>
            <div className="space-y-2">
              {findings.map((f) => (
                <FindingCard key={f.id} f={f} />
              ))}
            </div>
            {worstSev === "critical" && null}
          </section>
        );
      })}
    </div>
  );
};

function SummaryTile({
  sev,
  count,
  label,
  sub,
}: {
  sev: AuditSeverity;
  count: number;
  label: string;
  sub: string;
}) {
  const meta = SEVERITY_META[sev];
  return (
    <Card className={`border-2 ${meta.ring}`}>
      <CardContent className="p-4">
        <p className="text-3xl font-black">{count}</p>
        <p className="text-sm font-bold mt-1">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function FindingCard({ f }: { f: AuditFinding }) {
  const meta = SEVERITY_META[f.severity];
  const Icon = meta.icon;
  return (
    <Card className={`border-2 ${meta.ring}`}>
      <CardContent className="p-4 flex gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm">{f.label}</p>
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded ${meta.badge}`}
            >
              {meta.label}
            </span>
          </div>
          {f.detail && (
            <p className="text-xs text-muted-foreground mt-1 break-words">{f.detail}</p>
          )}
          {f.action && <p className="text-xs font-medium mt-1.5">{f.action}</p>}
          {f.link && (
            <Link
              to={f.link}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-2 hover:underline"
            >
              {f.linkLabel ?? "Resolver"}
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DiagnosticsPage;
