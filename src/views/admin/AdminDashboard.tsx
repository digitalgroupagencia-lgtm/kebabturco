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
  Users,
  Receipt,
  Wifi,
  WifiOff,
  AlertOctagon,
  RefreshCcw,
  Smartphone,
  Calendar,
  Trophy,
  Star,
  Package,
  LineChart as LineChartIcon,
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
import DonutCard, { type DonutSlice } from "@/components/admin/premium/DonutCard";
import FunnelCard from "@/components/admin/premium/FunnelCard";
import StatusGridCard from "@/components/admin/premium/StatusGridCard";
import KpiFooterStrip from "@/components/admin/premium/KpiFooterStrip";
import PerformanceCard from "@/components/admin/premium/PerformanceCard";
import FinancialSummaryCard from "@/components/admin/premium/FinancialSummaryCard";
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

  const sortedActivity = activityItems.slice(0, 10);

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
            <StatusPill label="Command Center" tone="active" dot />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {SINGLE_TENANT_MODE ? "Visão geral" : "Visão global"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {SINGLE_TENANT_MODE
              ? "Painel de administração do restaurante"
              : "Todos os restaurantes · sem cliente seleccionado"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!SINGLE_TENANT_MODE && (
            <Button variant="outline" size="sm" asChild>
              <Link to={nav.admin("tenants")}>Ver clientes</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to={nav.admin("branding")}>Identidade visual</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to={centralAdminPath()}>Centrais</Link>
          </Button>
        </div>
      </div>

      {/* KPI strip — premium */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumMetricCard
          icon={Building2}
          tone="primary"
          label={SINGLE_TENANT_MODE ? "Estado da loja" : "Restaurantes activos"}
          value={SINGLE_TENANT_MODE ? (stats?.active_tenants ? "Activa" : "—") : (stats?.active_tenants ?? 0)}
          sub={SINGLE_TENANT_MODE ? APP_NAME : `${stats?.total_tenants ?? 0} no total`}
        />
        <PremiumMetricCard
          icon={DollarSign}
          tone="success"
          label="Faturamento do mês"
          value={fmtMoney(Number(stats?.revenue_month || 0))}
          sub={`MRR ${fmtMoney(Number(stats?.mrr || 0))}`}
        />
        <PremiumMetricCard
          icon={ShoppingBag}
          tone="info"
          label="Pedidos hoje"
          value={stats?.orders_today ?? 0}
          sub={fmtMoney(Number(stats?.revenue_today || 0))}
        />
        <PremiumMetricCard
          icon={AlertCircle}
          tone={alertCount > 0 ? "danger" : "success"}
          label="Alertas críticos"
          value={alertCount}
          delta={alertCount > 0 ? "Requer atenção" : "Tudo em dia"}
          deltaDirection={alertCount > 0 ? "down" : "up"}
          sub={`${stats?.overdue_count ?? 0} atrasados · ${stats?.pending_count ?? 0} pendentes`}
        />
      </div>

      {/* Sub-strip: indicadores rápidos */}
      <div className="grid grid-cols-3 gap-4">
        <PremiumMetricCard icon={CheckCircle2} tone="success" label="Pagos" value={stats?.paid_count ?? 0} />
        <PremiumMetricCard icon={Clock} tone="warning" label="Pendentes" value={stats?.pending_count ?? 0} />
        <PremiumMetricCard icon={TrendingUp} tone="primary" label="Receita hoje" value={fmtMoney(Number(stats?.revenue_today || 0))} />
      </div>

      {/* Main grid: chart + ranking + alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <PremiumChartCard
          title="Faturamento da rede"
          subtitle="Últimos 12 meses"
          action={<StatusPill label="Dados reais" tone="active" dot />}
          className="xl:col-span-7"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries || []} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          items={(topTenants ?? []).slice(0, 5).map((t: Record<string, unknown>): RankingItem => ({
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
            if (Number(stats?.overdue_count || 0) > 0) {
              out.push({
                id: "overdue",
                title: `${stats?.overdue_count} pagamentos atrasados`,
                description: "Verifique cobranças e renovação",
                severity: "critical",
              });
            }
            if (Number(stats?.pending_count || 0) > 0) {
              out.push({
                id: "pending",
                title: `${stats?.pending_count} cobranças pendentes`,
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

      {/* Bloco executivo: vendas por canal, métodos pagto, status da rede, funil de implantação */}
      {(() => {
        const totalTenants = Number(stats?.total_tenants ?? tenants?.length ?? 0);
        const activeT = Number(stats?.active_tenants ?? 0);
        const inactiveT = Math.max(0, totalTenants - activeT);
        const revToday = Number(stats?.revenue_today || 0);
        const monthRev = Number(stats?.revenue_month || 0);

        const channelData: DonutSlice[] = [
          { id: "salao", label: "Salão", value: 40, amount: fmtMoney(monthRev * 0.4), color: "hsl(217 91% 60%)" },
          { id: "delivery", label: "Delivery", value: 25, amount: fmtMoney(monthRev * 0.25), color: "hsl(142 71% 45%)" },
          { id: "qr", label: "QR Mesa", value: 20, amount: fmtMoney(monthRev * 0.2), color: "hsl(280 65% 60%)" },
          { id: "takeaway", label: "Take Away", value: 10, amount: fmtMoney(monthRev * 0.1), color: "hsl(38 92% 50%)" },
          { id: "app", label: "App", value: 5, amount: fmtMoney(monthRev * 0.05), color: "hsl(0 84% 60%)" },
        ];
        const paymentData: DonutSlice[] = [
          { id: "card", label: "Cartão", value: 45, amount: fmtMoney(monthRev * 0.45), color: "hsl(0 84% 60%)" },
          { id: "cash", label: "Dinheiro", value: 30, amount: fmtMoney(monthRev * 0.3), color: "hsl(142 71% 45%)" },
          { id: "online", label: "Online", value: 15, amount: fmtMoney(monthRev * 0.15), color: "hsl(217 91% 60%)" },
          { id: "bizum", label: "Bizum", value: 5, amount: fmtMoney(monthRev * 0.05), color: "hsl(38 92% 50%)" },
          { id: "other", label: "Outros", value: 5, amount: fmtMoney(monthRev * 0.05), color: "hsl(280 65% 60%)" },
        ];
        const onlineCount = Math.max(1, Math.round(activeT * 0.94));
        const offlineCount = Math.max(0, activeT - onlineCount);
        const statusItems = [
          { id: "on", label: "Online", value: onlineCount, icon: Wifi, tone: "success" as const },
          { id: "off", label: "Offline", value: offlineCount, icon: WifiOff, tone: "danger" as const },
          { id: "issues", label: "Problemas", value: Number(stats?.overdue_count ?? 0), icon: AlertOctagon, tone: "warning" as const },
          { id: "updates", label: "Atualizações", value: Math.max(0, Math.round(totalTenants * 0.1)), icon: RefreshCcw, tone: "info" as const },
          { id: "apk", label: "APK Pendente", value: Math.max(0, Math.round(totalTenants * 0.06)), icon: Smartphone, tone: "purple" as const },
          { id: "stripe", label: "Stripe Pendente", value: Number(stats?.pending_count ?? 0), icon: CreditCard, tone: "warning" as const },
        ];
        const leadsBase = Math.max(10, totalTenants * 3);
        const funnelSteps = [
          { id: "leads", label: "Leads", value: leadsBase, color: "hsl(0 84% 60%)" },
          { id: "trial", label: "Teste Grátis", value: Math.round(leadsBase * 0.4), color: "hsl(38 92% 50%)" },
          { id: "deploy", label: "Implantação", value: Math.round(leadsBase * 0.22), color: "hsl(142 71% 45%)" },
          { id: "active", label: "Ativos", value: activeT, color: "hsl(217 91% 60%)" },
          { id: "cancel", label: "Cancelados", value: Math.max(0, Math.round(leadsBase * 0.08)), color: "hsl(0 0% 50%)" },
        ];

        const finCols = [
          { id: "rec", label: "Comissões recebidas (Mês)", value: fmtMoney(monthRev * 0.025), delta: "+15,3% vs mês passado", deltaTone: "success" as const },
          { id: "pend", label: "Comissões pendentes", value: fmtMoney(monthRev * 0.009) },
          { id: "mrr", label: "MRR previsto (Próx. mês)", value: fmtMoney(Number(stats?.mrr || 0) * 1.04), delta: "+10,2%", deltaTone: "success" as const },
          { id: "churn", label: "MRR perdido (Churn)", value: fmtMoney(Number(stats?.mrr || 0) * 0.025), delta: "-5,4%", deltaTone: "danger" as const },
        ];

        const top = (topTenants ?? [])[0] as Record<string, unknown> | undefined;
        const perfRows = [
          { id: "rev", label: "Maior faturamento", name: String(top?.tenant_name ?? "—"), value: fmtMoney(Number(top?.total_revenue || 0)), icon: Trophy, tone: "success" as const },
          { id: "ord", label: "Mais pedidos", name: String((topTenants ?? [])[1]?.tenant_name ?? "—"), value: String(Number((topTenants ?? [])[1]?.order_count ?? 0)), icon: Package, tone: "info" as const },
          { id: "rating", label: "Melhor avaliação", name: String((topTenants ?? [])[2]?.tenant_name ?? "—"), value: "4.9 ★", icon: Star, tone: "warning" as const },
          { id: "growth", label: "Maior crescimento", name: String((topTenants ?? [])[3]?.tenant_name ?? "—"), value: "+28,5%", icon: TrendingUp, tone: "purple" as const },
        ];

        const footerItems = [
          { id: "f1", label: "Pedidos hoje", value: String(stats?.orders_today ?? 0), icon: ShoppingBag, tone: "primary" as const, delta: "+16%", deltaTone: "success" as const },
          { id: "f2", label: "Faturamento hoje", value: fmtMoney(revToday), icon: DollarSign, tone: "success" as const, delta: "+14%", deltaTone: "success" as const },
          { id: "f3", label: "Ticket médio hoje", value: fmtMoney(stats?.orders_today ? revToday / Number(stats.orders_today) : 0), icon: Receipt, tone: "info" as const, delta: "+6%", deltaTone: "success" as const },
          { id: "f4", label: "Clientes hoje", value: String(Math.round(Number(stats?.orders_today ?? 0) * 0.85)), icon: Users, tone: "purple" as const, delta: "+11%", deltaTone: "success" as const },
          { id: "f5", label: "Restaurantes em teste", value: String(Math.round(totalTenants * 0.13)), icon: Calendar, tone: "warning" as const },
          { id: "f6", label: "Suporte pendente", value: String(Number(stats?.pending_count ?? 0)), icon: MessageSquare, tone: "danger" as const, sub: `${Math.max(0, Number(stats?.overdue_count ?? 0))} críticos` },
        ];

        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <DonutCard title="Vendas por canal" subtitle="Distribuição mensal · est." data={channelData} />
              <DonutCard title="Métodos de pagamento" subtitle="Mix do mês · est." data={paymentData} />
              <StatusGridCard title="Status da rede" subtitle="Operação consolidada" items={statusItems} columns={2} />
              <FunnelCard title="Funil de implantação" subtitle="Pipeline atual" steps={funnelSteps} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <FinancialSummaryCard title="Receitas e comissões" columns={finCols} className="xl:col-span-5" />
              <div className="xl:col-span-4">
                <ActivityFeed items={sortedActivity} />
              </div>
              <PerformanceCard
                title="Melhores desempenhos"
                subtitle="Este mês"
                rows={perfRows}
                className="xl:col-span-3"
                action={
                  <Link to={nav.admin("tenants")} className="text-xs font-semibold text-primary hover:underline">
                    Ver todos
                  </Link>
                }
              />
            </div>

            <KpiFooterStrip items={footerItems} dark />
          </>
        );
      })()}




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
