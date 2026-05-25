import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, DollarSign, TrendingUp, ShoppingBag } from "lucide-react";

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
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Monitoramento</h2>
        <Badge variant="outline" className="text-xs">Auto-refresh 30s</Badge>
      </div>

      {/* Financial overview */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Financeiro da plataforma</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Faturamento hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{fmt(financial?.totalToday ?? 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Faturamento mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{fmt(financial?.totalMonth ?? 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Pedidos hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{financial?.ordersToday ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Pedidos mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{financial?.ordersMonth ?? 0}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tenants Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants?.filter((t) => t.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Lojas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stores?.filter((s) => s.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pedidos (última hora)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentOrders?.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status por Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            return (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  {!t.is_active ? (
                    <XCircle className="w-5 h-5 text-destructive" />
                  ) : hasActivity ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{tStores.length} lojas</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-semibold">{fmt(tenantRevenue)}</div>
                    <div className="text-[10px] text-muted-foreground">{tenantOrders} pedidos no mês</div>
                  </div>
                  <Badge variant={t.is_active ? "default" : "destructive"}>
                    {t.is_active ? "Online" : "Inativo"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringPage;
