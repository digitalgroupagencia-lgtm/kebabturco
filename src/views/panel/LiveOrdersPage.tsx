import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Loader2, AlertTriangle, CheckCircle2, Clock3, ShoppingBag } from "lucide-react";
import PanelPageHeader from "@/components/panel/PanelPageHeader";
import PanelOrdersBoard from "@/features/ops/PanelOrdersBoard";
import { useStaffT } from "@/hooks/useStaffT";
import { panelColumnStatus } from "@/lib/orderOperationalFlow";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const LiveOrdersPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const { t } = useStaffT();
  const { data: badgeOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["panel-live-badges", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, created_at")
        .eq("store_id", storeId!)
        .gte("created_at", today.toISOString());
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  if (storeLoading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> {t("common.loading")}
      </div>
    );
  }

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">{t("common.empty")}</div>;
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t("page.live.title")}
        description="Mantenha esta página aberta no monitor da cozinha ou balcão. Só pedidos em tempo real — sem resumos nem avisos administrativos."
      />
      <section className="rounded-3xl border border-black/10 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-5 dark:border-white/10 dark:bg-[#050505]">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <LiveBadge icon={ShoppingBag} label="Pedidos hoje" value={ordersLoading ? "—" : String(badgeOrders.length)} color="bg-[#D62300] text-white" />
          <LiveBadge icon={Clock3} label="Em preparo" value={ordersLoading ? "—" : String(badgeOrders.filter((o) => panelColumnStatus(o.status) === "preparing").length)} color="bg-[#F59E0B] text-black" />
          <LiveBadge icon={AlertTriangle} label="Atrasados" value={ordersLoading ? "—" : String(badgeOrders.filter(isDelayedOrder).length)} color="bg-[#B91C1C] text-white" />
          <LiveBadge icon={CheckCircle2} label="Prontos" value={ordersLoading ? "—" : String(badgeOrders.filter((o) => panelColumnStatus(o.status) === "ready").length)} color="bg-[#22C55E] text-white" />
        </div>
      </section>
      <PanelOrdersBoard storeId={storeId} mode="live" />
    </div>
  );
};

export default LiveOrdersPage;

function LiveBadge({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-[#111111]">
      <div className="flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function isDelayedOrder(order: { status: string; created_at: string }) {
  const status = panelColumnStatus(order.status);
  const ageMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  return (status === "pending" && ageMinutes > 10) || (status === "preparing" && ageMinutes > 25) || (status === "ready" && ageMinutes > 15);
}
