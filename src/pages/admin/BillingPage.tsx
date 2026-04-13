import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

const BillingPage = () => {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-billing-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: orderCounts } = useQuery({
    queryKey: ["admin-billing-orders"],
    queryFn: async () => {
      const firstDay = new Date();
      firstDay.setDate(1);
      firstDay.setHours(0, 0, 0, 0);
      const { data: stores, error: se } = await supabase.from("stores").select("id, tenant_id");
      if (se) throw se;
      const { data: orders, error: oe } = await supabase
        .from("orders")
        .select("id, store_id")
        .gte("created_at", firstDay.toISOString());
      if (oe) throw oe;

      const storeToTenant: Record<string, string> = {};
      stores.forEach((s) => { storeToTenant[s.id] = s.tenant_id; });

      const counts: Record<string, number> = {};
      orders.forEach((o) => {
        const tid = storeToTenant[o.store_id];
        if (tid) counts[tid] = (counts[tid] || 0) + 1;
      });
      return counts;
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const planPrices: Record<string, number> = { free: 0, starter: 99, pro: 249, enterprise: 499 };

  const totalMRR = tenants?.reduce((sum, t) => sum + (planPrices[t.plan || "free"] || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Planos & Cobrança</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">MRR Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalMRR.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Clientes Pagantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants?.filter((t) => t.plan && t.plan !== "free").length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pedidos (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(orderCounts ?? {}).reduce((a, b) => a + b, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uso por Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tenants?.map((t) => {
            const used = orderCounts?.[t.id] ?? 0;
            const limit = t.max_orders_month ?? 500;
            const pct = Math.min((used / limit) * 100, 100);
            return (
              <div key={t.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    <Badge variant="outline" className="capitalize">{t.plan || "free"}</Badge>
                    <span className="text-sm text-muted-foreground">
                      R$ {planPrices[t.plan || "free"] || 0}/mês
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {used} / {limit} pedidos
                  </span>
                </div>
                <Progress value={pct} className={pct > 90 ? "[&>div]:bg-destructive" : ""} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingPage;
