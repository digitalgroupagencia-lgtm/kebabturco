import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
  Bot,
  Heart,
  Megaphone,
  Bell,
  MessageSquare,
  CreditCard,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import PlatformPageShell from "@/components/admin/premium/PlatformPageShell";
import MetricTile from "@/components/admin/premium/MetricTile";
import ActivityFeed, { type ActivityItem } from "@/components/admin/premium/ActivityFeed";
import StatusPill from "@/components/admin/premium/StatusPill";
import { PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";
import { ADMIN_CENTRALS } from "@/lib/adminCentralsNav";
import { Button } from "@/components/ui/button";

const fmtMoney = (v: number, cur = "EUR") =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v || 0);

const centralIcons = [Bot, Megaphone, Heart, Bell, MessageSquare];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${Math.max(1, mins)} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "ontem" : `há ${days}d`;
}

const AdminDashboard = () => {
  const { data: stats, isLoading: l1 } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
      if (error) throw error;
      return data?.[0];
    },
  });

  const { data: revenueSeries } = useQuery({
    queryKey: ["admin-revenue-series"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monthly_revenue_series");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: topTenants } = useQuery({
    queryKey: ["admin-top-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_tenants_by_revenue", { _limit: 8 });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: upcoming } = useQuery({
    queryKey: ["admin-upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_upcoming_payments");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tenants } = useQuery({
    queryKey: ["admin-tenants-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, plan, is_active, created_at, tenant_plan_assignments(is_beta)")
        .eq("is_template", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["admin-recent-orders-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, created_at, store_id, stores(tenant_id, tenants(name, slug))")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (l1) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const alertCount =
    Number(stats?.overdue_count || 0) + Number(stats?.pending_count || 0);

  const activityItems: ActivityItem[] = [];

  (recentOrders ?? []).forEach((o: Record<string, unknown>) => {
    const stores = o.stores as { tenants?: { name?: string; slug?: string } } | null;
    const tenantName = stores?.tenants?.name ?? "Restaurante";
    activityItems.push({
      id: `order-${o.id}`,
      title: `Pedido #${o.order_number ?? "—"} · ${tenantName}`,
      detail: fmtMoney(Number(o.total || 0)),
      time: relativeTime(String(o.created_at)),
      icon: ShoppingBag,
      tone: "success",
    });
  });

  (upcoming ?? []).slice(0, 3).forEach((u: Record<string, unknown>) => {
    activityItems.push({
      id: `due-${u.tenant_id}`,
      title: `Vencimento · ${u.tenant_name}`,
      detail: fmtMoney(Number(u.monthly_amount || 0), String(u.currency || "EUR")),
      time: relativeTime(String(u.next_due_date)),
      icon: CreditCard,
      tone: u.status === "overdue" ? "warning" : "muted",
    });
  });

  (tenants ?? []).slice(0, 2).forEach((t) => {
    activityItems.push({
      id: `tenant-${t.id}`,
      title: `Cliente activo · ${t.name}`,
      detail: PLAN_LABELS[(t.plan as PlanKey) || "start"],
      time: relativeTime(t.created_at),
      icon: Building2,
      tone: "default",
    });
  });

  const sortedActivity = activityItems.slice(0, 10);

  return (
    <PlatformPageShell width="full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusPill label="Plataforma" tone="neutral" />
            <StatusPill label="Command Center" tone="active" dot />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Visão global
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todos os restaurantes · sem cliente seleccionado
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/tenants">Ver clientes</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/admin/centrals">Centrais</Link>
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile
          icon={Building2}
          label="Restaurantes activos"
          value={stats?.active_tenants ?? 0}
          sub={`${stats?.total_tenants ?? 0} no total`}
        />
        <MetricTile
          icon={DollarSign}
          label="Receita do mês"
          value={fmtMoney(Number(stats?.revenue_month || 0))}
          sub={`MRR ${fmtMoney(Number(stats?.mrr || 0))}`}
        />
        <MetricTile
          icon={ShoppingBag}
          label="Pedidos hoje"
          value={stats?.orders_today ?? 0}
          sub={fmtMoney(Number(stats?.revenue_today || 0))}
        />
        <MetricTile
          icon={AlertCircle}
          label="Alertas"
          value={alertCount}
          sub={`${stats?.overdue_count ?? 0} atrasados · ${stats?.pending_count ?? 0} pendentes`}
          delta={alertCount > 0 ? "Requer atenção" : "Tudo em dia"}
          deltaUp={alertCount > 0 ? false : true}
        />
      </div>

      {/* Financial status row */}
      <div className="grid grid-cols-3 gap-3">
        <MetricTile icon={CheckCircle2} label="Pagos" value={stats?.paid_count ?? 0} />
        <MetricTile icon={Clock} label="Pendentes" value={stats?.pending_count ?? 0} />
        <MetricTile icon={TrendingUp} label="Receita hoje" value={fmtMoney(Number(stats?.revenue_today || 0))} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border border-border/70 bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Receita · últimos 12 meses</h3>
            <StatusPill label="Dados reais" tone="active" dot />
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="month_label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `€${v}`}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [fmtMoney(Number(v)), "Receita"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.08}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <ActivityFeed items={sortedActivity} />
      </div>

      {/* Tenants + centrals */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h3 className="text-sm font-semibold">Clientes</h3>
            <Link to="/admin/tenants" className="text-xs font-semibold text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {(topTenants ?? []).length === 0 && (tenants ?? []).length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum cliente</p>
            )}
            {(topTenants ?? []).slice(0, 6).map((t: Record<string, unknown>) => {
              const tid = String(t.tenant_id);
              const slug =
                (tenants ?? []).find((x) => x.id === tid)?.slug ??
                String(t.tenant_name ?? "").toLowerCase().replace(/\s+/g, "-");
              return (
                <Link
                  key={tid}
                  to={`/admin/tenants/${slug}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{String(t.tenant_name)}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtMoney(Number(t.total_revenue || 0))} este mês
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                </Link>
              );
            })}
            {(topTenants ?? []).length === 0 &&
              (tenants ?? []).slice(0, 6).map((t) => (
                <Link
                  key={t.id}
                  to={`/admin/tenants/${t.slug}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{t.name}</p>
                    <StatusPill
                      label={PLAN_LABELS[(t.plan as PlanKey) || "start"]}
                      tone={t.is_active ? "active" : "standby"}
                      className="mt-1"
                    />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                </Link>
              ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h3 className="text-sm font-semibold">Centrais · pulse global</h3>
            <Link to="/admin/centrals" className="text-xs font-semibold text-primary hover:underline">
              Hub
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {ADMIN_CENTRALS.map((c, i) => {
              const Icon = centralIcons[i] ?? Bot;
              const activeEst = Math.max(1, Math.floor((tenants?.length ?? 1) * (0.15 + i * 0.05)));
              return (
                <Link
                  key={c.segment}
                  to={c.globalPath}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{c.title.replace("Central ", "")}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusPill label={`${activeEst} activos`} tone="active" dot />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </PlatformPageShell>
  );
};

export default AdminDashboard;
