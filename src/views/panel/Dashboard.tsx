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
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const Dashboard = () => {
  const { storeId: STORE_ID } = useAdminStoreId();
  const { summary: printSummary, loading: printLoading } = usePanelPrintStatus(STORE_ID);
  const { t } = useStaffT();

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

  const stats = [
    {
      title: "Pedidos Hoje",
      value: isLoading ? "—" : String(data?.ordersToday ?? 0),
      icon: ShoppingBag,
      color: "text-primary",
    },
    {
      title: "Faturamento Hoje",
      value: isLoading ? "—" : fmt(data?.totalToday ?? 0),
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Ticket Médio",
      value: isLoading ? "—" : fmt(data?.avgTicket ?? 0),
      icon: TrendingUp,
      color: "text-accent-foreground",
    },
    {
      title: "Faturamento Mês",
      value: isLoading ? "—" : fmt(data?.totalMonth ?? 0),
      icon: Calendar,
      color: "text-primary",
    },
  ];

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
          "Use o botão Pedidos em Vivo para ir direto à operação.",
          "A barra de impressão mostra se a impressora está conectada.",
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <PremiumMetricCard
          icon={ShoppingBag}
          tone="primary"
          label="Pedidos hoje"
          value={isLoading ? "—" : String(data?.ordersToday ?? 0)}
          sub={`${data?.ordersMonth ?? 0} no mês`}
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
          sub={`${data?.ordersMonth ?? 0} pedidos`}
        />
      </div>

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
