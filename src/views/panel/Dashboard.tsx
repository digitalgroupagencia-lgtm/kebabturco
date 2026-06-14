import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { nav } from "@/lib/navPaths";
import PanelPageHeader from "@/components/panel/PanelPageHeader";
import PanelPrintStatusBar from "@/features/ops/PanelPrintStatusBar";
import { usePanelPrintStatus } from "@/features/ops/usePanelPrintStatus";
import { panelColumnStatus } from "@/lib/orderOperationalFlow";
import { getStatusLabel } from "@/lib/orderStatusLabels";
import { useStaffT } from "@/hooks/useStaffT";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import PremiumMetricCard from "@/components/admin/premium/PremiumMetricCard";
import PremiumChartCard from "@/components/admin/premium/PremiumChartCard";
import PanelTodayOrdersList, {
  type PanelTodayOrderRow,
} from "@/components/panel/PanelTodayOrdersList";
import OpsOrderDetailSheet from "@/features/ops/OpsOrderDetailSheet";
import { reprintPanelOrder } from "@/features/ops/panelPrintHelper";
import type { PanelOrder } from "@/features/ops/usePanelOrders";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isConfirmedPaidOrder } from "@/lib/orderKitchenRules";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const Dashboard = () => {
  const { storeId: STORE_ID } = useAdminStoreId();
  const { summary: printSummary, loading: printLoading } = usePanelPrintStatus(STORE_ID);
  const { t } = useStaffT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const { data: orderDetail } = useQuery({
    queryKey: ["panel-dashboard-order-detail", STORE_ID, detailOrderId],
    enabled: !!STORE_ID && !!detailOrderId,
    queryFn: async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", detailOrderId!)
        .single();
      if (error) throw error;
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", detailOrderId!);
      return { order: order as PanelOrder, items: items ?? [] };
    },
  });

  const goToLiveOps = () => {
    setDetailOrderId(null);
    navigate(nav.panel("live"));
    toast.message("Abra Pedidos em vivo para alterar o estado do pedido.");
  };

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
        .select(
          "id, order_number, total, status, order_type, created_at, payment_status, payment_method, customer_name, is_test",
        )
        .eq("store_id", STORE_ID!)
        .gte("created_at", startOfMonth.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;

      const isRevenueOrder = (o: {
        status: string;
        payment_status: string | null;
        is_test?: boolean | null;
      }) => o.status !== "cancelled" && isConfirmedPaidOrder(o) && !o.is_test;

      const today = orders.filter((o) => new Date(o.created_at) >= startOfDay);
      const paidToday = today.filter(isRevenueOrder);
      const todayVisible: PanelTodayOrderRow[] = today
        .filter((o) => o.status !== "cancelled" && !o.is_test)
        .map((o) => ({
          id: o.id,
          order_number: o.order_number,
          total: Number(o.total ?? 0),
          payment_method: o.payment_method,
          payment_status: o.payment_status,
          status: o.status,
          order_type: o.order_type,
          created_at: o.created_at,
          customer_name: o.customer_name,
        }));
      const paidMonth = orders.filter(isRevenueOrder);
      const totalToday = paidToday.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const totalMonth = paidMonth.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const ordersToday = paidToday.length;
      const ordersMonth = paidMonth.length;
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
        todayOrders: todayVisible,
      };
    },
    refetchInterval: 60000,
  });




  const opsStats = [
    { key: "pending", label: getStatusLabel("pending"), value: data?.pending ?? 0, icon: Clock },
    { key: "preparing", label: getStatusLabel("preparing"), value: data?.preparing ?? 0, icon: ChefHat },
    { key: "ready", label: getStatusLabel("ready"), value: data?.ready ?? 0, icon: Package },
    { key: "cancelled", label: "Cancelados hoje", value: data?.cancelledToday ?? 0, icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <HowToUsePanel
        purpose="Resumo do dia: faturamento, número de pedidos, ticket médio e estado da impressão."
        whenToUse="Abra de manhã para conferir o dia anterior e várias vezes ao longo do serviço para ver como vai."
        steps={[
          "Veja os 4 cartões do topo: faturamento, pedidos, ticket médio e cancelados.",
          "Na lista abaixo confira cada pedido do dia com valor e forma de pagamento (Bizum, cartão, etc.).",
          "Use o botão Pedidos em Vivo para gerir a operação.",
        ]}
        howToConfirm="Se os números do dia bater com o caixa, está tudo certo."
        assistantQuestion="Como o dashboard calcula faturamento e ticket médio do dia?"
      />
      <PanelPageHeader
        title={t("page.dashboard.title")}
        description={t("dashboard.subtitle")}
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

      <div className="staff-kpi-grid grid grid-cols-2 sm:grid-cols-4 staff-wide:grid-cols-4 gap-3 md:gap-4">
        <PremiumMetricCard
          icon={ShoppingBag}
          tone="primary"
          label="Pedidos hoje"
          value={isLoading ? "—" : String(data?.ordersToday ?? 0)}
          sub={`${data?.ordersMonth ?? 0} pagos no mês`}
        />
        <PremiumMetricCard
          icon={DollarSign}
          tone="success"
          label="Faturamento hoje"
          value={isLoading ? "—" : fmt(data?.totalToday ?? 0)}
          sub="Vendas confirmadas"
        />
        <PremiumMetricCard
          icon={TrendingUp}
          tone="info"
          label="Ticket médio"
          value={isLoading ? "—" : fmt(data?.avgTicket ?? 0)}
          sub="Hoje"
        />
        <PremiumMetricCard
          icon={Calendar}
          tone="purple"
          label="Faturamento mês"
          value={isLoading ? "—" : fmt(data?.totalMonth ?? 0)}
          sub={`${data?.ordersMonth ?? 0} pedidos pagos`}
        />
      </div>

      <PanelTodayOrdersList
        orders={data?.todayOrders ?? []}
        loading={isLoading}
        onOrderClick={setDetailOrderId}
      />

      <OpsOrderDetailSheet
        order={orderDetail?.order ?? null}
        items={orderDetail?.items ?? []}
        open={!!detailOrderId && !!orderDetail?.order}
        onOpenChange={(open) => {
          if (!open) setDetailOrderId(null);
        }}
        viewerRole={roleData?.role}
        onAdvance={goToLiveOps}
        onRequestAccept={goToLiveOps}
        onRequestAssignDriver={goToLiveOps}
        onCancel={goToLiveOps}
        onSetPrepMinutes={goToLiveOps}
        onMarkPaid={goToLiveOps}
        onReprint={async (order) => {
          if (!STORE_ID) return;
          try {
            await reprintPanelOrder(STORE_ID, order, orderDetail?.items ?? []);
            toast.success("Pedido enviado para impressão");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Não foi possível imprimir");
          }
        }}
      />

      <PremiumChartCard title="Estado operacional hoje" subtitle="Pedidos por etapa do fluxo">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {opsStats.map((item) => {
            const tone =
              item.key === "pending"
                ? "warning"
                : item.key === "preparing"
                ? "orange"
                : item.key === "ready"
                ? "success"
                : "danger";
            return (
              <PremiumMetricCard
                key={item.key}
                icon={item.icon}
                tone={tone as "warning" | "orange" | "success" | "danger"}
                label={item.label}
                value={isLoading ? "—" : item.value}
              />
            );
          })}
        </div>
      </PremiumChartCard>


      <PanelPrintStatusBar summary={printSummary} loading={printLoading} />

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Bem-vindo ao seu painel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Acompanhe aqui o faturamento e o estado da loja. Configure cardápio, totem e equipe pelo menu lateral.
          </p>
          <p className="text-sm text-muted-foreground">
            Os avisos do sistema e o diagnóstico aparecem nesta página — não na tela de operação ao vivo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
