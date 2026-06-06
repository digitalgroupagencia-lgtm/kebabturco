import {
  AlertTriangle,
  Bell,
  Clock,
  CreditCard,
  DollarSign,
  Package,
  RefreshCcw,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { panelColumnStatus } from "@/lib/orderOperationalFlow";
import { getStatusLabel } from "@/lib/orderStatusLabels";
import { PremiumMetricCard } from "@/components/premium/PremiumMetricCard";
import { useMemo } from "react";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);

const mockTopProducts = [
  { name: "Durum Mixto", qty: 82, revenue: "€ 1.025,60", progress: 92 },
  { name: "Kebab Clásico", qty: 68, revenue: "€ 816,40", progress: 76 },
  { name: "Pizza Familiar", qty: 51, revenue: "€ 612,00", progress: 58 },
  { name: "Batatas Fritas", qty: 45, revenue: "€ 337,50", progress: 48 },
  { name: "Coca-Cola", qty: 38, revenue: "€ 95,00", progress: 35 },
];

const mockRecentOrders = [
  { id: "#1024", source: "Mesa 4", time: "há 2 min", items: "2 itens", total: "€ 28,00", status: "Em preparo" },
  { id: "#1023", source: "Delivery", time: "há 5 min", items: "3 itens", total: "€ 41,50", status: "Em preparo" },
  { id: "#1022", source: "QR Mesa 7", time: "há 7 min", items: "2 itens", total: "€ 24,90", status: "Pronto" },
  { id: "#1021", source: "Mesa 2", time: "há 9 min", items: "1 item", total: "€ 15,50", status: "Pronto" },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${Math.max(1, mins)} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "ontem" : `há ${days}d`;
}

