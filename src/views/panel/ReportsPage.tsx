import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, ShoppingBag, DollarSign, XCircle, Clock } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

  return (
    <div className="space-y-6">
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" /> Relatórios
        </h2>
        <div className="flex gap-1">
          {periods.map((p, i) => (
            <Button
              key={p.label}
              size="sm"
              variant={period === i ? "default" : "outline"}
              onClick={() => setPeriod(i)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <ShoppingBag className="h-4 w-4" /> Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.total_orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-4 w-4" /> Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">€ {summary.total_revenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">€ {summary.avg_ticket.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <XCircle className="h-4 w-4" /> Cancelados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{summary.total_cancelled}</p>
          </CardContent>
        </Card>
      </div>

      {/* Hourly chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" /> Pedidos por Hora
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fullHourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="pedidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🏆 Produtos Mais Vendidos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((p, i) => (
                <TableRow key={p.product_id}>
                  <TableCell>
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{p.product_name}</TableCell>
                  <TableCell className="text-right">{p.total_qty}</TableCell>
                  <TableCell className="text-right font-semibold">€ {p.total_revenue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {topProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum dado para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vendedores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">👤 Desempenho por Vendedor</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Cancelados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellerData.map((s) => (
                <TableRow key={s.seller_id}>
                  <TableCell className="font-medium">{s.seller_name}</TableCell>
                  <TableCell className="text-right">{s.order_count}</TableCell>
                  <TableCell className="text-right font-semibold">€ {s.revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-right">€ {s.avg_ticket.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-destructive">{s.cancelled}</TableCell>
                </TableRow>
              ))}
              {sellerData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma venda por vendedor no período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
