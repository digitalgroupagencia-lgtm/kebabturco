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
import PremiumMetricCard from "@/components/admin/premium/PremiumMetricCard";
import PremiumChartCard from "@/components/admin/premium/PremiumChartCard";
import RankingCard, { type RankingItem } from "@/components/admin/premium/RankingCard";
import AlertCard, { type AlertItem } from "@/components/admin/premium/AlertCard";
import ActivityFeed, { type ActivityItem } from "@/components/admin/premium/ActivityFeed";
import StatusPill from "@/components/admin/premium/StatusPill";
import DonutChartCard from "@/components/admin/charts/DonutChartCard";
import FunnelChartCard from "@/components/admin/charts/FunnelChartCard";
import { useDemoMode } from "@/lib/demoMode";
import {
  DEMO_STATS,
  DEMO_REVENUE_SERIES,
  DEMO_TOP_TENANTS,
  DEMO_PAYMENT_METHODS,
  DEMO_SALES_CHANNELS,
  DEMO_FUNNEL,
  DEMO_RECENT_ACTIVITY,
} from "@/lib/demoData";
import { PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";
import { ADMIN_CENTRALS, centralAdminPath } from "@/lib/adminCentralsNav";
import { nav } from "@/lib/navPaths.ts";
import { Button } from "@/components/ui/button";
import { APP_NAME, SINGLE_TENANT_MODE } from "@/lib/appMode";
import HowToUsePanel from "@/components/admin/HowToUsePanel";

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
  const demo = useDemoMode();

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

  // Substitui dados reais por demo quando o modo demonstração está ligado.
  const liveStats = demo ? DEMO_STATS : stats;
  const liveRevenue = demo ? DEMO_REVENUE_SERIES : revenueSeries;
  const liveTopTenants = demo ? DEMO_TOP_TENANTS : topTenants;

  const alertCount =
    Number(liveStats?.overdue_count || 0) + Number(liveStats?.pending_count || 0);

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
    if (SINGLE_TENANT_MODE) return;
    activityItems.push({
      id: `tenant-${t.id}`,
      title: `Cliente activo · ${t.name}`,
      detail: PLAN_LABELS[(t.plan as PlanKey) || "start"],
      time: relativeTime(t.created_at),
      icon: Building2,
      tone: "default",
    });
  });

  const sortedActivity = demo
    ? DEMO_RECENT_ACTIVITY.map((a) => ({ ...a, icon: ShoppingBag })) as ActivityItem[]
    : activityItems.slice(0, 10);

  return (
    <PlatformPageShell width="full">
      <HowToUsePanel
        purpose="Visão geral da plataforma: restaurantes, pedidos do dia, faturamento e atalhos para as centrais (IA, push, planos, etc.)."
        whenToUse="Tela inicial do administrador. Use para tomar decisões rápidas e abrir as áreas mais profundas."
        steps={[
          "Cartões do topo mostram totais consolidados em tempo real.",
          "Use os atalhos das Centrais para mexer em IA, Push, Fidelidade e Campanhas.",
          "O feed da direita mostra as últimas ações relevantes na plataforma.",
        ]}
        howToConfirm="Se os números bater com Monitoramento e com o painel de cada restaurante, está tudo sincronizado."
        assistantQuestion="O que cada cartão e cada atalho deste dashboard significa, e quando devo usar cada um?"
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusPill label={APP_NAME} tone="neutral" />
            <StatusPill label="Master · SaaS" tone="active" dot />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {SINGLE_TENANT_MODE ? "Visão geral" : "Dashboard Master"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {SINGLE_TENANT_MODE
              ? "Painel de administração do restaurante"
              : "Visão geral de todos os restaurantes da plataforma PropioApp"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!SINGLE_TENANT_MODE && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to={nav.admin("how-it-works")}>Como funciona</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={nav.admin("tenants")}>Restaurantes</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to={nav.admin("tenants", "new")}>+ Criar restaurante</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI strip — premium */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumMetricCard
          icon={Building2}
          tone="primary"
          label={SINGLE_TENANT_MODE ? "Estado da loja" : "Restaurantes activos"}
          value={SINGLE_TENANT_MODE ? (liveStats?.active_tenants ? "Activa" : "—") : (liveStats?.active_tenants ?? 0)}
          sub={SINGLE_TENANT_MODE ? APP_NAME : `${liveStats?.total_tenants ?? 0} no total`}
        />
        <PremiumMetricCard
          icon={DollarSign}
          tone="success"
          label="Faturamento do mês"
          value={fmtMoney(Number(liveStats?.revenue_month || 0))}
          sub={`MRR ${fmtMoney(Number(liveStats?.mrr || 0))}`}
        />
        <PremiumMetricCard
          icon={ShoppingBag}
          tone="info"
          label="Pedidos hoje"
          value={liveStats?.orders_today ?? 0}
          sub={fmtMoney(Number(liveStats?.revenue_today || 0))}
        />
        <PremiumMetricCard
          icon={AlertCircle}
          tone={alertCount > 0 ? "danger" : "success"}
          label="Alertas críticos"
          value={alertCount}
          delta={alertCount > 0 ? "Requer atenção" : "Tudo em dia"}
          deltaDirection={alertCount > 0 ? "down" : "up"}
          sub={`${liveStats?.overdue_count ?? 0} atrasados · ${liveStats?.pending_count ?? 0} pendentes`}
        />
      </div>

      {/* Sub-strip: indicadores rápidos */}
      <div className="grid grid-cols-3 gap-4">
        <PremiumMetricCard icon={CheckCircle2} tone="success" label="Pagos" value={liveStats?.paid_count ?? 0} />
        <PremiumMetricCard icon={Clock} tone="warning" label="Pendentes" value={liveStats?.pending_count ?? 0} />
        <PremiumMetricCard icon={TrendingUp} tone="primary" label="Receita hoje" value={fmtMoney(Number(liveStats?.revenue_today || 0))} />
      </div>

      {/* Main grid: chart + ranking + alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <PremiumChartCard
          title="Faturamento da rede"
          subtitle="Últimos 12 meses"
          action={<StatusPill label={demo ? "Dados demo" : "Dados reais"} tone={demo ? "standby" : "active"} dot />}
          className="xl:col-span-7"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveRevenue || []} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="adminRevFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 8px 30px -8px rgba(0,0,0,0.18)",
                  }}
                  formatter={(v: number) => [fmtMoney(Number(v)), "Receita"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#adminRevFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </PremiumChartCard>

        <RankingCard
          className="xl:col-span-3"
          title="Top restaurantes"
          subtitle="Por faturamento no mês"
          items={(liveTopTenants ?? []).slice(0, 5).map((t: Record<string, unknown>): RankingItem => ({
            id: String(t.tenant_id),
            name: String(t.tenant_name ?? "—"),
            primary: fmtMoney(Number(t.total_revenue || 0)),
            secondary: `${Number(t.orders_count ?? 0)} pedidos`,
            value: Number(t.total_revenue || 0),
            icon: Building2,
          }))}
          action={
            !SINGLE_TENANT_MODE && (
              <Link to={nav.admin("tenants")} className="text-xs font-semibold text-primary hover:underline">
                Ver todos
              </Link>
            )
          }
        />

        <AlertCard
          className="xl:col-span-2"
          title="Alertas inteligentes"
          items={((): AlertItem[] => {
            const out: AlertItem[] = [];
            if (Number(liveStats?.overdue_count || 0) > 0) {
              out.push({
                id: "overdue",
                title: `${liveStats?.overdue_count} pagamentos atrasados`,
                description: "Verifique cobranças e renovação",
                severity: "critical",
              });
            }
            if (Number(liveStats?.pending_count || 0) > 0) {
              out.push({
                id: "pending",
                title: `${liveStats?.pending_count} cobranças pendentes`,
                description: "Faturas aguardando confirmação",
                severity: "warning",
              });
            }
            if (out.length === 0) {
              out.push({
                id: "ok",
                title: "Tudo em dia",
                description: "Sem alertas críticos no momento",
                severity: "resolved",
              });
            }
            return out;
          })()}
        />
      </div>

      {/* Distribuições + funil de implantação */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <DonutChartCard
          title="Métodos de pagamento"
          subtitle="Distribuição do mês"
          data={demo ? DEMO_PAYMENT_METHODS : []}
          formatAmount={(n) => fmtMoney(n)}
        />
        <DonutChartCard
          title="Vendas por canal"
          subtitle="Salão, Delivery, QR, Take Away, App"
          data={demo ? DEMO_SALES_CHANNELS : []}
          formatAmount={(n) => fmtMoney(n)}
        />
        <FunnelChartCard
          title="Funil de implantação"
          subtitle="Leads → Activos"
          data={demo ? DEMO_FUNNEL : []}
        />
      </div>

      {/* Activity feed full width below */}
      <ActivityFeed items={sortedActivity} />


      {/* Tenants + centrals */}
      <div className={`grid grid-cols-1 ${SINGLE_TENANT_MODE ? "" : "xl:grid-cols-2"} gap-4`}>
        {!SINGLE_TENANT_MODE && (
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h3 className="text-sm font-semibold">Clientes</h3>
            <Link to={nav.admin("tenants")} className="text-xs font-semibold text-primary hover:underline">
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
                  to={nav.admin("tenants", slug)}
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
                  to={nav.admin("tenants", t.slug)}
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
        )}

        <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h3 className="text-sm font-semibold">Centrais · pulse global</h3>
            <Link to={centralAdminPath()} className="text-xs font-semibold text-primary hover:underline">
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
                  to={centralAdminPath(c.segment)}
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
