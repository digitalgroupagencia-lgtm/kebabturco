import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, ShoppingBag, DollarSign, XCircle, UserCircle2 } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import PremiumMetricCard from "@/components/admin/premium/PremiumMetricCard";
import PremiumChartCard from "@/components/admin/premium/PremiumChartCard";
import PremiumSection from "@/components/admin/premium/PremiumSection";
import PremiumTable from "@/components/admin/premium/PremiumTable";
import type { StaffI18nKey } from "@/lib/staffI18n";

const PERIOD_KEYS: StaffI18nKey[] = [
  "reports.period.today",
  "reports.period.7d",
  "reports.period.30d",
  "reports.period.90d",
];
const PERIOD_DAYS = [0, 7, 30, 90];

const ReportsPage = () => {
  const { t, lang } = useStaffT();
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const storeId = roleData?.store_id;

  const [period, setPeriod] = useState(0);
  const [summary, setSummary] = useState({ total_orders: 0, total_revenue: 0, avg_ticket: 0, total_cancelled: 0 });
  const [topProducts, setTopProducts] = useState<{ product_id: string; product_name: string; total_qty: number; total_revenue: number }[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: number; order_count: number; revenue: number }[]>([]);
  const [sellerData, setSellerData] = useState<{ seller_id: string; seller_name: string; order_count: number; revenue: number; avg_ticket: number; cancelled: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const getSince = (days: number) => {
    const d = new Date();
    if (days === 0) d.setHours(0, 0, 0, 0);
    else d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  useEffect(() => {
    if (storeId) fetchAll();
  }, [storeId, period]);

  const fetchAll = async () => {
    if (!storeId) return;
    setLoading(true);
    const since = getSince(PERIOD_DAYS[period]);

    const [summaryRes, productsRes, hourlyRes, sellerRes] = await Promise.all([
      supabase.rpc("get_sales_summary", { _store_id: storeId, _since: since }),
      supabase.rpc("get_top_products", { _store_id: storeId, _since: since, _limit: 10 }),
      supabase.rpc("get_hourly_sales", { _store_id: storeId, _since: since }),
      supabase.rpc("get_seller_report", { _store_id: storeId, _since: since }),
    ]);

    if (summaryRes.data && Array.isArray(summaryRes.data) && summaryRes.data.length > 0) {
      const s = summaryRes.data[0] as any;
      setSummary({
        total_orders: Number(s.total_orders) || 0,
        total_revenue: Number(s.total_revenue) || 0,
        avg_ticket: Number(s.avg_ticket) || 0,
        total_cancelled: Number(s.total_cancelled) || 0,
      });
    }

    if (productsRes.data) {
      setTopProducts(
        (productsRes.data as any[]).map((p) => ({
          product_id: p.product_id,
          product_name: p.product_name,
          total_qty: Number(p.total_qty),
          total_revenue: Number(p.total_revenue),
        }))
      );
    }

    if (hourlyRes.data) {
      setHourlyData(
        (hourlyRes.data as any[]).map((h) => ({
          hour: Number(h.hour),
          order_count: Number(h.order_count),
          revenue: Number(h.revenue),
        }))
      );
    }

    if (sellerRes.data) {
      setSellerData((sellerRes.data as any[]).map((r) => ({
        seller_id: r.seller_id,
        seller_name: r.seller_name,
        order_count: Number(r.order_count),
        revenue: Number(r.revenue),
        avg_ticket: Number(r.avg_ticket),
        cancelled: Number(r.cancelled),
      })));
    }

    setLoading(false);
  };

  const fullHourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = hourlyData.find((h) => h.hour === i);
    return { hour: `${String(i).padStart(2, "0")}h`, pedidos: found?.order_count || 0, receita: found?.revenue || 0 };
  });

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{t("reports.title")}</h2>
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t("common.no_store")}</CardContent></Card>
      </div>
    );
  }

  const periodLabel = t(PERIOD_KEYS[period]);
  const periodActions = (
    <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
      {PERIOD_KEYS.map((key, i) => (
        <Button
          key={key}
          size="sm"
          variant={period === i ? "default" : "ghost"}
          onClick={() => setPeriod(i)}
          className="h-8 px-3"
        >
          {t(key)}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <HowToUsePanel
        purpose={t("howto.reports.purpose")}
        whenToUse={t("howto.reports.when")}
        steps={[
          t("howto.reports.step1"),
          t("howto.reports.step2"),
          t("howto.reports.step3"),
          t("howto.reports.step4"),
        ]}
        howToConfirm={t("howto.reports.confirm")}
        assistantQuestion={t("howto.reports.assistant")}
      />

      <PremiumPageHeader
        icon={BarChart3}
        title={t("reports.title")}
        subtitle={panelT(lang, "reports.period.subtitle", { period: periodLabel.toLowerCase() })}
        actions={periodActions}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PremiumMetricCard icon={ShoppingBag} label={t("reports.metric.orders")} value={summary.total_orders} tone="primary" />
        <PremiumMetricCard icon={DollarSign} label={t("reports.metric.revenue")} value={`€ ${summary.total_revenue.toFixed(2)}`} tone="success" />
        <PremiumMetricCard icon={TrendingUp} label={t("reports.metric.avg_ticket")} value={`€ ${summary.avg_ticket.toFixed(2)}`} tone="neutral" />
        <PremiumMetricCard icon={XCircle} label={t("reports.metric.cancelled")} value={summary.total_cancelled} tone="danger" />
      </div>

      <PremiumChartCard title={t("reports.chart.hourly")} subtitle={t("reports.chart.hourly_sub")}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fullHourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="pedidos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PremiumChartCard>

      <PremiumSection icon={UserCircle2} title={t("reports.top.title")} description={t("reports.top.desc")}>
        <PremiumTable
          rows={topProducts}
          rowKey={(p) => p.product_id}
          emptyMessage={t("reports.top.empty")}
          columns={[
            {
              key: "rank",
              header: "#",
              width: "60px",
              render: (_p, i) => (
                <span className="font-bold text-base">
                  {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                </span>
              ),
            },
            {
              key: "name",
              header: t("reports.col.product"),
              render: (p) => <span className="font-medium">{p.product_name}</span>,
            },
            {
              key: "qty",
              header: t("reports.col.qty"),
              align: "right",
              render: (p) => p.total_qty,
            },
            {
              key: "rev",
              header: t("reports.col.revenue"),
              align: "right",
              render: (p) => (
                <span className="font-semibold text-success">
                  € {p.total_revenue.toFixed(2)}
                </span>
              ),
            },
          ]}
        />
      </PremiumSection>

      <PremiumSection icon={UserCircle2} title={t("reports.sellers.title")} description={t("reports.sellers.desc")}>
        <PremiumTable
          rows={sellerData}
          rowKey={(s) => s.seller_id}
          emptyMessage={t("reports.sellers.empty")}
          columns={[
            {
              key: "name",
              header: t("reports.col.seller"),
              render: (s) => <span className="font-medium">{s.seller_name}</span>,
            },
            { key: "orders", header: t("reports.metric.orders"), align: "right", render: (s) => s.order_count },
            {
              key: "rev",
              header: t("reports.metric.revenue"),
              align: "right",
              render: (s) => <span className="font-semibold">€ {s.revenue.toFixed(2)}</span>,
            },
            {
              key: "avg",
              header: t("reports.metric.avg_ticket"),
              align: "right",
              render: (s) => `€ ${s.avg_ticket.toFixed(2)}`,
            },
            {
              key: "canc",
              header: t("reports.metric.cancelled"),
              align: "right",
              render: (s) => (
                <span className={s.cancelled > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                  {s.cancelled}
                </span>
              ),
            },
          ]}
        />
      </PremiumSection>
    </div>
  );
};

export default ReportsPage;
