import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { BarChart3, TrendingUp, ShoppingBag, DollarSign, XCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PremiumMetricCard } from "@/components/premium/PremiumMetricCard";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumChartCard } from "@/components/premium/PremiumChartCard";
import { PremiumTable } from "@/components/premium/PremiumTable";
import { PremiumActionButton } from "@/components/premium/PremiumActionButton";
import { PremiumEmptyState } from "@/components/premium/PremiumEmptyState";

type SalesSummaryRpc = {
  total_orders: number | string | null;
  total_revenue: number | string | null;
  avg_ticket: number | string | null;
  total_cancelled: number | string | null;
};

type TopProductsRpc = {
  product_id: string;
  product_name: string;
  total_qty: number | string | null;
  total_revenue: number | string | null;
};

type HourlySalesRpc = {
  hour: number | string | null;
  order_count: number | string | null;
  revenue: number | string | null;
};

type SellerReportRpc = {
  seller_id: string;
  seller_name: string;
  order_count: number | string | null;
  revenue: number | string | null;
  avg_ticket: number | string | null;
  cancelled: number | string | null;
};

const periods = [
  { label: "Hoje", days: 0 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

const ReportsPage = () => {
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
    const since = getSince(periods[period].days);

    const [summaryRes, productsRes, hourlyRes, sellerRes] = await Promise.all([
      supabase.rpc("get_sales_summary", { _store_id: storeId, _since: since }),
      supabase.rpc("get_top_products", { _store_id: storeId, _since: since, _limit: 10 }),
      supabase.rpc("get_hourly_sales", { _store_id: storeId, _since: since }),
      supabase.rpc("get_seller_report", { _store_id: storeId, _since: since }),
    ]);

    if (summaryRes.data && Array.isArray(summaryRes.data) && summaryRes.data.length > 0) {
      const s = summaryRes.data[0] as SalesSummaryRpc;
      setSummary({
        total_orders: Number(s.total_orders) || 0,
        total_revenue: Number(s.total_revenue) || 0,
        avg_ticket: Number(s.avg_ticket) || 0,
        total_cancelled: Number(s.total_cancelled) || 0,
      });
    }

    if (productsRes.data) {
      setTopProducts(
        (productsRes.data as TopProductsRpc[]).map((p) => ({
          product_id: p.product_id,
          product_name: p.product_name,
          total_qty: Number(p.total_qty),
          total_revenue: Number(p.total_revenue),
        }))
      );
    }

    if (hourlyRes.data) {
      setHourlyData(
        (hourlyRes.data as HourlySalesRpc[]).map((h) => ({
          hour: Number(h.hour),
          order_count: Number(h.order_count),
          revenue: Number(h.revenue),
        }))
      );
    }

    if (sellerRes.data) {
      setSellerData((sellerRes.data as SellerReportRpc[]).map((r) => ({
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

  // Fill missing hours for chart
  const fullHourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = hourlyData.find((h) => h.hour === i);
    return { hour: `${String(i).padStart(2, "0")}h`, pedidos: found?.order_count || 0, receita: found?.revenue || 0 };
  });

  const rankedTopProducts = topProducts.map((row, index) => ({ ...row, rank: index + 1 }));

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Relatórios</h2>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma loja vinculada.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-3xl border border-white/10 bg-[#050505] p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-5">
      <PremiumPageHeader
        title="Relatórios"
        subtitle="BI visual do desempenho do restaurante"
        actions={
          <>
            <PremiumActionButton tone="secondary">Exportar PDF</PremiumActionButton>
            <PremiumActionButton tone="secondary">Exportar CSV</PremiumActionButton>
          </>
        }
      />

      <div className="flex gap-1">
        {periods.map((p, i) => (
          <PremiumActionButton
            key={p.label}
            tone={period === i ? "primary" : "secondary"}
            onClick={() => setPeriod(i)}
            className="h-9 px-3 text-xs"
          >
            {p.label}
          </PremiumActionButton>
        ))}
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PremiumMetricCard title="Receita" value={`€ ${summary.total_revenue.toFixed(2)}`} subtitle="período atual" icon={DollarSign} color="green" />
        <PremiumMetricCard title="Pedidos" value={summary.total_orders} subtitle="total registado" icon={ShoppingBag} color="brand" />
        <PremiumMetricCard title="Ticket médio" value={`€ ${summary.avg_ticket.toFixed(2)}`} subtitle="por pedido" icon={TrendingUp} color="blue" />
        <PremiumMetricCard title="Cancelados" value={summary.total_cancelled} subtitle="requer análise" icon={XCircle} color="red" />
      </section>

      <PremiumChartCard title="Receita por hora" subtitle="Fluxo de pedidos ao longo do dia">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fullHourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#A1A1AA" }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fill: "#A1A1AA" }} />
              <Tooltip />
              <Bar dataKey="pedidos" fill="#D62300" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PremiumChartCard>

      <PremiumTable
        title="Top produtos"
        subtitle="Ranking por quantidade e receita"
        rows={rankedTopProducts}
        columns={[
          { key: "rank", label: "#", render: (row) => row.rank },
          { key: "name", label: "Produto", render: (row) => <span className="font-medium">{row.product_name}</span> },
          { key: "qty", label: "Qtd", render: (row) => <span className="font-semibold">{row.total_qty}</span> },
          { key: "revenue", label: "Receita", render: (row) => `€ ${row.total_revenue.toFixed(2)}` },
        ]}
        empty={
          <PremiumEmptyState
            icon={BarChart3}
            title="Sem dados no período"
            description="Não há produtos vendidos para o filtro selecionado."
          />
        }
      />

      <PremiumTable
        title="Desempenho por vendedor"
        subtitle="Pedidos, faturação e cancelamentos"
        rows={sellerData}
        columns={[
          { key: "seller", label: "Vendedor", render: (row) => row.seller_name },
          { key: "orders", label: "Pedidos", render: (row) => row.order_count },
          { key: "revenue", label: "Faturação", render: (row) => `€ ${row.revenue.toFixed(2)}` },
          { key: "avg", label: "Ticket médio", render: (row) => `€ ${row.avg_ticket.toFixed(2)}` },
          { key: "cancel", label: "Cancelados", render: (row) => row.cancelled },
        ]}
        empty={
          <PremiumEmptyState
            icon={Clock}
            title="Sem vendas por vendedor"
            description="Ainda não existem dados para este período."
          />
        }
      />
    </div>
  );
};

export default ReportsPage;
