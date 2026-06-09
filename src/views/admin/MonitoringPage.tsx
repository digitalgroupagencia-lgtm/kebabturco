import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, DollarSign, TrendingUp, ShoppingBag, Activity, Building2, Store } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import PremiumMetricCard from "@/components/admin/premium/PremiumMetricCard";
import PremiumSection from "@/components/admin/premium/PremiumSection";

const MonitoringPage = () => {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-monitoring-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: stores } = useQuery({
    queryKey: ["admin-monitoring-stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["admin-monitoring-recent"],
    queryFn: async () => {
      const since = new Date();
      since.setHours(since.getHours() - 1);
      const { data, error } = await supabase
        .from("orders")
        .select("id, store_id, status, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Financial data: today + month, all tenants
  const { data: financial } = useQuery({
    queryKey: ["admin-monitoring-financial"],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("orders")
        .select("store_id, total, status, created_at")
        .gte("created_at", startOfMonth.toISOString())
        .neq("status", "cancelled");
      if (error) throw error;

      const today = data.filter((o) => new Date(o.created_at) >= startOfDay);

      const totalToday = today.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const totalMonth = data.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const ordersToday = today.length;
      const ordersMonth = data.length;

      const byStore: Record<string, { revenue: number; orders: number }> = {};
      data.forEach((o) => {
        if (!byStore[o.store_id]) byStore[o.store_id] = { revenue: 0, orders: 0 };
        byStore[o.store_id].revenue += Number(o.total ?? 0);
        byStore[o.store_id].orders += 1;
      });

      return { totalToday, totalMonth, ordersToday, ordersMonth, byStore };
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const storesByTenant: Record<string, typeof stores> = {};
  stores?.forEach((s) => {
    if (!storesByTenant[s.tenant_id]) storesByTenant[s.tenant_id] = [];
    storesByTenant[s.tenant_id]!.push(s);
  });

  const ordersPerStore: Record<string, number> = {};
  recentOrders?.forEach((o) => {
    ordersPerStore[o.store_id] = (ordersPerStore[o.store_id] || 0) + 1;
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);

  return (
    <div className="space-y-6">
      <HowToUsePanel
        purpose="Estado do sistema em tempo real: restaurantes ativos, lojas, pedidos da última hora e saúde geral da plataforma."
        whenToUse="Abra quando suspeitar que algo está parado (sem pedidos, impressão falhando, plataforma lenta)."
        steps={[
          "Confira o cartão Restaurantes Ativos — deve mostrar todos os clientes em produção.",
          "Pedidos da última hora atualiza a cada 30 segundos.",
          "Se ver muitos vermelhos ou nada chegando, abra Centro de Testes e Diagnóstico.",
        ]}
        howToConfirm="Plataforma saudável = restaurantes ativos > 0 e pelo menos um pedido na última hora durante horário comercial."
        assistantQuestion="Como sei se a plataforma está saudável e o que olhar primeiro quando algo parece travado?"
      />
      <PremiumPageHeader
        icon={Activity}
        title="Monitoramento"
        subtitle="Saúde da plataforma em tempo real"
        badge={<Badge variant="outline" className="text-[10px] gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Auto-refresh 30s</Badge>}
      />

      <div>
        <h3 className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Financeiro da plataforma</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PremiumMetricCard icon={DollarSign} label="Faturação hoje" value={fmt(financial?.totalToday ?? 0)} tone="success" />
          <PremiumMetricCard icon={TrendingUp} label="Faturação mês" value={fmt(financial?.totalMonth ?? 0)} tone="primary" />
          <PremiumMetricCard icon={ShoppingBag} label="Pedidos hoje" value={financial?.ordersToday ?? 0} tone="info" />
          <PremiumMetricCard icon={ShoppingBag} label="Pedidos mês" value={financial?.ordersMonth ?? 0} tone="purple" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <PremiumMetricCard icon={Building2} label="Tenants ativos" value={tenants?.filter((t) => t.is_active).length ?? 0} tone="primary" />
        <PremiumMetricCard icon={Store} label="Lojas ativas" value={stores?.filter((s) => s.is_active).length ?? 0} tone="info" />
        <PremiumMetricCard icon={Activity} label="Pedidos (última hora)" value={recentOrders?.length ?? 0} tone="success" />
      </div>

      <PremiumSection
        icon={Building2}
        title="Status por cliente"
        description="Estado operacional e faturação por tenant"
      >
        <div className="space-y-2">
          {tenants?.map((t) => {
            const tStores = storesByTenant[t.id] ?? [];
            const hasActivity = tStores.some((s) => (ordersPerStore[s.id] ?? 0) > 0);
            const tenantRevenue = tStores.reduce(
              (sum, s) => sum + (financial?.byStore[s.id]?.revenue ?? 0),
              0,
            );
            const tenantOrders = tStores.reduce(
              (sum, s) => sum + (financial?.byStore[s.id]?.orders ?? 0),
              0,
            );
            const statusColor = !t.is_active
              ? "bg-destructive/10 text-destructive"
              : hasActivity
                ? "bg-success/10 text-success"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400";
            return (
              <div
                key={t.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${statusColor}`}>
                    {!t.is_active ? (
                      <XCircle className="w-5 h-5" />
                    ) : hasActivity ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{tStores.length} {tStores.length === 1 ? "loja" : "lojas"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums">{fmt(tenantRevenue)}</div>
                    <div className="text-[10px] text-muted-foreground">{tenantOrders} pedidos / mês</div>
                  </div>
                  <Badge variant={t.is_active ? "default" : "destructive"} className="text-[10px]">
                    {t.is_active ? "Online" : "Inativo"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </PremiumSection>
    </div>
  );
};

export default MonitoringPage;
