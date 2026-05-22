import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LayoutGrid, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

type TableRow = { id: string; number: string; capacity: number; is_active: boolean };
type OrderRow = {
  id: string;
  order_number: string;
  table_number: string | null;
  status: OrderStatus;
  total: number;
  created_at: string;
  customer_name: string | null;
};

type TableVisualState = "free" | "pending" | "preparing" | "occupied";

const stateStyles: Record<TableVisualState, string> = {
  free: "bg-green-500/15 border-green-500 text-green-700 dark:text-green-400",
  pending: "bg-red-500/20 border-red-500 text-red-700 dark:text-red-400 animate-pulse",
  preparing: "bg-yellow-500/20 border-yellow-500 text-yellow-800 dark:text-yellow-300",
  occupied: "bg-muted border-muted-foreground/30 text-muted-foreground",
};

const stateLabels: Record<TableVisualState, string> = {
  free: "Livre",
  pending: "Novo pedido",
  preparing: "Em preparação",
  occupied: "Ocupada",
};

function resolveTableState(tableNumber: string, orders: OrderRow[], openSessions: Set<string>): TableVisualState {
  const tableOrders = orders.filter((o) => o.table_number === tableNumber);
  if (tableOrders.some((o) => o.status === "pending")) return "pending";
  if (tableOrders.some((o) => o.status === "preparing" || o.status === "ready")) return "preparing";
  if (openSessions.has(tableNumber)) return "occupied";
  return "free";
}

const TableMapPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [openSessions, setOpenSessions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [tablesRes, ordersRes, sessionsRes] = await Promise.all([
      supabase.from("tables").select("id, number, capacity, is_active").eq("store_id", storeId).eq("is_active", true).order("number"),
      supabase.from("orders").select("id, order_number, table_number, status, total, created_at, customer_name")
        .eq("store_id", storeId).gte("created_at", today.toISOString())
        .not("status", "in", "(delivered,cancelled)"),
      supabase.from("table_sessions").select("table_number").eq("store_id", storeId).eq("status", "open"),
    ]);

    setTables(tablesRes.data || []);
    setOrders(ordersRes.data || []);
    setOpenSessions(new Set((sessionsRes.data || []).map((s) => s.table_number)));
    setLoading(false);
  };

  useEffect(() => {
    if (!storeId) return;
    load();
    const ch = supabase.channel("table-map").on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storeId]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => o.table_number === selected),
    [orders, selected],
  );

  const advance = async (orderId: string, next: OrderStatus) => {
    await supabase.from("orders").update({ status: next }).eq("id", orderId);
    load();
  };

  const nextStatus = (s: OrderStatus): OrderStatus | null => {
    if (s === "pending") return "preparing";
    if (s === "preparing") return "ready";
    if (s === "ready") return "delivered";
    return null;
  };

  const actionLabel = (s: OrderStatus) => {
    if (s === "pending") return "OK / Em preparação";
    if (s === "preparing") return "Pronto para servir";
    if (s === "ready") return "Entregue na mesa";
    return "";
  };

  if (storeLoading || loading) {
    return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> A carregar mapa...</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><LayoutGrid className="h-6 w-6 text-primary" /> Mapa de mesas</h1>
        <p className="text-sm text-muted-foreground mt-1">Estado em tempo real de cada mesa. Clique para ver pedidos activos.</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {(["free", "pending", "preparing", "occupied"] as TableVisualState[]).map((k) => (
          <span key={k} className={`px-2 py-1 rounded-full border ${stateStyles[k]}`}>{stateLabels[k]}</span>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {tables.map((t) => {
          const state = resolveTableState(t.number, orders, openSessions);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.number)}
              className={`rounded-2xl border-2 p-4 text-left transition-transform active:scale-[0.98] min-h-[100px] ${stateStyles[state]} ${selected === t.number ? "ring-2 ring-primary" : ""}`}
            >
              <p className="text-2xl font-black">Mesa {t.number}</p>
              <p className="text-xs font-bold mt-1">{stateLabels[state]}</p>
              <p className="text-[10px] opacity-70 mt-1">{t.capacity} lugares</p>
            </button>
          );
        })}
      </div>

      {tables.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Registe mesas em Gestão de mesas primeiro.</Card>
      )}

      {selected && (
        <Card className="p-4 space-y-3 border-primary/30">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-primary">Mesa {selected}</h2>
            <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><X className="h-4 w-4" /></Button>
          </div>
          {selectedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem pedidos activos nesta mesa.</p>
          ) : (
            selectedOrders.map((o) => {
              const next = nextStatus(o.status);
              return (
                <div key={o.id} className="rounded-xl border p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-lg">#{o.order_number}</span>
                    <Badge variant="outline">{o.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleTimeString()} · €{Number(o.total).toFixed(2)}</p>
                  {o.customer_name && <p className="text-sm font-semibold">{o.customer_name}</p>}
                  {next && (
                    <Button className="w-full h-11 font-black" onClick={() => advance(o.id, next)}>
                      {actionLabel(o.status)}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </Card>
      )}
    </div>
  );
};

export default TableMapPage;
