import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSellerContext } from "@/hooks/useSellerContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { fmtMoney } from "@/hooks/useTenantBilling";
import { format } from "date-fns";

const SellerMyOrders = () => {
  const { userId, storeId } = useSellerContext();
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", userId, storeId],
    enabled: !!userId && !!storeId,
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 7);
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, table_number, customer_name")
        .eq("store_id", storeId!)
        .eq("seller_id", userId!)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-black">Meus pedidos</h1>
      {isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : data?.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhum pedido nos últimos 7 dias.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data?.map((o: any) => (
            <Card key={o.id}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold truncate">#{o.order_number} {o.customer_name ? `· ${o.customer_name}` : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.table_number ? `Mesa ${o.table_number} · ` : ""}{format(new Date(o.created_at), "dd/MM HH:mm")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black">{fmtMoney(Number(o.total || 0))}</p>
                  <Badge variant="secondary" className="text-[10px]">{o.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerMyOrders;
