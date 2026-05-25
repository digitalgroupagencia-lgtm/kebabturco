import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Heart,
  Megaphone,
  Bell,
  MessageSquare,
  ShoppingBag,
  Palette,
  BarChart3,
  Loader2,
  ExternalLink,
} from "lucide-react";
import WorkspaceShell from "@/components/admin/premium/WorkspaceShell";
import MetricTile from "@/components/admin/premium/MetricTile";
import StatusPill from "@/components/admin/premium/StatusPill";
import OperationalTimeline from "@/components/admin/premium/OperationalTimeline";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { useTenantOperationalSnapshot } from "@/hooks/usePlatformOperationalSnapshot";
import { computeTenantHealthScore, buildCentralTimeline } from "@/lib/operationalCentralMetrics";
import { ADMIN_CENTRALS, tenantCentralsPath } from "@/lib/adminCentralsNav";
import { getTenantTotemUrl } from "@/lib/tenantUrls";
import { useTenantFeatureFlags, useTenantAiModules } from "@/hooks/usePlatformFeatures";
import { Button } from "@/components/ui/button";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const centralIcons = [Bot, Megaphone, Heart, Bell, MessageSquare];

export default function TenantWorkspaceOverviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const { tenant, loading: tenantLoading } = useSelectedTenant();
  const { data: row, platform, isLoading } = useTenantOperationalSnapshot(tenant?.id);
  const { data: flags } = useTenantFeatureFlags(tenant?.id);
  const { data: aiModules } = useTenantAiModules(tenant?.id);

  if (tenantLoading || isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant || !slug) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">Restaurante não encontrado.</div>
    );
  }

  const health = row ? computeTenantHealthScore(row) : 50;
  const enabledFlags = flags?.filter((f) => f.enabled).length ?? 0;
  const aiOn = aiModules?.filter((m) => m.is_enabled).length ?? 0;
  const totemUrl = getTenantTotemUrl({
    slug: tenant.slug,
    custom_domain: tenant.custom_domain,
    path_slug: tenant.path_slug,
    master_domain: tenant.master_domain,
    use_master_domain: tenant.use_master_domain,
  });

  const miniSnapshot = platform ?? {
    tenants: row ? [row] : [],
    totalOrders7d: row?.orders7d ?? 0,
    totalRevenue7d: row?.revenue7d ?? 0,
    activeTenants: 1,
  };

  const timeline = buildCentralTimeline(miniSnapshot, "ai").slice(0, 5);

  return (
    <WorkspaceShell wide>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Saúde operacional e atalhos deste restaurante
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <a href={totemUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ver totem
            </a>
          </Button>
          <Button size="sm" asChild>
            <Link to={`/admin/tenants/${slug}/orders`}>Abrir pedidos</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricTile
          label="Saúde operacional"
          value={`${health}`}
          sub={health >= 80 ? "Excelente" : health >= 60 ? "Bom" : "A melhorar"}
          delta={health >= 70 ? "Estável" : "Activar centrais"}
          deltaUp={health >= 70}
        />
        <MetricTile label="Pedidos 7d" value={row?.orders7d ?? 0} icon={ShoppingBag} />
        <MetricTile label="Receita 7d" value={fmt(row?.revenue7d ?? 0)} />
        <MetricTile label="Módulos IA" value={`${aiOn}/4`} icon={Bot} />
        <MetricTile label="Funcionalidades" value={String(enabledFlags)} sub="activas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <OperationalTimeline
          events={timeline}
          title="Actividade recente"
          className="lg:col-span-2"
        />
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Acções rápidas</h3>
          {[
            { label: "Pedidos", to: `/admin/tenants/${slug}/orders`, icon: ShoppingBag },
            { label: "Centrais", to: tenantCentralsPath(slug), icon: Bot },
            { label: "Branding", to: `/admin/tenants/${slug}/branding`, icon: Palette },
            { label: "Pedidos", to: `/admin/tenants/${slug}/orders`, icon: BarChart3 },
          ].map((a) => {
            const ActionIcon = a.icon;
            return (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:border-primary/30 hover:bg-muted/20 transition-colors group"
            >
              <ActionIcon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium flex-1">{a.label}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Centrais deste restaurante</h3>
          <Link
            to={tenantCentralsPath(slug)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Ver todas
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ADMIN_CENTRALS.map((c, i) => {
            const Icon = centralIcons[i] ?? Bot;
            const active =
              (c.segment === "ai" && aiOn > 0) ||
              (c.segment === "loyalty" && row?.loyaltyActive) ||
              (c.segment !== "ai" && c.segment !== "loyalty" && enabledFlags > 0);
            return (
              <Link
                key={c.segment}
                to={`/admin/tenants/${slug}/centrals/${c.segment}`}
                className="rounded-xl border bg-card p-3 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <StatusPill label={active ? "Activo" : "Standby"} tone={active ? "active" : "standby"} dot />
                </div>
                <p className="text-sm font-semibold mt-2">{c.title.replace("Central ", "")}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </WorkspaceShell>
  );
}
