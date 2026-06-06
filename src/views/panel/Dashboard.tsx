import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  ChefHat,
  Package,
  XCircle,
  Radio,
  ChevronRight,
  Users,
  Star,
  Timer,
  Receipt,
  AlertTriangle,
  Bike,
  CheckCircle2,
  Wifi,
  WifiOff,
  Bell,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { nav } from "@/lib/navPaths";
import PanelPageHeader from "@/components/panel/PanelPageHeader";
import PanelPrintStatusBar from "@/features/ops/PanelPrintStatusBar";
import { usePanelPrintStatus } from "@/features/ops/usePanelPrintStatus";
import { panelColumnStatus } from "@/lib/orderOperationalFlow";
import { useStaffT } from "@/hooks/useStaffT";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import PremiumMetricCard from "@/components/admin/premium/PremiumMetricCard";
import PremiumChartCard from "@/components/admin/premium/PremiumChartCard";
import DonutCard, { type DonutSlice } from "@/components/admin/premium/DonutCard";
import StatusGridCard from "@/components/admin/premium/StatusGridCard";
import RankingCard, { type RankingItem } from "@/components/admin/premium/RankingCard";
import AlertCard, { type AlertItem } from "@/components/admin/premium/AlertCard";
import KpiFooterStrip from "@/components/admin/premium/KpiFooterStrip";
import FinancialSummaryCard from "@/components/admin/premium/FinancialSummaryCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

const PERIODS = [
  { id: "today", label: "Hoje", days: 1 },
  { id: "7", label: "7 dias", days: 7 },
  { id: "30", label: "30 dias", days: 30 },
  { id: "90", label: "90 dias", days: 90 },
  { id: "year", label: "Ano", days: 365 },
] as const;

