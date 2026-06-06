import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  ShoppingBag,
  ChefHat,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { nav } from "@/lib/navPaths";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import PremiumMetricCard from "@/components/admin/premium/PremiumMetricCard";
import PanelOrdersBoard from "@/features/ops/PanelOrdersBoard";
import { useStaffT } from "@/hooks/useStaffT";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import { Button } from "@/components/ui/button";
import { usePanelPrintStatus } from "@/features/ops/usePanelPrintStatus";

const LiveOrdersPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const { t } = useStaffT();
  const { summary: printSummary } = usePanelPrintStatus(storeId);

  const { data: kpi } = useQuery({
    queryKey: ["live-kpi", storeId],
    enabled: !!storeId,
    refetchInterval: 30000,
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("orders")
        .select("status, created_at, estimated_ready_at, order_number, total")
        .eq("store_id", storeId!)
        .gte("created_at", startOfDay.toISOString());
      if (error) throw error;
      const list = data ?? [];
      const now = Date.now();
      const preparing = list.filter((o) => o.status === "preparing").length;
      const ready = list.filter((o) => o.status === "ready").length;
      const pending = list.filter((o) => o.status === "pending").length;
      const overdue = list.filter((o) => {
        if (o.status !== "preparing" && o.status !== "pending") return false;
        if (!o.estimated_ready_at) return false;
        return new Date(o.estimated_ready_at).getTime() < now;
      });
      const mostOverdue = overdue.sort((a, b) =>
        new Date(a.estimated_ready_at!).getTime() - new Date(b.estimated_ready_at!).getTime(),
      )[0];

      // avg prep time using preparing orders' age
      const preparingOrders = list.filter((o) => o.status === "preparing");
      const avgPrep = preparingOrders.length
        ? Math.round(
            preparingOrders.reduce((s, o) => s + (now - new Date(o.created_at).getTime()) / 60000, 0) /
              preparingOrders.length,
          )
        : 0;

      return {
        total: list.length,
        pending,
        preparing,
        ready,
        delivered: list.filter((o) => o.status === "delivered").length,
        cancelled: list.filter((o) => o.status === "cancelled").length,
        overdueCount: overdue.length,
        mostOverdue,
        avgPrep,
        readyForDelivery: list.filter((o) => o.status === "ready").length,
        lastOrder: list[list.length - 1],
      };
    },
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

  const fmt = (n: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);

  return (
    <div className="space-y-5">
      <HowToUsePanel
        purpose="Mostra todos os pedidos do dia em tempo real, organizados em colunas por estado."
        whenToUse="Use durante o serviço. Esta é a tela principal da operação."
        steps={[
          "Quando entra um pedido novo, toca um som e aparece na primeira coluna.",
          "Toque no pedido para abrir o detalhe e confirmar.",
          "Arraste ou use os botões para mover entre colunas.",
          "Pedidos vermelhos = atrasados. Amarelos = perto do limite.",
        ]}
        howToConfirm="Cada pedido novo dispara som + vibração."
        assistantQuestion="Como funciona a tela de Pedidos em Vivo?"
      />

      <PremiumPageHeader
        title="Pedidos ao vivo"
        subtitle="Acompanhe todos os pedidos em tempo real"
        icon={Radio}
        actions={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Online
          </span>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <PremiumMetricCard icon={ShoppingBag} tone="primary" label="Pedidos hoje" value={kpi?.total ?? 0} sub="Em todas as etapas" />
        <PremiumMetricCard icon={ChefHat} tone="orange" label="Em preparo" value={kpi?.preparing ?? 0} sub="Cozinha agora" />
        <PremiumMetricCard
          icon={AlertTriangle}
          tone={kpi && kpi.overdueCount > 0 ? "danger" : "success"}
          label="Atrasados"
          value={kpi?.overdueCount ?? 0}
          sub={kpi && kpi.overdueCount > 0 ? "Requer atenção" : "Sem atrasos"}
          deltaDirection={kpi && kpi.overdueCount > 0 ? "down" : "up"}
        />
        <PremiumMetricCard icon={CheckCircle2} tone="success" label="Prontos" value={kpi?.ready ?? 0} sub="Aguardando saída" />
        <PremiumMetricCard
          icon={Clock}
          tone="info"
          label="Tempo médio preparo"
          value={`${kpi?.avgPrep ?? 0} min`}
          sub="Pedidos em curso"
          estimated
        />
      </div>

      {/* Board + side summary */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <div className="min-w-0">
          <PanelOrdersBoard storeId={storeId} mode="live" />
        </div>

        <aside className="rounded-2xl border border-border/70 bg-card p-5 space-y-5 self-start xl:sticky xl:top-20">
          <div>
            <h4 className="text-sm font-bold text-foreground mb-3">Resumo da operação</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex justify-between"><span className="text-muted-foreground">Pedidos pendentes</span><span className="font-bold tabular-nums">{kpi?.pending ?? 0}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Atrasados</span><span className="font-bold text-rose-500 tabular-nums">{kpi?.overdueCount ?? 0}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Prontos para entrega</span><span className="font-bold tabular-nums">{kpi?.readyForDelivery ?? 0}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Tempo médio preparo</span><span className="font-bold tabular-nums">{kpi?.avgPrep ?? 0} min</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Cancelados hoje</span><span className="font-bold tabular-nums">{kpi?.cancelled ?? 0}</span></li>
            </ul>
          </div>

          {kpi?.mostOverdue && (
            <div>
              <h4 className="text-sm font-bold text-foreground mb-2">Pedido mais atrasado</h4>
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">#{kpi.mostOverdue.order_number}</span>
                  <span className="text-xs font-bold text-rose-500">
                    {Math.max(0, Math.round((Date.now() - new Date(kpi.mostOverdue.estimated_ready_at!).getTime()) / 60000))} min
                  </span>
                </div>
                <p className="text-sm font-bold tabular-nums mt-1">{fmt(Number(kpi.mostOverdue.total ?? 0))}</p>
                <Button size="sm" variant="destructive" className="w-full mt-2 h-8 text-xs" asChild>
                  <Link to={nav.panel("orders")}>Ver pedido <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-bold text-foreground mb-2">Impressoras</h4>
            <ul className="space-y-1.5 text-xs">
              <li className="flex justify-between items-center">
                <span className="text-muted-foreground">Bridge</span>
                <span
                  className={
                    printSummary?.bridge === "active"
                      ? "text-emerald-500 font-bold"
                      : "text-rose-500 font-bold"
                  }
                >
                  {printSummary?.bridge === "active" ? "● Online" : "● Inativa"}
                </span>
              </li>
              <li className="flex justify-between"><span className="text-muted-foreground">Pendentes</span><span className="font-bold tabular-nums">{printSummary?.pending ?? 0}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Falhadas</span><span className="font-bold text-rose-500 tabular-nums">{printSummary?.failed ?? 0}</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground mb-2">Ações rápidas</h4>
            <div className="space-y-2">
              <Button asChild size="sm" className="w-full justify-start gap-2 h-9">
                <Link to={nav.panel("orders")}><ShoppingBag className="h-4 w-4" /> Novo pedido</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start gap-2 h-9">
                <Link to={nav.panel("orders")}><Clock className="h-4 w-4" /> Histórico</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start gap-2 h-9">
                <Link to={nav.panel("table-map")}><Radio className="h-4 w-4" /> Mapa de mesas</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LiveOrdersPage;
