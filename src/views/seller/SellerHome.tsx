import { useSellerContext } from "@/hooks/useSellerContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Table as TableIcon, ListOrdered, Loader2 } from "lucide-react";
import { fmtMoney } from "@/hooks/useTenantBilling";
import { nav } from "@/lib/navPaths.ts";

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

      <Card className="bg-muted/40 border-dashed">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <b>Em breve:</b> fluxo completo de pedido com mesa+cliente, fechamento individual e fechamento total da mesa (pagamento único ou dividido), impressão automática e relatórios por vendedor.
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerHome;
