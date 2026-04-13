import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Monitoramento</h2>
        <Badge variant="outline" className="text-xs">Auto-refresh 30s</Badge>
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
            return (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {!t.is_active ? (
                    <XCircle className="w-5 h-5 text-destructive" />
                  ) : hasActivity ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{tStores.length} lojas</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.is_active ? "default" : "destructive"}>
                    {t.is_active ? "Online" : "Inativo"}
                  </Badge>
                  {hasActivity && (
                    <span className="text-xs text-muted-foreground">
                      {tStores.reduce((sum, s) => sum + (ordersPerStore[s.id] ?? 0), 0)} pedidos/h
                    </span>
                  )}
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
