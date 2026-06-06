import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  CreditCard,
  DollarSign,
  RefreshCcw,
  ShoppingBag,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { panelColumnStatus } from "@/lib/orderOperationalFlow";
import { getStatusLabel } from "@/lib/orderStatusLabels";
import { PremiumMetricCard } from "@/components/premium/PremiumMetricCard";
import { Button } from "@/components/ui/button";

type DashboardOrder = {
  id: string;
  order_number: number | null;
  total: number | null;
  status: string;
  created_at: string;
  order_type: string | null;
  payment_method: string | null;
  payment_status: string | null;
};

type TopProduct = {
  name: string;
  qty: number;
  revenue: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${Math.max(1, mins)} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "ontem" : `há ${days}d`;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export default function PanelDashboard() {
  const { storeId } = useAdminStoreId();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["panel-dashboard-real", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
      const startOfRange = new Date(startOfToday);
      startOfRange.setDate(startOfRange.getDate() - 29);

      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, order_type, payment_method, payment_status")
        .eq("store_id", storeId!)
        .gte("created_at", startOfRange.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      const orders = (ordersData ?? []) as DashboardOrder[];
      const activeOrders = orders.filter((order) => order.status !== "cancelled");
      const todayOrders = activeOrders.filter((order) => new Date(order.created_at) >= startOfToday);
      const yesterdayOrders = activeOrders.filter((order) => {
        const createdAt = new Date(order.created_at);
        return createdAt >= startOfYesterday && createdAt < startOfToday;
      });
      const monthOrders = activeOrders.filter((order) => new Date(order.created_at) >= startOfMonth);

      const revenueToday = todayOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
      const revenueYesterday = yesterdayOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
      const revenueMonth = monthOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
      const avgToday = todayOrders.length ? revenueToday / todayOrders.length : 0;
      const avgYesterday = yesterdayOrders.length ? revenueYesterday / yesterdayOrders.length : 0;

      const revenueByDay = new Map<string, number>();
      for (let i = 29; i >= 0; i -= 1) {
        const date = new Date(startOfToday);
        date.setDate(date.getDate() - i);
        revenueByDay.set(dayKey(date), 0);
      }
      activeOrders.forEach((order) => {
        const key = dayKey(new Date(order.created_at));
        if (revenueByDay.has(key)) {
          revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + Number(order.total ?? 0));
        }
      });

      const paymentBreakdown = countBy(todayOrders, (order) => order.payment_method || order.payment_status || "Não definido");
      const channelBreakdown = countBy(todayOrders, (order) => order.order_type || "Não definido");
      const delayed = todayOrders.filter((order) => {
        const status = panelColumnStatus(order.status);
        const ageMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
        return (status === "pending" && ageMinutes > 10) || (status === "preparing" && ageMinutes > 25) || (status === "ready" && ageMinutes > 15);
      });

      return {
        orders,
        todayOrders,
        yesterdayOrders: yesterdayOrders.length,
        revenueToday,
        revenueYesterday,
        revenueMonth,
        avgToday,
        avgYesterday,
        monthOrders: monthOrders.length,
        cancelledToday: orders.filter((order) => order.status === "cancelled" && new Date(order.created_at) >= startOfToday).length,
        pending: todayOrders.filter((order) => panelColumnStatus(order.status) === "pending").length,
        preparing: todayOrders.filter((order) => panelColumnStatus(order.status) === "preparing").length,
        ready: todayOrders.filter((order) => panelColumnStatus(order.status) === "ready").length,
        delivered: todayOrders.filter((order) => panelColumnStatus(order.status) === "delivered").length,
        delayed,
        revenueSeries: Array.from(revenueByDay.entries()).map(([date, revenue]) => ({ date, revenue })),
        paymentBreakdown,
        channelBreakdown,
      };
    },
    refetchInterval: 60000,
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["panel-dashboard-recent-real", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, order_number, total, created_at, status, order_type, order_items(id)")
        .eq("store_id", storeId!)
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) throw error;
      return orders ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ["panel-dashboard-products-real", storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<TopProduct[]> => {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);

      const { data: orders, error: orderError } = await supabase
        .from("orders")
        .select("id")
        .eq("store_id", storeId!)
        .neq("status", "cancelled")
        .gte("created_at", start.toISOString());
      if (orderError) throw orderError;

      const orderIds = (orders ?? []).map((order) => order.id);
      if (orderIds.length === 0) return [];

      const { data: items, error } = await supabase
        .from("order_items")
        .select("product_name, quantity, total_price")
        .in("order_id", orderIds);
      if (error) throw error;

      const byProduct = new Map<string, TopProduct>();
      (items ?? []).forEach((item) => {
        const name = item.product_name || "Produto";
        const row = byProduct.get(name) ?? { name, qty: 0, revenue: 0 };
        row.qty += Number(item.quantity ?? 1);
        row.revenue += Number(item.total_price ?? 0);
        byProduct.set(name, row);
      });

      return Array.from(byProduct.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
    },
  });

  const maxProductQty = Math.max(...topProducts.map((product) => product.qty), 1);
  const paymentItems = useMemo(() => breakdownItems(data?.paymentBreakdown ?? {}), [data?.paymentBreakdown]);
  const channelItems = useMemo(() => breakdownItems(data?.channelBreakdown ?? {}), [data?.channelBreakdown]);

  const orderDelta = (data?.todayOrders.length ?? 0) - (data?.yesterdayOrders ?? 0);
  const revenueDelta = (data?.revenueToday ?? 0) - (data?.revenueYesterday ?? 0);
  const avgDelta = (data?.avgToday ?? 0) - (data?.avgYesterday ?? 0);

  return (
    <div className="space-y-5 text-white">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Resumo do Restaurante</h1>
          <p className="mt-1 text-sm text-zinc-400">Dados reais da operação, pedidos e faturamento.</p>
        </div>
        <Button
          onClick={() => void refetch()}
          className="w-fit rounded-xl bg-gradient-to-r from-[#8B0F1A] to-[#D62300] text-white"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <PremiumMetricCard title="Pedidos Hoje" value={isLoading ? "—" : String(data?.todayOrders.length ?? 0)} trend={formatDelta(orderDelta)} subtitle="vs ontem" icon={ShoppingBag} color="brand" />
        <PremiumMetricCard title="Faturamento Hoje" value={isLoading ? "—" : fmt(data?.revenueToday ?? 0)} trend={formatMoneyDelta(revenueDelta)} subtitle="vs ontem" icon={DollarSign} color="red" />
        <PremiumMetricCard title="Ticket Médio" value={isLoading ? "—" : fmt(data?.avgToday ?? 0)} trend={formatMoneyDelta(avgDelta)} subtitle="vs ontem" icon={CreditCard} color="orange" />
        <PremiumMetricCard title="Pedidos no mês" value={isLoading ? "—" : String(data?.monthOrders ?? 0)} subtitle={fmt(data?.revenueMonth ?? 0)} icon={Users} color="purple" />
        <PremiumMetricCard title="Em preparo" value={isLoading ? "—" : String(data?.preparing ?? 0)} subtitle="pedidos de hoje" icon={Clock} color="yellow" />
        <PremiumMetricCard title="Atrasados" value={isLoading ? "—" : String(data?.delayed.length ?? 0)} subtitle="atenção operacional" icon={AlertTriangle} color="blue" />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card title="Faturamento dos últimos 30 dias">
          <RevenueBars data={data?.revenueSeries ?? []} />
        </Card>

        <Card title="Top produtos">
          <div className="space-y-4">
            {topProducts.length === 0 && <EmptyLine text="Ainda não há produtos vendidos nos últimos 30 dias." />}
            {topProducts.map((product, index) => (
              <div key={product.name} className="grid grid-cols-[24px_44px_1fr_auto] items-center gap-3">
                <span className="font-bold text-[#EF4444]">{index + 1}</span>
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-700" />
                <div>
                  <p className="text-sm font-bold">{product.name}</p>
                  <div className="mt-2 h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#8B0F1A] to-[#D62300]"
                      style={{ width: `${pct(product.qty, maxProductQty)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">{product.qty}</p>
                  <p className="text-xs text-zinc-400">{fmt(product.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Métodos de pagamento">
          <Donut items={paymentItems} empty="Sem pagamentos hoje." />
        </Card>
        <Card title="Pedidos por canal">
          <Donut items={channelItems} empty="Sem pedidos hoje." />
        </Card>
        <Card title="Estado operacional hoje">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatusBox label="Recebido" value={String(data?.pending ?? 0)} color="blue" />
            <StatusBox label="Preparo" value={String(data?.preparing ?? 0)} color="orange" />
            <StatusBox label="Prontos" value={String(data?.ready ?? 0)} color="green" />
            <StatusBox label="Entregues" value={String(data?.delivered ?? 0)} color="green" />
            <StatusBox label="Cancelados" value={String(data?.cancelledToday ?? 0)} color="red" />
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr_0.9fr]">
        <Card title="Atividade recente">
          <div className="space-y-3">
            {recentOrders.length === 0 && <EmptyLine text="Ainda não há pedidos recentes." />}
            {recentOrders.map((order) => (
              <div key={order.id} className="grid grid-cols-[70px_1fr_auto_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <b>#{order.order_number ?? String(order.id).slice(0, 4)}</b>
                <div>
                  <p className="text-sm">{order.order_type ?? "Pedido"}</p>
                  <p className="text-xs text-zinc-500">{relativeTime(order.created_at)} · {order.order_items?.length ?? 0} itens</p>
                </div>
                <b>{fmt(Number(order.total ?? 0))}</b>
                <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-400">
                  {getStatusLabel(panelColumnStatus(order.status))}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Alertas importantes">
          {(data?.delayed.length ?? 0) === 0 && (data?.pending ?? 0) === 0 && (
            <EmptyLine text="Sem alertas operacionais neste momento." />
          )}
          {(data?.delayed ?? []).slice(0, 3).map((order) => (
            <Alert
              key={order.id}
              label={`Pedido #${order.order_number ?? "—"} atrasado`}
              desc={`${getStatusLabel(panelColumnStatus(order.status))} · ${relativeTime(order.created_at)}`}
              critical
            />
          ))}
          {(data?.pending ?? 0) > 0 && (
            <Alert label="Pedidos pendentes" desc={`${data?.pending ?? 0} aguardando aceitação`} info />
          )}
        </Card>

        <Card title="Resumo financeiro">
          <FinanceLine label="Receita Bruta" value={isLoading ? "—" : fmt(data?.revenueToday ?? 0)} />
          <FinanceLine label="Pedidos pagos/recebidos" value={String(data?.todayOrders.length ?? 0)} />
          <FinanceLine label="Pedidos cancelados" value={String(data?.cancelledToday ?? 0)} />
          <FinanceLine label="Faturamento do mês" value={isLoading ? "—" : fmt(data?.revenueMonth ?? 0)} />
          <div className="mt-5 flex items-center justify-between text-lg font-black text-emerald-400">
            <span>Ticket Médio</span>
            <span>{isLoading ? "—" : fmt(data?.avgToday ?? 0)}</span>
          </div>
        </Card>
      </section>

      <footer className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#080808] p-4 md:grid-cols-6">
        <BottomKpi label="Pedidos no mês" value={String(data?.monthOrders ?? 0)} />
        <BottomKpi label="Faturamento Hoje" value={isLoading ? "—" : fmt(data?.revenueToday ?? 0)} />
        <BottomKpi label="Ticket Médio" value={isLoading ? "—" : fmt(data?.avgToday ?? 0)} />
        <BottomKpi label="Clientes Atendidos" value={String(data?.todayOrders.length ?? 0)} />
        <BottomKpi label="Prontos" value={String(data?.ready ?? 0)} />
        <BottomKpi label="Entregues" value={String(data?.delivered ?? 0)} />
      </footer>
    </div>
  );
}

function countBy<T>(rows: T[], selector: (row: T) => string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = selector(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
      <h3 className="mb-5 text-lg font-black">{title}</h3>
      {children}
    </div>
  );
}

function RevenueBars({ data }: { data: Array<{ date: string; revenue: number }> }) {
  const max = Math.max(...data.map((item) => item.revenue), 1);
  if (data.length === 0) return <EmptyLine text="Ainda não há faturamento nos últimos 30 dias." />;

  return (
    <div className="flex h-[310px] items-end gap-1 rounded-xl bg-gradient-to-b from-[#D62300]/10 to-transparent p-4">
      {data.map((item) => (
        <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-lg bg-gradient-to-t from-[#8B0F1A] to-[#EF4444]"
            style={{ height: `${Math.max(5, pct(item.revenue, max))}%` }}
            title={`${item.date}: ${fmt(item.revenue)}`}
          />
          <span className="hidden text-[9px] text-zinc-600 md:block">{new Date(item.date).getDate()}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <EmptyLine text={empty} />;
  return (
    <div className="flex items-center gap-6">
      <div className="h-32 w-32 rounded-full bg-[conic-gradient(#22C55E_0_35%,#2563EB_35%_60%,#EF4444_60%_78%,#F59E0B_78%_90%,#7C3AED_90%_100%)]" />
      <div className="space-y-2">
        {items.map((item) => <p key={item} className="text-sm text-zinc-300">{item}</p>)}
      </div>
    </div>
  );
}

function breakdownItems(values: Record<string, number>) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  return Object.entries(values)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => `${label} ${pct(value, total)}%`);
}

function formatDelta(value: number) {
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : String(value);
}

function formatMoneyDelta(value: number) {
  if (Math.abs(value) < 0.01) return "0";
  return value > 0 ? `+${fmt(value)}` : `-${fmt(Math.abs(value))}`;
}

function StatusBox({ label, value, color }: { label: string; value: string; color: "blue" | "orange" | "green" | "red" }) {
  const map = {
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    orange: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    red: "border-red-500/30 bg-red-500/10 text-red-400",
  };
  return <div className={`rounded-xl border p-4 text-center ${map[color]}`}><p className="text-xs font-bold">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}

function Alert({ label, desc, critical, info }: { label: string; desc: string; critical?: boolean; info?: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div>
        <p className="font-bold">{label}</p>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
      <AlertTriangle className={`h-5 w-5 ${critical ? "text-red-400" : info ? "text-blue-400" : "text-yellow-400"}`} />
    </div>
  );
}

function FinanceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/10 py-3 text-sm">
      <span className="text-zinc-400">{label}</span>
      <b>{value}</b>
    </div>
  );
}

function BottomKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-white/10 px-3 last:border-r-0">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">{text}</p>;
}