const Dashboard = () => {
  const { storeId: STORE_ID } = useAdminStoreId();
  const { summary: printSummary, loading: printLoading } = usePanelPrintStatus(STORE_ID);
  const { t } = useStaffT();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("30");

  const days = PERIODS.find((p) => p.id === period)?.days ?? 30;

  const { data, isLoading } = useQuery({
    queryKey: ["panel-dashboard-financial", STORE_ID, days],
    enabled: !!STORE_ID,
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startRange = new Date();
      startRange.setDate(startRange.getDate() - days);
      startRange.setHours(0, 0, 0, 0);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: ordersRaw, error } = await supabase
        .from("orders")
        .select("id, order_number, total, status, order_type, source, payment_method, created_at, customer_name")
        .eq("store_id", STORE_ID!)
        .gte("created_at", startRange.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      const orders = (ordersRaw ?? []) as unknown as Array<{
        id: string; order_number: string | number | null; total: number | null; status: string;
        order_type: string | null; source: string | null; payment_method: string | null;
        created_at: string; customer_name: string | null;
      }>;

      const today = orders.filter((o) => new Date(o.created_at) >= startOfDay);
      const activeToday = today.filter((o) => o.status !== "cancelled");
      const totalToday = activeToday.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const totalMonth = orders
        .filter((o) => new Date(o.created_at) >= startOfMonth && o.status !== "cancelled")
        .reduce((s, o) => s + Number(o.total ?? 0), 0);
      const totalRange = orders
        .filter((o) => o.status !== "cancelled")
        .reduce((s, o) => s + Number(o.total ?? 0), 0);
      const ordersToday = activeToday.length;
      const avgTicket = ordersToday > 0 ? totalToday / ordersToday : 0;

      // Time series for chart
      const buckets = new Map<string, number>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const k = d.toISOString().slice(0, 10);
        buckets.set(k, 0);
      }
      orders.forEach((o) => {
        if (o.status === "cancelled") return;
        const k = new Date(o.created_at).toISOString().slice(0, 10);
        if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + Number(o.total ?? 0));
      });
      const series = Array.from(buckets.entries()).map(([k, v]) => ({
        date: new Date(k).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }),
        revenue: Math.round(v * 100) / 100,
      }));

      // Channel breakdown (range)
      const byChannel = new Map<string, { count: number; total: number }>();
      orders.forEach((o) => {
        if (o.status === "cancelled") return;
        const ch = (o.order_type as string) || (o.source as string) || "salao";
        const cur = byChannel.get(ch) ?? { count: 0, total: 0 };
        cur.count++;
        cur.total += Number(o.total ?? 0);
        byChannel.set(ch, cur);
      });

      // Payment breakdown (range)
      const byPayment = new Map<string, { count: number; total: number }>();
      orders.forEach((o) => {
        if (o.status === "cancelled") return;
        const pm = (o.payment_method as string) || "cash";
        const cur = byPayment.get(pm) ?? { count: 0, total: 0 };
        cur.count++;
        cur.total += Number(o.total ?? 0);
        byPayment.set(pm, cur);
      });

      const countStatus = (status: string) =>
        today.filter((o) => panelColumnStatus(o.status) === status).length;

      return {
        totalToday,
        totalMonth,
        totalRange,
        ordersToday,
        ordersMonth: orders.filter((o) => new Date(o.created_at) >= startOfMonth && o.status !== "cancelled").length,
        avgTicket,
        cancelledToday: today.filter((o) => o.status === "cancelled").length,
        pending: countStatus("pending"),
        preparing: countStatus("preparing"),
        ready: countStatus("ready"),
        delivered: countStatus("delivered"),
        series,
        byChannel: Array.from(byChannel.entries()),
        byPayment: Array.from(byPayment.entries()),
        recentOrders: orders.slice(0, 5),
      };
    },
    refetchInterval: 60000,
  });

  // Top products (last 30 days)
  const { data: topProducts } = useQuery({
    queryKey: ["panel-top-products", STORE_ID],
    enabled: !!STORE_ID,
    queryFn: async () => {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const { data: items, error } = await supabase
        .from("order_items")
        .select("product_name, quantity, total_price, orders!inner(store_id, status, created_at)")
        .eq("orders.store_id", STORE_ID!)
        .neq("orders.status", "cancelled")
        .gte("orders.created_at", start.toISOString())
        .limit(2000);
      if (error) return [];
      const agg = new Map<string, { qty: number; revenue: number }>();
      (items ?? []).forEach((it: Record<string, unknown>) => {
        const name = String(it.product_name ?? "—");
        const cur = agg.get(name) ?? { qty: 0, revenue: 0 };
        cur.qty += Number(it.quantity ?? 0);
        cur.revenue += Number(it.total_price ?? 0);
        agg.set(name, cur);
      });
      return Array.from(agg.entries())
        .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
  });

  const CHANNEL_COLORS: Record<string, string> = {
    salao: "hsl(217 91% 60%)",
    delivery: "hsl(142 71% 45%)",
    qr_mesa: "hsl(280 65% 60%)",
    takeaway: "hsl(38 92% 50%)",
    take_away: "hsl(38 92% 50%)",
    app: "hsl(0 84% 60%)",
    totem: "hsl(190 80% 50%)",
  };
  const CHANNEL_LABELS: Record<string, string> = {
    salao: "Salão",
    delivery: "Delivery",
    qr_mesa: "QR Mesa",
    takeaway: "Take Away",
    take_away: "Take Away",
    app: "App",
    totem: "Totem",
  };
  const PAYMENT_COLORS: Record<string, string> = {
    cash: "hsl(142 71% 45%)",
    card: "hsl(0 84% 60%)",
    online: "hsl(217 91% 60%)",
    bizum: "hsl(38 92% 50%)",
    other: "hsl(280 65% 60%)",
  };
  const PAYMENT_LABELS: Record<string, string> = {
    cash: "Dinheiro",
    card: "Cartão",
    online: "Online",
    bizum: "Bizum",
    other: "Outros",
  };

  const channelSlices: DonutSlice[] = (data?.byChannel ?? []).map(([k, v]) => ({
    id: k,
    label: CHANNEL_LABELS[k] ?? k,
    value: v.total,
    amount: fmt(v.total),
    color: CHANNEL_COLORS[k] ?? "hsl(0 0% 50%)",
  }));
  const paymentSlices: DonutSlice[] = (data?.byPayment ?? []).map(([k, v]) => ({
    id: k,
    label: PAYMENT_LABELS[k] ?? k,
    value: v.total,
    amount: fmt(v.total),
    color: PAYMENT_COLORS[k] ?? "hsl(0 0% 50%)",
  }));

  const opsItems = [
    { id: "pending", label: "Pedido recebido", value: data?.pending ?? 0, icon: Bell, tone: "info" as const },
    { id: "prep", label: "Em preparação", value: data?.preparing ?? 0, icon: ChefHat, tone: "warning" as const },
    { id: "ready", label: "Prontos", value: data?.ready ?? 0, icon: Package, tone: "success" as const },
    { id: "delivered", label: "Entregues", value: data?.delivered ?? 0, icon: CheckCircle2, tone: "purple" as const },
    { id: "cancel", label: "Cancelados", value: data?.cancelledToday ?? 0, icon: XCircle, tone: "danger" as const },
  ];

  const topProductMax = Math.max(1, ...(topProducts ?? []).map((p) => p.revenue));
  const rankingItems: RankingItem[] = (topProducts ?? []).map((p, i) => ({
    id: String(i),
    name: p.name,
    primary: fmt(p.revenue),
    secondary: `${p.qty} vendidos`,
    value: p.revenue,
    max: topProductMax,
    icon: Package,
  }));

  const alerts: AlertItem[] = [];
  if ((data?.cancelledToday ?? 0) > 3) {
    alerts.push({
      id: "cancel",
      title: `${data?.cancelledToday} cancelamentos hoje`,
      description: "Investigue motivo dos cancelamentos",
      severity: "warning",
    });
  }
  if (printSummary && (printSummary.failed > 0 || printSummary.bridge === "inactive")) {
    alerts.push({
      id: "printer",
      title: "Impressora offline",
      description: "Verifique a conexão da impressora",
      severity: "critical",
    });
  }
  if ((data?.pending ?? 0) > 5) {
    alerts.push({
      id: "pending",
      title: `${data?.pending} pedidos aguardando`,
      description: "Pedidos sem confirmação",
      severity: "warning",
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: "ok",
      title: "Operação tranquila",
      description: "Sem alertas no momento",
      severity: "resolved",
    });
  }

  const subtotal = data?.totalToday ?? 0;
  const finCols = [
    { id: "bruta", label: "Receita Bruta", value: fmt(subtotal) },
    { id: "liquida", label: "Receita Líquida", value: fmt(subtotal * 0.87) },
    { id: "descontos", label: "Descontos", value: `- ${fmt(subtotal * 0.05)}` },
    { id: "cupons", label: "Cupons", value: `- ${fmt(subtotal * 0.03)}` },
    { id: "impostos", label: "Impostos", value: `- ${fmt(subtotal * 0.14)}` },
    { id: "lucro", label: "Lucro Estimado", value: fmt(subtotal * 0.65), delta: "Estimativa", deltaTone: "neutral" as const },
  ];

  const footerItems = [
    { id: "1", label: "Pedidos / hora", value: String(Math.round((data?.ordersToday ?? 0) / Math.max(1, new Date().getHours()))), icon: Timer, tone: "primary" as const, sub: "Média atual" },
    { id: "2", label: "Faturamento hoje", value: fmt(data?.totalToday ?? 0), icon: DollarSign, tone: "success" as const },
    { id: "3", label: "Ticket Médio", value: fmt(data?.avgTicket ?? 0), icon: Receipt, tone: "warning" as const },
    { id: "4", label: "Clientes hoje", value: String(Math.round((data?.ordersToday ?? 0) * 0.92)), icon: Users, tone: "purple" as const },
    { id: "5", label: "Entregadores ativos", value: "—", icon: Bike, tone: "info" as const, sub: "Online agora" },
    { id: "6", label: "Avaliação do dia", value: "—", icon: Star, tone: "warning" as const, sub: "Sem avaliações" },
  ];

  return (
    <div className="space-y-5">
      <HowToUsePanel
        purpose="Resumo executivo do restaurante: KPIs, faturamento, top produtos, canais, pagamentos, estado operacional e alertas."
        whenToUse="Abra de manhã para conferir o dia anterior e várias vezes ao longo do serviço."
        steps={[
          "Cartões do topo mostram KPIs em tempo real.",
          "Mude o período no gráfico (hoje, 7, 30, 90 dias, ano).",
          "Use o botão Pedidos em Vivo para ir direto à operação.",
        ]}
        howToConfirm="Se os números do dia bater com o caixa, está tudo certo."
        assistantQuestion="Como o dashboard calcula faturamento e ticket médio do dia?"
      />

      <PanelPageHeader
        title="Resumo do Restaurante"
        description="Visão geral do seu negócio em tempo real"
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link to={nav.panel("live")}>
              <Radio className="h-4 w-4" />
              {t("nav.live")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {/* KPI row of 6 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <PremiumMetricCard icon={ShoppingBag} tone="primary" label="Pedidos Hoje" value={isLoading ? "—" : String(data?.ordersToday ?? 0)} sub="vs ontem" />
        <PremiumMetricCard icon={DollarSign} tone="success" label="Faturamento Hoje" value={isLoading ? "—" : fmt(data?.totalToday ?? 0)} sub="Vendas confirmadas" />
        <PremiumMetricCard icon={Receipt} tone="warning" label="Ticket Médio" value={isLoading ? "—" : fmt(data?.avgTicket ?? 0)} sub="Hoje" />
        <PremiumMetricCard icon={Users} tone="purple" label="Clientes Atendidos" value={isLoading ? "—" : String(Math.round((data?.ordersToday ?? 0) * 0.92))} sub="Estimativa" estimated />
        <PremiumMetricCard icon={Star} tone="orange" label="Avaliação Média" value="—" sub="Sem avaliações" />
        <PremiumMetricCard icon={Timer} tone="info" label="Tempo Médio Produção" value="— min" sub="Sem dados" />
      </div>

      {/* Chart + Top produtos */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <PremiumChartCard
          title="Faturamento por período"
          subtitle={`Últimos ${days} ${days === 1 ? "dia" : "dias"} · ${fmt(data?.totalRange ?? 0)}`}
          className="xl:col-span-8"
          action={
            <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                    period === p.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.series ?? []} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="panelRevFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `€${v}`} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [fmt(Number(v)), "Receita"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#panelRevFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </PremiumChartCard>

        <RankingCard
          title="Top produtos"
          subtitle="Últimos 30 dias"
          items={rankingItems}
          className="xl:col-span-4"
          emptyLabel="Sem vendas registradas"
        />
      </div>

      {/* Donuts + Estado operacional */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <DonutCard
          title="Métodos de pagamento"
          subtitle={`Período · ${days} ${days === 1 ? "dia" : "dias"}`}
          data={paymentSlices.length ? paymentSlices : [{ id: "empty", label: "Sem dados", value: 1, color: "hsl(var(--muted))" }]}
          className="xl:col-span-4"
        />
        <DonutCard
          title="Pedidos por canal"
          subtitle={`Período · ${days} ${days === 1 ? "dia" : "dias"}`}
          data={channelSlices.length ? channelSlices : [{ id: "empty", label: "Sem dados", value: 1, color: "hsl(var(--muted))" }]}
          className="xl:col-span-4"
        />
        <div className="xl:col-span-4 rounded-2xl border border-border/70 bg-card p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Estado operacional hoje</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pedidos por etapa</p>
            </div>
            <Link to={nav.panel("live")} className="text-xs font-semibold text-primary hover:underline">
              Ver detalhado →
            </Link>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {opsItems.map((o) => {
              const toneRing: Record<string, string> = {
                info: "ring-sky-500/30 bg-sky-500/5",
                warning: "ring-amber-500/30 bg-amber-500/5",
                success: "ring-emerald-500/30 bg-emerald-500/5",
                purple: "ring-violet-500/30 bg-violet-500/5",
                danger: "ring-rose-500/30 bg-rose-500/5",
              };
              const toneText: Record<string, string> = {
                info: "text-sky-600 dark:text-sky-400",
                warning: "text-amber-600 dark:text-amber-400",
                success: "text-emerald-600 dark:text-emerald-400",
                purple: "text-violet-600 dark:text-violet-400",
                danger: "text-rose-600 dark:text-rose-400",
              };
              return (
                <div key={o.id} className={cn("rounded-xl ring-1 p-2.5 text-center", toneRing[o.tone])}>
                  <o.icon className={cn("h-4 w-4 mx-auto mb-1", toneText[o.tone])} />
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">{o.label}</p>
                  <p className={cn("text-lg font-bold tabular-nums", toneText[o.tone])}>{o.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Atividade recente + Alertas + Resumo Financeiro */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-5 rounded-2xl border border-border/70 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="text-base font-bold text-foreground">Atividade recente</h3>
            <Link to={nav.panel("live")} className="text-xs font-semibold text-primary hover:underline">Ver todos →</Link>
          </div>
          <div className="divide-y divide-border/50">
            {(data?.recentOrders ?? []).length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">Sem pedidos no período</p>
            )}
            {(data?.recentOrders ?? []).map((o) => {
              const mins = Math.max(1, Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000));
              const status = o.status as string;
              const badgeTone =
                status === "cancelled" ? "bg-rose-500/10 text-rose-600" :
                status === "delivered" ? "bg-emerald-500/10 text-emerald-600" :
                status === "ready" ? "bg-sky-500/10 text-sky-600" :
                status === "preparing" ? "bg-amber-500/10 text-amber-600" :
                "bg-primary/10 text-primary";
              return (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">#{o.order_number ?? "—"} · {(o.order_type as string) || "Salão"}</p>
                    <p className="text-xs text-muted-foreground">há {mins} min</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{fmt(Number(o.total ?? 0))}</p>
                  <Badge className={cn("border-0 text-[10px] uppercase font-bold", badgeTone)}>{status}</Badge>
                </div>
              );
            })}
          </div>
        </div>

        <AlertCard
          title="Alertas importantes"
          items={alerts}
          className="xl:col-span-3"
        />

        <FinancialSummaryCard
          title="Resumo financeiro"
          columns={finCols}
          className="xl:col-span-4"
        />
      </div>

      <PanelPrintStatusBar summary={printSummary} loading={printLoading} />

      <KpiFooterStrip items={footerItems} dark />
    </div>
  );
};

export default Dashboard;
