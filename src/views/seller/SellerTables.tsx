import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSellerContext } from "@/hooks/useSellerContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";
import { fmtMoney } from "@/hooks/useTenantBilling";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { nav } from "@/lib/navPaths.ts";

const SellerTables = () => {
  const { storeId } = useSellerContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newTable, setNewTable] = useState("");
  const [opening, setOpening] = useState(false);

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

  const openTable = async () => {
    const num = newTable.replace(/\D/g, "").trim();
    if (!num || !storeId) return;
    setOpening(true);
    try {
      const { data, error } = await supabase.rpc("open_or_get_table_session", {
        _store_id: storeId,
        _table_number: num,
      });
      if (error) throw error;
      const sessionId = data as string;
      setNewTable("");
      await qc.invalidateQueries({ queryKey: ["open-tables", storeId] });
      navigate(nav.seller("tables", sessionId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir a mesa");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-black">Mesas abertas</h1>

      <Card>
        <CardContent className="p-3 flex gap-2">
          <Input
            value={newTable}
            onChange={(e) => setNewTable(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="Nº da mesa"
            className="h-10"
          />
          <Button className="h-10 shrink-0 font-bold" disabled={opening || !newTable.trim()} onClick={() => void openTable()}>
            {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Abrir
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : sessions?.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma mesa aberta no momento.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {sessions?.map((s: any) => (
            <Card key={s.id} onClick={() => navigate(nav.seller("tables", s.id))} className="cursor-pointer active:scale-[0.99] transition">
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
