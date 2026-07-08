import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, Database, Json } from "@/integrations/supabase/types";
import { getStatusLabel } from "@/lib/orderStatusLabels";
import {
  isPanelAlertsEnabled,
  acknowledgePendingOrderAlert,
  playNewOrderAlert,
  registerNewPendingOrderAlert,
  syncPendingOrderAlertLoop,
} from "@/lib/panelAlerts";
import {
  blocksOperationalProgressUntilPaid,
  isAwaitingCounterPaymentConfirmation,
  orderReadyForKitchen,
  shouldShowOrderInRestaurantPanel,
} from "@/lib/orderKitchenRules";
import { markOrderPaidAtCounter, assignDeliveryDriver } from "@/services/orderService";
import { cancelOrderWithRefund } from "@/services/orderRefund";
import { tryPrintPanelOrder, reprintPanelOrder } from "@/features/ops/panelPrintHelper";
import { validateAcceptPrepMinutes } from "@/features/ops/opsOrderUi";
import { explainStaffPinPaymentError } from "@/lib/staffAccessPin";
import { useStaffT } from "@/hooks/useStaffT";
import {
  generateDeliveryConfirmationCode,
  isDeliveryOrder,
} from "@/lib/orderOperationalFlow";

export type PanelOrder = Tables<"orders"> & {
  delivery_street?: string | null;
  delivery_city?: string | null;
  delivery_number?: string | null;
  delivery_confirmation_code?: string | null;
  assigned_driver_id?: string | null;
  delivery_started_at?: string | null;
  kitchen_printed_at?: string | null;
};

type OrderItem = Tables<"order_items">;
export type OrderStatus = Database["public"]["Enums"]["order_status"] | "out_for_delivery";
export type PanelConnectionStatus = "connecting" | "live" | "backup";

