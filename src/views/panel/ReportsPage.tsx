import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, ShoppingBag, DollarSign, XCircle, Clock, Trophy, UserCircle2 } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import PremiumMetricCard from "@/components/admin/premium/PremiumMetricCard";
import PremiumChartCard from "@/components/admin/premium/PremiumChartCard";
import PremiumSection from "@/components/admin/premium/PremiumSection";
import PremiumTable from "@/components/admin/premium/PremiumTable";

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

  // Fill missing hours for chart
  const fullHourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = hourlyData.find((h) => h.hour === i);
    return { hour: `${String(i).padStart(2, "0")}h`, pedidos: found?.order_count || 0, receita: found?.revenue || 0 };
  });

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Relatórios</h2>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma loja vinculada.</CardContent></Card>
      </div>
    );
  }

  const periodActions = (
    <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
      {periods.map((p, i) => (
        <Button
          key={p.label}
          size="sm"
          variant={period === i ? "default" : "ghost"}
          onClick={() => setPeriod(i)}
          className="h-8 px-3"
        >
          {p.label}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <HowToUsePanel
        purpose="Visão de vendas, top produtos, horários de pico e desempenho por vendedor."
        whenToUse="Diariamente para acompanhar caixa. Semanalmente para decidir cardápio e turnos."
        steps={[
          "Escolha o período no topo (Hoje, 7, 30 ou 90 dias).",
          "Veja o ticket médio (faturação ÷ pedidos).",
          "No gráfico horário, identifique o pico para reforçar a equipa.",
          "Em 'Top produtos', priorize os 3 primeiros nas promoções.",
        ]}
        howToConfirm="Os totais batem com o caixa fechado em /panel/cashier."
        assistantQuestion="Como interpreto o ticket médio e que ações concretas tomo se ele cair?"
      />

      <PremiumPageHeader
        icon={BarChart3}
        title="Relatórios"
        subtitle={`Período: ${periods[period].label.toLowerCase()}`}
        actions={periodActions}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PremiumMetricCard
          icon={ShoppingBag}
          label="Pedidos"
          value={summary.total_orders}
          tone="primary"
        />
        <PremiumMetricCard
          icon={DollarSign}
          label="Faturação"
          value={`€ ${summary.total_revenue.toFixed(2)}`}
          tone="success"
        />
        <PremiumMetricCard
          icon={TrendingUp}
          label="Ticket médio"
          value={`€ ${summary.avg_ticket.toFixed(2)}`}
          tone="neutral"
        />
        <PremiumMetricCard
          icon={XCircle}
          label="Cancelados"
          value={summary.total_cancelled}
          tone="danger"
        />
      </div>

      <PremiumChartCard
        title="Pedidos por hora"
        subtitle="Identifique horários de pico para escalar a equipa"
      >
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

      <PremiumSection
        icon={Trophy}
        title="Produtos mais vendidos"
        description="Top 10 produtos por receita"
      >
        <PremiumTable
          rows={topProducts}
          rowKey={(p) => p.product_id}
          emptyMessage="Nenhum dado para o período selecionado."
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
              header: "Produto",
              render: (p) => <span className="font-medium">{p.product_name}</span>,
            },
            {
              key: "qty",
              header: "Qtd",
              align: "right",
              render: (p) => p.total_qty,
            },
            {
              key: "rev",
              header: "Receita",
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

      <PremiumSection
        icon={UserCircle2}
        title="Desempenho por vendedor"
        description="Faturação, ticket médio e cancelamentos"
      >
        <PremiumTable
          rows={sellerData}
          rowKey={(s) => s.seller_id}
          emptyMessage="Nenhuma venda por vendedor no período."
          columns={[
            {
              key: "name",
              header: "Vendedor",
              render: (s) => <span className="font-medium">{s.seller_name}</span>,
            },
            { key: "orders", header: "Pedidos", align: "right", render: (s) => s.order_count },
            {
              key: "rev",
              header: "Faturação",
              align: "right",
              render: (s) => <span className="font-semibold">€ {s.revenue.toFixed(2)}</span>,
            },
            {
              key: "avg",
              header: "Ticket médio",
              align: "right",
              render: (s) => `€ ${s.avg_ticket.toFixed(2)}`,
            },
            {
              key: "canc",
              header: "Cancelados",
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
