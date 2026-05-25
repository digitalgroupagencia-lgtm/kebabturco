import { Link } from "react-router-dom";
import { Building2, ChevronRight, Loader2 } from "lucide-react";
import MetricTile from "./MetricTile";
import OperationalTimeline from "./OperationalTimeline";
import InsightPanel from "./InsightPanel";
import StatusPill from "./StatusPill";
import {
  aggregateCentralMetrics,
  buildCentralInsights,
  buildCentralTimeline,
  type CentralSegment,
} from "@/lib/operationalCentralMetrics";
import { usePlatformOperationalSnapshot } from "@/hooks/usePlatformOperationalSnapshot";
import { PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";
import { nav } from "@/lib/navPaths.ts";

type Tenant = { id: string; name: string; slug: string; plan?: string | null; is_active?: boolean };

type Props = {
  centralTitle: string;
  centralSegment: CentralSegment;
  tenants: Tenant[];
};

export default function GlobalCentralOperations({ centralTitle, centralSegment, tenants }: Props) {
  const { data: snapshot, isLoading } = usePlatformOperationalSnapshot();

  if (isLoading || !snapshot) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const metrics = aggregateCentralMetrics(snapshot, centralSegment);
  const timeline = buildCentralTimeline(snapshot, centralSegment);
  const insights = buildCentralInsights(snapshot, centralSegment);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label="Visão global" tone="neutral" />
        <StatusPill label={centralTitle} tone="active" dot />
        <span className="text-xs text-muted-foreground">Nenhum restaurante seleccionado</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile label={metrics.kpi1.label} value={metrics.kpi1.value} estimated={"estimated" in metrics.kpi1 && metrics.kpi1.estimated} />
        <MetricTile label={metrics.kpi2.label} value={metrics.kpi2.value} estimated={"estimated" in metrics.kpi2 && metrics.kpi2.estimated} />
        <MetricTile label={metrics.kpi3.label} value={metrics.kpi3.value} estimated={"estimated" in metrics.kpi3 && metrics.kpi3.estimated} />
        <MetricTile
          label={metrics.kpi4.label}
          value={metrics.kpi4.value}
          estimated={"estimated" in metrics.kpi4 && metrics.kpi4.estimated}
          sub={"tone" in metrics.kpi4 && metrics.kpi4.tone === "warning" ? "Motores automáticos em breve" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <OperationalTimeline
          events={timeline}
          title="Actividade (real + estimada)"
          className="lg:col-span-2"
        />
        <InsightPanel insights={insights} title="Previsões estimadas" />
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
          Restaurantes · entrar na central
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tenants.map((t) => {
            const row = snapshot.tenants.find((r) => r.tenantId === t.id);
            return (
              <Link
                key={t.id}
                to={nav.admin("tenants", t.slug, "centrals", centralSegment)}
                className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 hover:border-primary/30 hover:bg-muted/20 transition-colors group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {PLAN_LABELS[(t.plan as PlanKey) || "start"]}
                    {row && row.orders7d > 0 ? ` · ${row.orders7d} pedidos 7d` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
