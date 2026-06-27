import { useSellerContext } from "@/hooks/useSellerContext";
import { useQuery } from "@tanstack/react-query";
import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Table as TableIcon, ListOrdered, Loader2, CheckCircle2 } from "lucide-react";
import { fmtMoney } from "@/hooks/useTenantBilling";
import { nav } from "@/lib/navPaths.ts";
import { subDays } from "date-fns";

const SellerHome = () => {
  const { userId, fullName, storeId, loading } = useSellerContext();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["seller-today", userId, storeId],
    enabled: !!userId && !!storeId,
    queryFn: async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const { data } = await supabase
        .from("orders")
        .select("id, total, table_session_id, status")
        .eq("store_id", storeId!)
        .eq("seller_id", userId!)
        .gte("created_at", today.toISOString())
        .neq("status", "cancelled");
      const tables = new Set((data ?? []).map((o: any) => o.table_session_id).filter(Boolean));
      return {
        count: data?.length ?? 0,
        revenue: (data ?? []).reduce((s: number, o: any) => s + Number(o.total || 0), 0),
        tables: tables.size,
      };
    },
  });

  const { data: monthStats } = useQuery({
    queryKey: ["seller-month", userId, storeId],
    enabled: !!userId && !!storeId,
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase.rpc("get_seller_report", {
        _store_id: storeId!,
        _since: since,
      });
      if (error) throw error;
      const row = (data ?? []).find((r: { seller_id: string }) => r.seller_id === userId);
      return row as { order_count: number; revenue: number; avg_ticket: number } | undefined;
    },
  });

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">Bem-vindo,</p>
        <h1 className="text-xl font-black truncate">{fullName || "Vendedor"}</h1>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Pedidos hoje</p>
          <p className="text-xl font-black">{stats?.count ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Faturado</p>
          <p className="text-xl font-black text-cta">{fmtMoney(stats?.revenue ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Mesas</p>
          <p className="text-xl font-black">{stats?.tables ?? 0}</p>
        </CardContent></Card>
      </div>

      {monthStats ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Últimos 30 dias</p>
            <p className="font-bold">
              {monthStats.order_count} pedidos · {fmtMoney(Number(monthStats.revenue || 0))} · ticket médio {fmtMoney(Number(monthStats.avg_ticket || 0))}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        <Button size="lg" className="w-full h-14 text-base font-bold" onClick={() => navigate(nav.seller("new"))}>
          <Plus className="w-5 h-5 mr-2" /> Novo pedido
        </Button>
        <Button size="lg" variant="outline" className="w-full h-14 text-base font-bold" onClick={() => navigate(nav.seller("tables"))}>
          <TableIcon className="w-5 h-5 mr-2" /> Mesas abertas
        </Button>
        <Button size="lg" variant="outline" className="w-full h-14 text-base font-bold" onClick={() => navigate(nav.seller("my-orders"))}>
          <ListOrdered className="w-5 h-5 mr-2" /> Meus pedidos
        </Button>
      </div>

      <Card className="border-emerald-500/25 bg-emerald-500/5">
        <CardContent className="p-3 space-y-2 text-xs text-muted-foreground">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Como usar
          </p>
          <ul className="space-y-1.5 list-disc pl-4">
            <li><b>Novo pedido</b> — leia o QR da mesa (ou escolha balcão); o pedido vai para a cozinha e imprime automaticamente.</li>
            <li><b>Mesas abertas</b> — feche cada cliente ou a mesa inteira (pagamento único ou dividido).</li>
            <li><b>Meus pedidos</b> — cobre com Tap to Pay, dinheiro ou consulte o histórico.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerHome;
