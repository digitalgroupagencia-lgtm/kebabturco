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
  AlertTriangle,
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
import { panelT } from "@/lib/staffPanelLocale";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import PremiumMetricCard from "@/components/admin/premium/PremiumMetricCard";
import PremiumChartCard from "@/components/admin/premium/PremiumChartCard";
import PanelTodayOrdersList, {
  type PanelTodayOrderRow,
} from "@/components/panel/PanelTodayOrdersList";
import PanelDashboardOrderSheet from "@/components/panel/PanelDashboardOrderSheet";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isConfirmedPaidOrder } from "@/lib/orderKitchenRules";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const Dashboard = () => {
  const { storeId: STORE_ID, loading: storeLoading } = useAdminStoreId();
  const { summary: printSummary, loading: printLoading } = usePanelPrintStatus(STORE_ID ?? undefined);
  const { t, lang } = useStaffT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const goToLiveOps = () => {
    setDetailOrderId(null);
    navigate(nav.panel("live"));
    toast.message(t("dashboard.toast_use_live"));
  };

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["panel-dashboard-financial", STORE_ID],
    enabled: !!STORE_ID && !storeLoading,
    retry: 2,
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

      const rows = orders ?? [];

      const isRevenueOrder = (o: {
        status: string;
        payment_status: string | null;
        is_test?: boolean | null;
      }) => o.status !== "cancelled" && isConfirmedPaidOrder(o) && !o.is_test;

      const today = rows.filter((o) => new Date(o.created_at) >= startOfDay);
      const paidToday = today.filter(isRevenueOrder);
      const todayVisible: PanelTodayOrderRow[] = today
        .filter((o) => o.status !== "cancelled" && !o.is_test)
        .map((o) => ({
          id: o.id,
          order_number: Number(o.order_number ?? 0),
          total: Number(o.total ?? 0),
          payment_method: o.payment_method,
          payment_status: o.payment_status,
          status: o.status,
          order_type: o.order_type,
          created_at: o.created_at,
          customer_name: o.customer_name,
        }));
      const paidMonth = rows.filter(isRevenueOrder);
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

  const loadingDashboard = storeLoading || isLoading || (!data && isFetching);
  const showLoadError = isError && !data;

  const opsStats = [
    { key: "pending", label: getStatusLabel("pending", undefined, lang), value: data?.pending ?? 0, icon: Clock },
    { key: "preparing", label: getStatusLabel("preparing", undefined, lang), value: data?.preparing ?? 0, icon: ChefHat },
    { key: "ready", label: getStatusLabel("ready", undefined, lang), value: data?.ready ?? 0, icon: Package },
    { key: "cancelled", label: t("dashboard.cancelled_today"), value: data?.cancelledToday ?? 0, icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <HowToUsePanel
        purpose={t("howto.dashboard.purpose")}
        whenToUse={t("howto.dashboard.when")}
        steps={[
          t("howto.dashboard.step1"),
          t("howto.dashboard.step2"),
          t("howto.dashboard.step3"),
        ]}
        howToConfirm={t("howto.dashboard.confirm")}
        assistantQuestion={t("howto.dashboard.assistant")}
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

      {showLoadError && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="font-bold">{t("dashboard.error")}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("dashboard.error.hint")}
          </p>
          <Button type="button" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? t("common.loading") : t("dashboard.retry")}
          </Button>
        </div>
      )}

      <div className="staff-kpi-grid grid grid-cols-2 sm:grid-cols-4 staff-wide:grid-cols-4 gap-3 md:gap-4">
        <PremiumMetricCard
          icon={ShoppingBag}
          tone="primary"
          label={t("dashboard.orders_today")}
          value={loadingDashboard ? ", " : String(data?.ordersToday ?? 0)}
          sub={panelT(lang, "dashboard.metric.orders_sub", { count: String(data?.ordersMonth ?? 0) })}
        />
        <PremiumMetricCard
          icon={DollarSign}
          tone="success"
          label={t("dashboard.revenue_today")}
          value={loadingDashboard ? ", " : fmt(data?.totalToday ?? 0)}
          sub={t("dashboard.metric.revenue_sub")}
        />
        <PremiumMetricCard
          icon={TrendingUp}
          tone="info"
          label={t("dashboard.avg_ticket")}
          value={loadingDashboard ? ", " : fmt(data?.avgTicket ?? 0)}
          sub={t("dashboard.metric.avg_sub")}
        />
        <PremiumMetricCard
          icon={Calendar}
          tone="purple"
          label={t("dashboard.revenue_month")}
          value={loadingDashboard ? ", " : fmt(data?.totalMonth ?? 0)}
          sub={panelT(lang, "dashboard.metric.month_sub", { count: String(data?.ordersMonth ?? 0) })}
        />
      </div>

      <PanelTodayOrdersList
        orders={data?.todayOrders ?? []}
        loading={loadingDashboard}
        onOrderClick={setDetailOrderId}
      />

      <PanelDashboardOrderSheet
        orderId={detailOrderId}
        storeId={STORE_ID}
        viewerRole={roleData?.role}
        onClose={() => setDetailOrderId(null)}
        onGoToLive={goToLiveOps}
      />

      <PremiumChartCard title={t("dashboard.ops_today")} subtitle={t("dashboard.ops.subtitle")}>
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
                value={loadingDashboard ? ", " : item.value}
              />
            );
          })}
        </div>
      </PremiumChartCard>

      <PanelPrintStatusBar summary={printSummary} loading={printLoading} />

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.welcome")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("dashboard.welcome.body1")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.welcome.body2")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
