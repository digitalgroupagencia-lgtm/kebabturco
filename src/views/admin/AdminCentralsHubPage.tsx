import { Link } from "react-router-dom";
import { Loader2, Layers, Bot, Megaphone, Heart, Bell, MessageSquare } from "lucide-react";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import AdminPremiumCard from "@/components/admin/premium/AdminPremiumCard";
import PlatformPageShell from "@/components/admin/premium/PlatformPageShell";
import StatusPill from "@/components/admin/premium/StatusPill";
import MetricTile from "@/components/admin/premium/MetricTile";
import OperationalTimeline from "@/components/admin/premium/OperationalTimeline";
import InsightPanel from "@/components/admin/premium/InsightPanel";
import { useAdminCentralsTenants, usePlatformPlans } from "@/hooks/usePlatformFeatures";
import { usePlatformOperationalSnapshot } from "@/hooks/usePlatformOperationalSnapshot";
import { ADMIN_CENTRALS, centralAdminPath } from "@/lib/adminCentralsNav";
import { nav } from "@/lib/navPaths.ts";
import {
  aggregateCentralMetrics,
  buildHubTimeline,
  buildCentralInsights,
  type CentralSegment,
} from "@/lib/operationalCentralMetrics";
import { ChevronRight, Building2 } from "lucide-react";
import { APP_NAME, SINGLE_TENANT_MODE } from "@/lib/appMode";

const centralIcons = [Bot, Megaphone, Heart, Bell, MessageSquare];

export default function AdminCentralsHubPage() {
  const { data: plans, isLoading: loadingPlans } = usePlatformPlans();
  const { data: tenants, isLoading: loadingTenants } = useAdminCentralsTenants();
  const { data: snapshot, isLoading: loadingOps } = usePlatformOperationalSnapshot();

  const planSummary = (plans ?? []).map((p) => p.name).join(" · ") || "START · PRO · PREMIUM";

  if (loadingPlans || loadingTenants || loadingOps || !snapshot) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hubTimeline = buildHubTimeline(snapshot);
  const hubInsights = buildCentralInsights(snapshot, "ai");

  return (
    <PlatformPageShell width="wide">
      <AdminPageHeader
        title="Centrais operacionais"
        description={
          SINGLE_TENANT_MODE
            ? "Visão operacional das centrais do Kebab Turco."
            : "Visão global com métricas, timelines e actividade — escolhe uma central ou entra num restaurante."
        }
        breadcrumbs={[
          { label: APP_NAME, to: nav.admin() },
          { label: "Centrais" },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <StatusPill label={SINGLE_TENANT_MODE ? APP_NAME : "Modo plataforma"} tone="neutral" />
        {!SINGLE_TENANT_MODE && (
          <StatusPill label={`${tenants?.length ?? 0} clientes`} tone="active" dot />
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile label="Pedidos 7d" value={snapshot.totalOrders7d} />
        <MetricTile label="Receita 7d" value={`€${Math.round(snapshot.totalRevenue7d)}`} />
        <MetricTile label="Centrais" value={String(ADMIN_CENTRALS.length)} />
        <MetricTile label="Planos" value={String(plans?.length ?? 3)} sub={planSummary} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <OperationalTimeline
          events={hubTimeline}
          title="Actividade global · todas as centrais"
          className="lg:col-span-2"
        />
        <InsightPanel insights={hubInsights} title="Pulse plataforma" />
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
          Centrais · visão operacional
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ADMIN_CENTRALS.map((c, i) => {
            const Icon = centralIcons[i] ?? Layers;
            const m = aggregateCentralMetrics(snapshot, c.segment as CentralSegment);
            return (
              <Link key={c.segment} to={centralAdminPath(c.segment)}>
                <div className="rounded-xl border bg-card p-4 hover:border-primary/30 transition-colors h-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <StatusPill label={m.kpi1.value} tone="active" dot />
                  </div>
                  <p className="text-sm font-bold mt-3">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.desc}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {m.kpi2.label}: {m.kpi2.value} · {m.kpi3.label}: {m.kpi3.value}
                  </p>
                  <ChevronRight className="h-4 w-4 text-primary mt-2" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {!SINGLE_TENANT_MODE && (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
          Por restaurante
        </p>
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {tenants?.map((t) => {
            const row = snapshot.tenants.find((r) => r.tenantId === t.id);
            return (
              <Link key={t.id} to={nav.admin("tenants", t.slug, "centrals")}>
                <AdminPremiumCard
                  title={t.name}
                  summary={
                    row && row.orders7d > 0
                      ? `${row.orders7d} pedidos 7d · ${row.aiModulesOn} módulos IA`
                      : "Centrais dedicadas deste cliente"
                  }
                  icon={Building2}
                  badges={[{ label: String(t.plan ?? "start").toUpperCase(), variant: "outline" }]}
                  actions={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  className="hover:border-primary/30 cursor-pointer"
                />
              </Link>
            );
          })}
        </div>
      </div>
      )}
    </PlatformPageShell>
  );
}
