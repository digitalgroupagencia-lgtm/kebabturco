import { useEffect, useMemo, useState } from "react";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LayoutGrid, X, CreditCard, Receipt, Unlock } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { closeTableByNumber, closeTableSessionUnified, listStoreOpenTableSessions, markTableSessionPaid, type OpenTableSessionRow } from "@/services/tableSessionService";
import { toast } from "sonner";
import { useDemoMode } from "@/lib/demoMode";
import { DEMO_PANEL_TABLES, DEMO_PANEL_TABLE_STATES } from "@/lib/demoData";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

type TableRow = { id: string; number: string; capacity: number; is_active: boolean };
type SessionRow = {
  id: string;
  table_number: string;
  status: string;
  total_amount: number;
  opened_at: string;
};
type OrderRow = {
  id: string;
  order_number: string;
  table_number: string | null;
  table_session_id: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total: number;
  created_at: string;
  customer_name: string | null;
};

type TableVisualState =
  | "free"
  | "pending"
  | "preparing"
  | "open_account"
  | "payment_pending"
  | "waiting_order";

const stateStyles: Record<TableVisualState, string> = {
  free: "bg-green-500/15 border-green-500 text-green-700 dark:text-green-400",
  pending: "bg-red-500/20 border-red-500 text-red-700 dark:text-red-400 animate-pulse",
  preparing: "bg-yellow-500/20 border-yellow-500 text-yellow-800 dark:text-yellow-300",
  open_account: "bg-blue-500/15 border-blue-500 text-blue-800 dark:text-blue-300",
  payment_pending: "bg-orange-500/20 border-orange-500 text-orange-800 dark:text-orange-300",
  waiting_order: "bg-violet-500/15 border-violet-500 text-violet-800 dark:text-violet-300",
};

const stateLabels: Record<TableVisualState, string> = {
  free: "Livre",
  pending: "Novo pedido",
  preparing: "Em preparação",
  open_account: "Conta aberta",
  payment_pending: "Falta pagamento",
  waiting_order: "Cliente no QR",
};

function resolveTableState(
  tableNumber: string,
  orders: OrderRow[],
  session: SessionRow | undefined,
  openMeta?: OpenTableSessionRow,
): TableVisualState {
  const tableOrders = orders.filter((o) => o.table_number === tableNumber);
  if (tableOrders.some((o) => o.status === "pending")) return "pending";
  if (tableOrders.some((o) => o.status === "preparing" || o.status === "ready")) return "preparing";
  if (session || openMeta) {
    if (openMeta && openMeta.order_count === 0) return "waiting_order";
    const sessionId = session?.id || openMeta?.session_id;
    const sessionOrders = tableOrders.filter(
      (o) => !sessionId || o.table_session_id === sessionId || !o.table_session_id,
    );
    if (sessionOrders.some((o) => o.payment_status === "pending" && o.status !== "cancelled")) {
      return "payment_pending";
    }
    return "open_account";
  }
  return "free";
}

const TableMapPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const demoOn = useDemoMode();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [openSessionRows, setOpenSessionRows] = useState<OpenTableSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [tablesRes, ordersRes, sessionsRes, openSessionsRpc] = await Promise.all([
      supabase.from("tables").select("id, number, capacity, is_active").eq("store_id", storeId).eq("is_active", true).order("number"),
      supabase
        .from("orders")
        .select("id, order_number, table_number, table_session_id, status, payment_status, total, created_at, customer_name")
        .eq("store_id", storeId)
        .gte("created_at", today.toISOString())
        .not("status", "eq", "cancelled"),
      supabase
        .from("table_sessions")
        .select("id, table_number, status, total_amount, opened_at")
        .eq("store_id", storeId)
        .eq("status", "open"),
      listStoreOpenTableSessions(storeId).catch(() => [] as OpenTableSessionRow[]),
    ]);

    setTables(tablesRes.data || []);
    setOrders(ordersRes.data || []);
    setSessions(sessionsRes.data || []);
    setOpenSessionRows(openSessionsRpc);
    setLoading(false);
  };

  useEffect(() => {
    if (!storeId) return;
    load();
    const ch = supabase
      .channel("table-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_sessions", filter: `store_id=eq.${storeId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [storeId]);

  const sessionByTable = useMemo(() => {
    const map = new Map<string, SessionRow>();
    for (const s of sessions) map.set(s.table_number, s);
    return map;
  }, [sessions]);

  const openMetaByTable = useMemo(() => {
    const map = new Map<string, OpenTableSessionRow>();
    for (const row of openSessionRows) map.set(row.table_number, row);
    return map;
  }, [openSessionRows]);

  const openAccounts = useMemo(() => {
    const seen = new Set<string>();
    const rows: OpenTableSessionRow[] = [];
    for (const row of openSessionRows) {
      if (!seen.has(row.table_number)) {
        seen.add(row.table_number);
        rows.push(row);
      }
    }
    for (const s of sessions) {
      if (!seen.has(s.table_number)) {
        seen.add(s.table_number);
        rows.push({
          session_id: s.id,
          table_number: s.table_number,
          table_id: null,
          opened_at: s.opened_at,
          total_amount: Number(s.total_amount || 0),
          order_count: orders.filter((o) => o.table_session_id === s.id).length,
          pending_payment_count: orders.filter(
            (o) => o.table_session_id === s.id && o.payment_status === "pending" && o.status !== "cancelled",
          ).length,
          active_kitchen_count: orders.filter(
            (o) =>
              o.table_session_id === s.id &&
              o.status !== "delivered" &&
              o.status !== "cancelled",
          ).length,
          pending_payment_total: orders
            .filter((o) => o.table_session_id === s.id && o.payment_status === "pending" && o.status !== "cancelled")
            .reduce((sum, o) => sum + Number(o.total || 0), 0),
        });
      }
    }
    return rows.sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
  }, [openSessionRows, sessions, orders]);

  const selectedSession = selected ? sessionByTable.get(selected) : undefined;

  const selectedOrders = useMemo(() => {
    if (!selected) return [];
    const sessionId = selectedSession?.id;
    return orders
      .filter((o) => o.table_number === selected)
      .filter((o) => {
        if (!sessionId) return o.status !== "delivered";
        return o.table_session_id === sessionId || (!o.table_session_id && o.status !== "delivered");
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, selected, selectedSession]);

  const accountOrders = useMemo(() => {
    if (!selected || !selectedSession) return [];
    return orders
      .filter((o) => o.table_number === selected && o.table_session_id === selectedSession.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [orders, selected, selectedSession]);

  const accountTotal = useMemo(
    () => accountOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    [accountOrders],
  );

  const pendingPaymentTotal = useMemo(
    () =>
      accountOrders
        .filter((o) => o.payment_status === "pending" && o.status !== "cancelled")
        .reduce((sum, o) => sum + Number(o.total || 0), 0),
    [accountOrders],
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

  const handleMarkPaid = async () => {
    if (!selectedSession) return;
    setActionLoading(true);
    try {
      await markTableSessionPaid(selectedSession.id, "cash");
      toast.success("Pagamento registado");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao marcar pagamento");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseSession = async (sessionId: string, tableNumber: string) => {
    if (!storeId) return;
    setActionLoading(true);
    try {
      await closeTableSessionUnified(sessionId, "cash");
      toast.success(`Mesa ${tableNumber} fechada — cliente desvinculado`);
      if (selected === tableNumber) setSelected(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao fechar conta");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseAccount = async () => {
    if (!storeId || !selected) return;
    setActionLoading(true);
    try {
      if (selectedSession) {
        await closeTableSessionUnified(selectedSession.id, "cash");
      } else {
        await closeTableByNumber(storeId, selected, "cash");
      }
      toast.success("Conta fechada — mesa libertada");
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao fechar conta");
    } finally {
      setActionLoading(false);
    }
  };

  if (storeLoading || loading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> A carregar mapa...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PremiumPageHeader
        icon={LayoutGrid}
        title="Mapa de mesas"
        subtitle="Conta aberta até confirmar pagamento. Entregar pedido não fecha a mesa."
      />

      <div className="flex flex-wrap gap-3 text-xs">
        {(["free", "waiting_order", "pending", "preparing", "open_account", "payment_pending"] as TableVisualState[]).map((k) => (
          <span key={k} className={`px-2 py-1 rounded-full border ${stateStyles[k]}`}>
            {stateLabels[k]}
          </span>
        ))}
      </div>

      {openAccounts.length > 0 && (
        <Card className="p-4 border-primary/40 bg-primary/5 space-y-3">
          <div>
            <h2 className="text-lg font-black text-primary">Contas abertas agora ({openAccounts.length})</h2>
            <p className="text-sm text-muted-foreground">
              Mesas com cliente ligado ou conta em aberto. Feche aqui para libertar o telemóvel do cliente.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {openAccounts.map((row) => (
              <div key={row.session_id} className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xl font-black">Mesa {row.table_number}</p>
                    <p className="text-xs text-muted-foreground">
                      Aberta às {new Date(row.opened_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {row.order_count === 0
                      ? "Cliente no QR"
                      : row.pending_payment_count > 0
                        ? "Falta pagamento"
                        : "Conta aberta"}
                  </Badge>
                </div>
                <p className="text-sm">
                  {row.order_count === 0
                    ? "Cliente ligado — ainda sem pedido"
                    : `${row.order_count} pedido(s) · €${Number(row.total_amount || 0).toFixed(2)}`}
                  {row.pending_payment_total > 0 && (
                    <span className="text-orange-600 dark:text-orange-400 font-semibold block">
                      Falta pagar €{Number(row.pending_payment_total).toFixed(2)}
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 font-bold"
                    onClick={() => setSelected(row.table_number)}
                  >
                    Ver conta
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 font-bold"
                    disabled={actionLoading}
                    onClick={() => handleCloseSession(row.session_id, row.table_number)}
                  >
                    Fechar conta
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {tables.map((t) => {
          const session = sessionByTable.get(t.number);
          const openMeta = openMetaByTable.get(t.number);
          const state = resolveTableState(t.number, orders, session, openMeta);
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
              {session && (
                <p className="text-[10px] font-semibold mt-1 opacity-80">
                  €{Number(session.total_amount || 0).toFixed(2)}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {tables.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Registe mesas em Gestão de mesas primeiro.</Card>
      )}

      {selected && (
        <Card className="p-4 space-y-4 border-primary/30">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-primary">Mesa {selected}</h2>
              {selectedSession ? (
                <p className="text-sm text-muted-foreground">
                  Conta aberta · €{accountTotal.toFixed(2)}
                  {selectedOrders.length === 0 && accountOrders.length === 0 && (
                    <span className="text-violet-600 dark:text-violet-400 font-semibold ml-2">
                      · Cliente ligado ao QR (sem pedido ainda)
                    </span>
                  )}
                  {pendingPaymentTotal > 0 && (
                    <span className="text-orange-600 dark:text-orange-400 font-semibold ml-2">
                      · Falta pagar €{pendingPaymentTotal.toFixed(2)}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Sem conta aberta</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {selectedSession && accountOrders.length > 0 && (
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Receipt className="h-3.5 w-3.5" /> Conta da mesa
              </p>
              {accountOrders.map((o) => (
                <div key={o.id} className="flex justify-between text-sm">
                  <span>
                    #{o.order_number} · {o.status}
                    {o.payment_status === "pending" && (
                      <Badge variant="outline" className="ml-2 text-orange-600 border-orange-400">
                        Falta pagamento
                      </Badge>
                    )}
                  </span>
                  <span className="font-semibold">€{Number(o.total).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-black pt-1 border-t">
                <span>Total</span>
                <span>€{accountTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {selectedSession && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-11 font-bold"
                disabled={actionLoading || pendingPaymentTotal <= 0}
                onClick={handleMarkPaid}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pagamento recebido
              </Button>
              <Button
                variant="default"
                className="h-11 font-bold"
                disabled={actionLoading}
                onClick={handleCloseAccount}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Fechar conta / Libertar mesa
              </Button>
            </div>
          )}

          {!selectedSession && openMetaByTable.has(selected) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="default"
                className="h-11 font-bold"
                disabled={actionLoading}
                onClick={() => {
                  const row = openMetaByTable.get(selected);
                  if (row) void handleCloseSession(row.session_id, row.table_number);
                }}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Fechar conta / Libertar mesa
              </Button>
            </div>
          )}

          {!selectedSession && !openMetaByTable.has(selected) && (
            <Button
              variant="outline"
              className="w-full h-11 font-bold"
              disabled={actionLoading}
              onClick={handleCloseAccount}
            >
              <Unlock className="h-4 w-4 mr-2" />
              Libertar mesa (sem conta)
            </Button>
          )}

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pedidos activos</p>
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
                    <p className="text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleTimeString()} · €{Number(o.total).toFixed(2)}
                    </p>
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
          </div>
        </Card>
      )}
    </div>
  );
};

export default TableMapPage;