function isToday(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

async function fetchItemsForOrders(orderIds: string[]) {
  if (!orderIds.length) return {} as Record<string, OrderItem[]>;
  const { data: items } = await supabase.from("order_items").select("*").in("order_id", orderIds);
  const map: Record<string, OrderItem[]> = {};
  (items || []).forEach((it) => {
    if (!map[it.order_id]) map[it.order_id] = [];
    map[it.order_id].push(it);
  });
  return map;
}

const POLL_LIVE_MS = 30_000;
const POLL_BACKUP_MS = 8_000;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;

export function usePanelOrders(storeId: string | undefined) {
  const { lang } = useStaffT();
  const [orders, setOrders] = useState<PanelOrder[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<PanelConnectionStatus>("live");
  const knownPendingRef = useRef<Set<string>>(new Set());
  const pendingDuringBootstrapRef = useRef<PanelOrder[]>([]);
  const initializedRef = useRef(false);
  const updatingRef = useRef<Set<string>>(new Set());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const endRemoteLiveActivity = useCallback(
    async (orderId: string) => {
      if (!storeId) return;
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            storeId,
            staffOrderCancelledId: orderId,
            liveActivityEndOnly: true,
          },
        });
      } catch {
        /* não bloqueia a operação */
      }
    },
    [storeId],
  );

  const notifyNewPending = useCallback(
    async (row: PanelOrder, items: OrderItem[], withPrint = true) => {
      if (!storeId) return;
      if (!orderReadyForKitchen(row)) return;
      const sound = playNewOrderAlert(row.id);
      toast.info(`Novo pedido #${row.order_number}`, { duration: 5000 });
      if (!sound && !isPanelAlertsEnabled()) {
        toast.message("Toca em «Activar alertas» para ouvir novos pedidos", { duration: 4000 });
      }
      if (withPrint) {
        void tryPrintPanelOrder(storeId, row, items);
      }
    },
    [storeId],
  );

  const fetchOrders = useCallback(async () => {
    if (!storeId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) {
      const rows = (data as PanelOrder[]).filter(shouldShowOrderInRestaurantPanel);

      if (initializedRef.current) {
        for (const o of rows) {
          if (o.status === "pending" && !knownPendingRef.current.has(o.id)) {
            knownPendingRef.current.add(o.id);
            const items = await fetchItemsForOrders([o.id]);
            setItemsByOrder((prev) => ({ ...prev, ...items }));
            void notifyNewPending(o, items[o.id] || [], orderReadyForKitchen(o));
          }
        }
      } else {
        for (const o of rows) {
          if (o.status === "pending") {
            knownPendingRef.current.add(o.id);
            registerNewPendingOrderAlert(o.id);
          }
        }
        initializedRef.current = true;

        const queued = pendingDuringBootstrapRef.current.splice(0);
        for (const row of queued) {
          const items = await fetchItemsForOrders([row.id]);
          setItemsByOrder((prev) => ({ ...prev, ...items }));
          void notifyNewPending(row, items[row.id] || [], orderReadyForKitchen(row));
        }
      }

      setOrders((prev) => {
        if (updatingRef.current.size === 0) return rows;
        const prevById = new Map(prev.map((o) => [o.id, o]));
        return rows.map((row) => (updatingRef.current.has(row.id) ? prevById.get(row.id) ?? row : row));
      });
      const ids = rows.map((o) => o.id);
      setItemsByOrder(ids.length ? await fetchItemsForOrders(ids) : {});

      // Safety net: silence alerts for any tracked pending order that is no
      // longer pending (e.g. accepted from another device, realtime missed).
      const stillPending = new Set(rows.filter((o) => o.status === "pending").map((o) => o.id));
      for (const id of Array.from(knownPendingRef.current)) {
        if (!stillPending.has(id)) {
          knownPendingRef.current.delete(id);
          acknowledgePendingOrderAlert(id);
          void endRemoteLiveActivity(id);
        }
      }
      syncPendingOrderAlertLoop(stillPending.size > 0);
    }
    setLoading(false);
  }, [storeId, notifyNewPending, endRemoteLiveActivity]);


  useEffect(() => {
    if (!storeId) return;

    setLoading(true);
    void fetchOrders();

    let pollId: number | null = null;
    const startPoll = (ms: number) => {
      if (pollId) window.clearInterval(pollId);
      pollId = window.setInterval(() => void fetchOrders(), ms);
    };
    startPoll(POLL_LIVE_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void fetchOrders();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      clearReconnect();
      reconnectAttemptRef.current += 1;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** (reconnectAttemptRef.current - 1), RECONNECT_MAX_MS);
      reconnectTimerRef.current = window.setTimeout(() => {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        subscribe();
      }, delay);
    };

    const subscribe = () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const channel = supabase
        .channel(`panel-orders-${storeId}-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
          async (payload) => {
            const row = payload.new as PanelOrder;
            if (!isToday(row.created_at)) return;
            if (updatingRef.current.has(row.id)) return;
            if (!shouldShowOrderInRestaurantPanel(row)) return;

            setOrders((prev) => {
              if (prev.some((o) => o.id === row.id)) return prev;
              return [row, ...prev];
            });

            const items = await fetchItemsForOrders([row.id]);
            setItemsByOrder((prev) => ({ ...prev, ...items }));

            if (initializedRef.current && row.status === "pending" && !knownPendingRef.current.has(row.id)) {
              knownPendingRef.current.add(row.id);
              void notifyNewPending(row, items[row.id] || [], orderReadyForKitchen(row));
            } else if (
              !initializedRef.current &&
              row.status === "pending" &&
              !knownPendingRef.current.has(row.id)
            ) {
              knownPendingRef.current.add(row.id);
              pendingDuringBootstrapRef.current.push(row);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
          async (payload) => {
            const row = payload.new as PanelOrder;
            const old = payload.old as PanelOrder;
            const visible = shouldShowOrderInRestaurantPanel(row);

            setOrders((prev) => {
              const exists = prev.some((o) => o.id === row.id);
              if (!visible) {
                return exists ? prev.filter((o) => o.id !== row.id) : prev;
              }
              if (exists) return prev.map((o) => (o.id === row.id ? { ...o, ...row } : o));
              return [row, ...prev];
            });

            if (old?.status === "pending" && row.status !== "pending") {
              acknowledgePendingOrderAlert(row.id);
            }

            const becameVisible =
              visible &&
              old?.payment_status !== "paid" &&
              row.payment_status === "paid" &&
              !shouldShowOrderInRestaurantPanel(old);

            if (becameVisible && row.status === "pending") {
              if (!knownPendingRef.current.has(row.id)) {
                knownPendingRef.current.add(row.id);
              }
              const items = itemsByOrder[row.id] || (await fetchItemsForOrders([row.id]))[row.id] || [];
              setItemsByOrder((prev) => ({ ...prev, [row.id]: items }));
              void notifyNewPending(row, items, true);
            }

            if (
              old?.payment_status !== "paid" &&
              row.payment_status === "paid" &&
              orderReadyForKitchen(row) &&
              !row.kitchen_printed_at
            ) {
              void (async () => {
                const items = itemsByOrder[row.id] || (await fetchItemsForOrders([row.id]))[row.id] || [];
                void tryPrintPanelOrder(storeId!, row, items);
              })();
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
          (payload) => {
            const row = payload.old as { id: string };
            setOrders((prev) => prev.filter((o) => o.id !== row.id));
            setItemsByOrder((prev) => {
              const next = { ...prev };
              delete next[row.id];
              return next;
            });
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            reconnectAttemptRef.current = 0;
            setConnectionStatus("live");
            startPoll(POLL_LIVE_MS);
            void fetchOrders();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setConnectionStatus("backup");
            startPoll(POLL_BACKUP_MS);
            void fetchOrders();
            scheduleReconnect();
          }
        });

      channelRef.current = channel;
    };

    subscribe();

    return () => {
      if (pollId) window.clearInterval(pollId);
      clearReconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [storeId, fetchOrders, notifyNewPending]);

  const updateStatus = useCallback(async (order: PanelOrder, newStatus: OrderStatus, prepMinutes?: number): Promise<boolean> => {
    if (updatingRef.current.has(order.id)) return false;

    if (blocksOperationalProgressUntilPaid(order)) {
      toast.error("Balcão só avança depois de confirmar o pagamento.");
      return false;
    }

    const prevStatus = order.status;
    if (
      prevStatus === "pending" &&
      newStatus === "preparing" &&
      !validateAcceptPrepMinutes(prepMinutes)
    ) {
      toast.error("Escolha o tempo estimado antes de aceitar o pedido.");
      return false;
    }

    updatingRef.current.add(order.id);

    const patch: Record<string, unknown> = { status: newStatus as Database["public"]["Enums"]["order_status"] };
    if (newStatus === "preparing" && prepMinutes) {
      const eta = new Date();
      eta.setMinutes(eta.getMinutes() + prepMinutes);
      patch.estimated_ready_at = eta.toISOString();
    }
    // Log who accepted the order (pending -> preparing).
    if (prevStatus === "pending" && newStatus === "preparing") {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (u?.user) {
          patch.accepted_by_user_id = u.user.id;
          patch.accepted_at = new Date().toISOString();
          let name: string | null = (u.user.user_metadata?.full_name as string | undefined) || null;
          if (!name) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", u.user.id)
              .maybeSingle();
            name = (prof?.full_name as string | null) || null;
          }
          patch.accepted_by_name = name || u.user.email || "Operador";
        }
      } catch {
        /* ignore */
      }
    }
    if (newStatus === "ready" && isDeliveryOrder(order) && !order.delivery_confirmation_code) {
      patch.delivery_confirmation_code = generateDeliveryConfirmationCode();
    }


    const optimisticPatch = {
      status: newStatus as PanelOrder["status"],
      estimated_ready_at: (patch.estimated_ready_at as string) ?? order.estimated_ready_at,
      delivery_confirmation_code:
        (patch.delivery_confirmation_code as string) ?? order.delivery_confirmation_code,
    };

    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, ...optimisticPatch } : o)),
    );

    try {
      let updated: PanelOrder | null = null;
      let lastError: { message?: string } | null = null;

      const v2Res = await supabase.rpc("update_order_status_v2", {
        _order_id: order.id,
        _patch: patch as Json,
      });
      if (!v2Res.error && v2Res.data) {
        updated = v2Res.data as unknown as PanelOrder;
      } else {
        lastError = v2Res.error;
        const rpcRes = await supabase.rpc("panel_advance_order_status" as never, {
          _order_id: order.id,
          _new_status: newStatus as Database["public"]["Enums"]["order_status"],
          _estimated_ready_at: (patch.estimated_ready_at as string) ?? undefined,
          _delivery_confirmation_code: (patch.delivery_confirmation_code as string) ?? undefined,
        } as never);
        if (!rpcRes.error && (rpcRes as { data?: unknown }).data) {
          updated = (rpcRes as { data: unknown }).data as PanelOrder;
        } else {
          lastError = rpcRes.error ?? lastError;
          const directRes = await supabase
            .from("orders")
            .update(patch as never)
            .eq("id", order.id)
            .select()
            .single();
          updated = (directRes.data as PanelOrder) ?? null;
          lastError = directRes.error ?? lastError;
        }
      }

      if (!updated) {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: prevStatus } : o)));
        console.error("[panel] update order failed", lastError);
        toast.error(`Erro ao actualizar: ${lastError?.message || "sem resposta"}`);
        return false;
      }

      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...updated } : o)));
      toast.success(`Pedido → ${getStatusLabel(newStatus, order.order_type)}`);
      if (prevStatus === "pending") {
        acknowledgePendingOrderAlert(order.id);
        void endRemoteLiveActivity(order.id);
      }
      // Sincroniza o cartão push do cliente (Live Activity) com o novo estado.
      if (storeId && newStatus !== prevStatus) {
        const customerEventMap: Record<string, string> = {
          preparing: "preparing",
          ready: "ready",
          out_for_delivery: "out_for_delivery",
          delivered: "delivered",
          collected: "collected",
          served: "served",
          cancelled: "cancelled",
        };
        const customerOrderEvent = customerEventMap[newStatus as string];
        if (customerOrderEvent) {
          void supabase.functions
            .invoke("send-push-notification", {
              body: {
                orderId: order.id,
                storeId,
                customerOrderEvent,
                tag: `order-${order.id}-${customerOrderEvent}`,
                url: `/?screen=tracking&order=${order.id}`,
              },
            })
            .catch(() => {
              /* não bloqueia operação */
            });
        }
      }
      return true;
    } finally {
      updatingRef.current.delete(order.id);
    }
  }, [endRemoteLiveActivity]);

  const cancelOrder = useCallback(async (orderId: string, staffPin: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || updatingRef.current.has(orderId)) return;

    updatingRef.current.add(orderId);

    const result = await cancelOrderWithRefund(storeId!, orderId, staffPin);
    updatingRef.current.delete(orderId);

    if (!result.success) {
      toast.error(result.error || "Erro ao cancelar");
      return;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "cancelled",
              payment_status: result.refunded ? "refunded" : o.payment_status,
            }
          : o,
      ),
    );

    if (result.refunded) {
      toast.success(`Pedido #${order.order_number} cancelado, reembolso automático enviado ao cliente`);
    } else if (order.payment_status === "paid") {
      toast.success(`Pedido #${order.order_number} cancelado, reembolso em dinheiro é responsabilidade do restaurante`);
    } else {
      toast.success("Pedido cancelado");
    }

    acknowledgePendingOrderAlert(orderId);
    void endRemoteLiveActivity(orderId);
  }, [orders, storeId, endRemoteLiveActivity]);

  const setPrepMinutes = useCallback(async (order: PanelOrder, minutes: number) => {
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + minutes);
    const iso = eta.toISOString();
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, estimated_ready_at: iso } : o)));
    await supabase.from("orders").update({ estimated_ready_at: iso }).eq("id", order.id);
  }, []);

  const markOrderPaid = useCallback(
    async (order: PanelOrder, method: "cash" | "card" = "cash", staffPin: string) => {
      if (updatingRef.current.has(order.id)) return false;
      updatingRef.current.add(order.id);
      try {
        const result = await markOrderPaidAtCounter(order.id, method, staffPin);
        const staffName =
          (result && typeof result === "object" && "payment_confirmed_by_name" in result
            ? (result as { payment_confirmed_by_name?: string }).payment_confirmed_by_name
            : null) ?? null;
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  payment_status: "paid" as const,
                  payment_method: method,
                  status: o.status === "pending" ? ("preparing" as const) : o.status,
                  payment_confirmed_by_user_id: null,
                  payment_confirmed_by_name: staffName,
                  payment_confirmed_at: new Date().toISOString(),
                }
              : o,
          ),
        );
        const items = itemsByOrder[order.id] || [];
        void tryPrintPanelOrder(storeId!, { ...order, payment_status: "paid" }, items);
        if (order.status === "pending") {
          updatingRef.current.delete(order.id);
          const accepted = await updateStatus(
            { ...order, payment_status: "paid", payment_method: method } as PanelOrder,
            "preparing",
            15,
          );
          toast.success(
            accepted
              ? `Pagamento registado e pedido aceite, #${order.order_number}`
              : `Pagamento registado, #${order.order_number}`,
          );
          return accepted;
        }
        toast.success(`Pagamento registado, #${order.order_number}`);
        return true;
      } catch (e) {
        const raw = e instanceof Error ? e.message : "Erro ao registar pagamento";
        toast.error(explainStaffPinPaymentError(raw, lang));
        return false;
      } finally {
        updatingRef.current.delete(order.id);
      }
    },
    [storeId, itemsByOrder, lang, updateStatus],
  );

  const assignDriver = useCallback(async (order: PanelOrder, driverUserId: string): Promise<boolean> => {
    if (updatingRef.current.has(order.id)) return false;
    updatingRef.current.add(order.id);
    try {
      await assignDeliveryDriver(order.id, driverUserId);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, assigned_driver_id: driverUserId } : o,
        ),
      );
      toast.success("Entregador atribuído");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atribuir entregador");
      return false;
    } finally {
      updatingRef.current.delete(order.id);
    }
  }, []);

  const reprintOrder = useCallback(
    async (order: PanelOrder) => {
      if (!storeId) return false;
      try {
        const items = itemsByOrder[order.id] || (await fetchItemsForOrders([order.id]))[order.id] || [];
        const { data: company } = await supabase
          .from("company_settings")
          .select("company_name")
          .eq("store_id", storeId)
          .maybeSingle();
        await reprintPanelOrder(storeId, order, items, company?.company_name || "Restaurante");
        toast.success(`Reimpressão enviada, #${order.order_number}`);
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao reimprimir");
        return false;
      }
    },
    [storeId, itemsByOrder],
  );

  return {
    orders,
    itemsByOrder,
    loading,
    connectionStatus,
    updateStatus,
    cancelOrder,
    setPrepMinutes,
    markOrderPaid,
    assignDriver,
    reprintOrder,
    refresh: fetchOrders,
  };
}