export default function PanelDashboard() {
  const { storeId: STORE_ID } = useAdminStoreId();

  const { data, isLoading } = useQuery({
    queryKey: ["panel-dashboard-financial", STORE_ID],
    enabled: !!STORE_ID,
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("total, status, created_at")
        .eq("store_id", STORE_ID!)
        .gte("created_at", startOfMonth.toISOString());
      if (error) throw error;

      const today = orders.filter((o) => new Date(o.created_at) >= startOfDay);
      const activeToday = today.filter((o) => o.status !== "cancelled");
      const totalToday = activeToday.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const totalMonth = orders
        .filter((o) => o.status !== "cancelled")
        .reduce((s, o) => s + Number(o.total ?? 0), 0);
      const ordersToday = activeToday.length;
      const ordersMonth = orders.filter((o) => o.status !== "cancelled").length;
      const avgTicket = ordersToday > 0 ? totalToday / ordersToday : 0;
      const cancelledToday = today.filter((o) => o.status === "cancelled").length;

      const countStatus = (status: string) =>
        today.filter((o) => panelColumnStatus(o.status) === status).length;

      return {
        totalToday,
        totalMonth,
        ordersToday,
        ordersMonth,
        avgTicket,
        cancelledToday,
        pending: countStatus("pending"),
        preparing: countStatus("preparing"),
        ready: countStatus("ready"),
        delivered: countStatus("delivered"),
      };
    },
    refetchInterval: 60000,
  });

  const { data: recentOrdersData } = useQuery({
    queryKey: ["panel-dashboard-recent-orders", STORE_ID],
    enabled: !!STORE_ID,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, order_number, total, created_at, status")
        .eq("store_id", STORE_ID!)
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) throw error;
      return orders ?? [];
    },
    refetchInterval: 30000,
  });

  const recentOrders = useMemo(() => {
    if (!recentOrdersData || recentOrdersData.length === 0) return mockRecentOrders;
    return recentOrdersData.map((order) => ({
      id: `#${order.order_number ?? String(order.id).slice(0, 4)}`,
      source: "Pedido online",
      time: relativeTime(order.created_at),
      items: "itens",
      total: fmt(Number(order.total ?? 0)),
      status: getStatusLabel(panelColumnStatus(order.status)),
    }));
  }, [recentOrdersData]);

  const topProducts = mockTopProducts;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="flex">
        <aside className="hidden min-h-screen w-[260px] border-r border-white/10 bg-[#080808] p-5 lg:block">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D62300] to-[#8B0F1A]">
              <Package className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black">Kebab Turco</h2>
              <p className="text-xs text-zinc-500">Gandia · Restaurante</p>
            </div>
          </div>

          <nav className="space-y-6">
            <MenuGroup title="Operação" items={["Pedidos ao vivo", "Resumo", "Caixa", "Mapa de mesas"]} active="Resumo" />
            <MenuGroup title="Gestão" items={["Mesas & QR", "Cardápio", "Clientes", "Promoções", "Cupons", "Fidelidade"]} />
            <MenuGroup title="Financeiro" items={["Recebimentos", "Pagamentos", "Extrato"]} />
            <MenuGroup title="Configuração" items={["Configurações", "Impressoras", "Usuários", "Integrações"]} />
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight">Resumo do Restaurante</h1>
              <p className="mt-1 text-sm text-zinc-400">Visão geral do seu negócio em tempo real</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-sm font-semibold">📍 Gandia</button>
              <button className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-400">● Aberto</button>
              <div className="text-xs text-zinc-500">Atualizado há<br /><span className="font-bold text-white">12 segundos</span></div>
              <button className="relative rounded-xl border border-white/10 bg-[#111111] p-3">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 rounded-full bg-[#D62300] px-1.5 text-[10px] font-bold">3</span>
              </button>
              <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8B0F1A] to-[#D62300] px-5 py-3 text-sm font-black">
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </button>
            </div>
          </header>

          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <PremiumMetricCard title="Pedidos Hoje" value={isLoading ? "—" : String(data?.ordersToday ?? 0)} trend="+18%" subtitle="vs ontem" icon={ShoppingBag} color="brand" />
            <PremiumMetricCard title="Faturamento Hoje" value={isLoading ? "—" : fmt(data?.totalToday ?? 0)} trend="+12%" subtitle="vs ontem" icon={DollarSign} color="red" />
            <PremiumMetricCard title="Ticket Médio" value={isLoading ? "—" : fmt(data?.avgTicket ?? 0)} trend="+3%" subtitle="vs ontem" icon={CreditCard} color="orange" />
            <PremiumMetricCard title="Clientes Atendidos" value={isLoading ? "—" : String(data?.ordersToday ?? 0)} trend="+7%" subtitle="vs ontem" icon={Users} color="purple" />
            <PremiumMetricCard title="Avaliação Média" value="4.8" subtitle="Baseado em 128 avaliações" icon={Star} color="yellow" />
            <PremiumMetricCard title="Tempo Médio Produção" value="12 min" trend="-2 min" subtitle="vs ontem" icon={Clock} color="blue" />
          </section>

          <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
            <Card title="Faturamento dos últimos 30 dias">
              <div className="mb-4 flex gap-2">
                {["Hoje", "7 dias", "30 dias", "90 dias", "Ano"].map((p) => (
                  <button key={p} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${p === "30 dias" ? "border-[#D62300] bg-[#D62300] text-white" : "border-white/10 text-zinc-400"}`}>
                    {p}
                  </button>
                ))}
              </div>
              <RevenueSvg />
            </Card>

            <Card title="Top produtos">
              <div className="space-y-4">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="grid grid-cols-[24px_44px_1fr_auto] items-center gap-3">
                    <span className="font-bold text-[#EF4444]">{i + 1}</span>
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-700" />
                    <div>
                      <p className="text-sm font-bold">{p.name}</p>
                      <div className="mt-2 h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-gradient-to-r from-[#8B0F1A] to-[#D62300]" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{p.qty}</p>
                      <p className="text-xs text-zinc-400">{p.revenue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card title="Métodos de pagamento"><Donut items={["Dinheiro 45%", "Cartão 35%", "Online 15%", "Bizum 5%"]} /></Card>
            <Card title="Pedidos por canal"><Donut items={["Salão 40%", "QR Mesa 25%", "Delivery 20%", "Take Away 10%", "App 5%"]} /></Card>
            <Card title="Estado operacional hoje">
              <div className="grid grid-cols-5 gap-3">
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
                {recentOrders.map((o) => (
                  <div key={o.id} className="grid grid-cols-[70px_1fr_auto_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <b>{o.id}</b>
                    <div>
                      <p className="text-sm">{o.source}</p>
                      <p className="text-xs text-zinc-500">{o.time} · {o.items}</p>
                    </div>
                    <b>{o.total}</b>
                    <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-400">{o.status}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Alertas importantes">
              <Alert label="Estoque baixo" desc="Batatas Fritas" />
              <Alert label="Impressora offline" desc="Impressora da cozinha" critical />
              <Alert label="Entrega atrasada" desc="Pedido #1015 · 24 min atraso" />
              <Alert label="Cupom prestes a expirar" desc="10%OFF · Expira em 2 dias" info />
            </Card>

            <Card title="Resumo financeiro">
              <FinanceLine label="Receita Bruta" value={isLoading ? "—" : fmt(data?.totalToday ?? 0)} />
              <FinanceLine label="Receita Líquida" value={isLoading ? "—" : fmt((data?.totalToday ?? 0) * 0.87)} />
              <FinanceLine label="Descontos" value="- € 120,50" />
              <FinanceLine label="Cupons" value="- € 75,00" />
              <FinanceLine label="Impostos" value="- € 345,00" />
              <div className="mt-5 flex items-center justify-between text-lg font-black text-emerald-400">
                <span>Lucro Estimado</span>
                <span>{isLoading ? "—" : fmt((data?.totalToday ?? 0) * 0.64)}</span>
              </div>
            </Card>
          </section>

          <footer className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#080808] p-4 md:grid-cols-6">
            <BottomKpi label="Pedidos/hora" value="18" />
            <BottomKpi label="Faturamento Hoje" value={isLoading ? "—" : fmt(data?.totalToday ?? 0)} />
            <BottomKpi label="Ticket Médio" value={isLoading ? "—" : fmt(data?.avgTicket ?? 0)} />
            <BottomKpi label="Clientes Atendidos" value={String(data?.ordersToday ?? 0)} />
            <BottomKpi label="Entregadores Ativos" value="4" />
            <BottomKpi label="Avaliação do dia" value="4.8" />
          </footer>
        </main>
      </div>
    </div>
  );
}

function MenuGroup({ title, items, active }: { title: string; items: string[]; active?: string }) {
  return (
    <div>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item} className={`rounded-xl px-3 py-3 text-sm font-semibold ${active === item ? "bg-gradient-to-r from-[#8B0F1A] to-[#D62300] text-white" : "text-zinc-300 hover:bg-white/5"}`}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
      <h3 className="mb-5 text-lg font-black">{title}</h3>
      {children}
    </div>
  );
}

function RevenueSvg() {
  return (
    <div className="h-[310px] rounded-xl bg-gradient-to-b from-[#D62300]/10 to-transparent">
      <svg viewBox="0 0 900 300" className="h-full w-full">
        <defs>
          <linearGradient id="dashRevenue" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#D62300" stopOpacity=".35" />
            <stop offset="100%" stopColor="#D62300" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[50, 110, 170, 230].map((y) => <line key={y} x1="0" x2="900" y1={y} y2={y} stroke="rgba(255,255,255,.08)" />)}
        <path d="M20 220 C80 190 120 210 170 170 C230 110 300 180 360 140 C420 110 470 165 530 115 C590 60 620 190 690 95 C735 30 760 55 815 135 C845 180 870 125 890 145 L890 300 L20 300 Z" fill="url(#dashRevenue)" />
        <path d="M20 220 C80 190 120 210 170 170 C230 110 300 180 360 140 C420 110 470 165 530 115 C590 60 620 190 690 95 C735 30 760 55 815 135 C845 180 870 125 890 145" fill="none" stroke="#EF4444" strokeWidth="4" />
      </svg>
    </div>
  );
}

function Donut({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-6">
      <div className="h-32 w-32 rounded-full bg-[conic-gradient(#22C55E_0_35%,#2563EB_35%_60%,#EF4444_60%_78%,#F59E0B_78%_90%,#7C3AED_90%_100%)]" />
      <div className="space-y-2">
        {items.map((item) => <p key={item} className="text-sm text-zinc-300">{item}</p>)}
      </div>
    </div>
  );
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
