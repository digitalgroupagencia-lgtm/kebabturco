import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cancelOrderWithRefund } from "@/services/orderRefund";

type Row = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  order_type: string | null;
  customer_name: string | null;
  total: number;
  created_at: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
};

const STATUSES_OPEN = ["pending", "preparing", "ready", "out_for_delivery"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const OldPendingOrdersDialog = ({ open, onOpenChange, storeId }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, payment_status, payment_method, order_type, customer_name, total, created_at")
      .eq("store_id", storeId)
      .in("status", STATUSES_OPEN)
      .lt("created_at", today.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) setRows(data as Row[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleCancel = async (row: Row) => {
    if (!confirm(`Cancelar pedido #${row.order_number}? Esta acção não pode ser desfeita.`)) return;
    setCancellingId(row.id);
    try {
      const res = await cancelOrderWithRefund(storeId, row.id, "Pedido antigo cancelado pelo restaurante");
      if (res.success) {
        toast.success(`Pedido #${row.order_number} cancelado`);
        setRows((prev) => prev.filter((r) => r.id !== row.id));
      } else {
        toast.error(res.error || "Não foi possível cancelar o pedido");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Pedidos pendentes antigos
          </DialogTitle>
          <DialogDescription>
            Pedidos abertos de dias anteriores que ficaram por resolver. Cancele para limpar a operação.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            Nenhum pedido antigo pendente. 
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border bg-card p-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">#{r.order_number}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {r.status}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {r.payment_status === "paid" ? "pago" : "por pagar"}
                    </span>
                    {r.order_type && (
                      <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {r.order_type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(r.created_at)} · {Number(r.total).toFixed(2)}€
                    {r.customer_name ? ` · ${r.customer_name}` : ""}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleCancel(r)}
                  disabled={cancellingId === r.id}
                  className="shrink-0"
                >
                  {cancellingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancelar"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OldPendingOrdersDialog;
