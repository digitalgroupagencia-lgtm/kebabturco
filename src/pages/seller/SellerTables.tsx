import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSellerContext } from "@/hooks/useSellerContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { fmtMoney } from "@/hooks/useTenantBilling";
import { format } from "date-fns";

const SellerTables = () => {
  const { storeId } = useSellerContext();
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["open-tables", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("table_sessions")
        .select("id, table_number, opened_at, total_amount, status")
        .eq("store_id", storeId!)
        .eq("status", "open")
        .order("opened_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-black">Mesas abertas</h1>
      {isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : sessions?.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma mesa aberta no momento.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {sessions?.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-black text-lg">Mesa {s.table_number}</p>
                  <p className="text-xs text-muted-foreground">Aberta às {format(new Date(s.opened_at), "HH:mm")}</p>
                </div>
                <p className="font-black text-cta">{fmtMoney(Number(s.total_amount || 0))}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerTables;
