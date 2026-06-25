import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Users as UsersIcon, ShoppingBag, DollarSign } from "lucide-react";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import PremiumMetricCard from "@/components/admin/premium/PremiumMetricCard";
import PremiumSection from "@/components/admin/premium/PremiumSection";

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

  const planPrices: Record<string, number> = { start: 49, pro: 149, premium: 349 };

  const totalMRR = tenants?.reduce((sum, t) => sum + (planPrices[t.plan || "start"] || 0), 0) ?? 0;

  return (
    <div className="space-y-5 max-w-full">
      <PremiumPageHeader
        icon={CreditCard}
        title="Planos & Cobrança"
        subtitle="MRR e preços por plano são valores de referência interna, não usar para facturação real."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <PremiumMetricCard
          icon={DollarSign}
          label="MRR Total (ref.)"
          value={`R$ ${totalMRR.toFixed(2)}`}
          tone="success"
        />
        <PremiumMetricCard
          icon={UsersIcon}
          label="Clientes pagantes"
          value={tenants?.filter((t) => t.plan && t.plan !== "start").length ?? 0}
          tone="primary"
        />
        <PremiumMetricCard
          icon={ShoppingBag}
          label="Pedidos (mês)"
          value={Object.values(orderCounts ?? {}).reduce((a, b) => a + b, 0)}
          tone="info"
        />
      </div>

      <PremiumSection icon={UsersIcon} title="Uso por cliente" description="Pedidos do mês por tenant">
        <div className="space-y-2">
          {tenants?.map((t) => {
            const used = orderCounts?.[t.id] ?? 0;
            return (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-semibold truncate text-sm">{t.name}</span>
                  <Badge variant="outline" className="uppercase text-[10px]">{t.plan || "start"}</Badge>
                  <span className="text-[11px] text-muted-foreground">
                    ref. R$ {planPrices[t.plan || "start"] || 0}/mês
                  </span>
                </div>
                <span className="text-xs sm:text-sm tabular-nums shrink-0 font-semibold">
                  {used} <span className="text-muted-foreground font-normal">pedidos / mês</span>
                </span>
              </div>
            );
          })}
        </div>
      </PremiumSection>
    </div>
  );
};

export default BillingPage;
