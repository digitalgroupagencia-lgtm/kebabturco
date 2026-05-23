import { Link, useParams } from "react-router-dom";
import { Loader2, Layers } from "lucide-react";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import AdminPremiumCard from "@/components/admin/premium/AdminPremiumCard";
import AdminStatStrip from "@/components/admin/premium/AdminStatStrip";
import WorkspaceShell from "@/components/admin/premium/WorkspaceShell";
import MetricTile from "@/components/admin/premium/MetricTile";
import OperationalTimeline from "@/components/admin/premium/OperationalTimeline";
import { useAdminCentralsTenants, useTenantFeatureFlags } from "@/hooks/usePlatformFeatures";
import { useTenantOperationalSnapshot } from "@/hooks/usePlatformOperationalSnapshot";
import { ADMIN_CENTRALS } from "@/lib/adminCentralsNav";
import { PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";
import { buildCentralTimeline, computeTenantHealthScore } from "@/lib/operationalCentralMetrics";

export default function AdminTenantCentralsHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: tenants, isLoading } = useAdminCentralsTenants();
  const tenant = tenants?.find((t) => t.slug === slug);
  const { data: flags } = useTenantFeatureFlags(tenant?.id);
  const { data: row, platform, isLoading: loadingOps } = useTenantOperationalSnapshot(tenant?.id);

  const enabledCount = flags?.filter((f) => f.enabled).length ?? 0;
  const plan = (tenant?.plan as PlanKey) || "start";

  if (isLoading || loadingOps) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant || !slug) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center text-muted-foreground text-sm">
        Restaurante não encontrado.
      </div>
    );
  }

  const health = row ? computeTenantHealthScore(row) : 50;
  const miniSnapshot = platform ?? {
    tenants: row ? [row] : [],
    totalOrders7d: row?.orders7d ?? 0,
    totalRevenue7d: row?.revenue7d ?? 0,
    activeTenants: 1,
  };
  const timeline = [
    ...buildCentralTimeline(miniSnapshot, "ai").slice(0, 2),
    ...buildCentralTimeline(miniSnapshot, "campaigns").slice(0, 2),
  ];

  return (
    <WorkspaceShell>
      <AdminPageHeader
        title="Centrais"
        description="Ferramentas operacionais deste restaurante. Motores automáticos chegam numa fase posterior."
        breadcrumbs={[
          { label: "Plataforma", to: "/admin" },
          { label: tenant.name, to: `/admin/tenants/${slug}` },
          { label: "Centrais" },
        ]}
        backTo={`/admin/tenants/${slug}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile label="Saúde" value={String(health)} sub={health >= 70 ? "Bom" : "A melhorar"} />
        <MetricTile label="Plano" value={PLAN_LABELS[plan]} />
        <MetricTile label="Funcionalidades" value={String(enabledCount)} sub="activas" />
        <MetricTile label="Pedidos 7d" value={row?.orders7d ?? 0} />
      </div>

      <OperationalTimeline events={timeline} title="Actividade recente" />

      <AdminStatStrip
        stats={[
          { label: "IA activa", value: row?.aiModulesOn ? "Sim" : "Não", tone: row?.aiModulesOn ? "success" : "muted" },
          { label: "Fidelidade", value: row?.loyaltyActive ? "Activa" : "Off", tone: row?.loyaltyActive ? "success" : "warning" },
          { label: "Estado", value: "Preparado", tone: "muted" },
          { label: "Motores", value: "Standby", tone: "warning" },
        ]}
      />

      <div className="space-y-2">
        {ADMIN_CENTRALS.map((c) => {
          const CIcon = c.icon;
          return (
          <Link key={c.segment} to={`/admin/tenants/${slug}/centrals/${c.segment}`}>
            <AdminPremiumCard
              title={c.title}
              summary={c.desc}
              icon={CIcon}
              status="prepared"
              actions={<CIcon className="h-4 w-4 text-muted-foreground opacity-0" />}
              className="hover:border-primary/30 cursor-pointer"
            />
          </Link>
          );
        })}
      </div>

      <Link
        to="/admin/centrals"
        className="block text-center text-xs font-bold text-primary hover:underline pt-2"
      >
        <Layers className="inline h-3.5 w-3.5 mr-1" />
        Visão global de todas as centrais
      </Link>
    </WorkspaceShell>
  );
}
