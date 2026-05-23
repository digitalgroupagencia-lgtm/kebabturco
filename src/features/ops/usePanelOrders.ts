import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, Database } from "@/integrations/supabase/types";
import { getStatusLabel } from "@/lib/orderStatusLabels";
import { playNewOrderAlert } from "@/lib/panelAlerts";
import { notifyOrderStatusChange } from "@/services/pushService";
import { tryPrintPanelOrder } from "@/features/ops/panelPrintHelper";

export type PanelOrder = Tables<"orders"> & {
  delivery_street?: string | null;
  delivery_city?: string | null;
  delivery_number?: string | null;
};
type OrderItem = Tables<"order_items">;
export type OrderStatus = Database["public"]["Enums"]["order_status"] | "out_for_delivery";

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

export function usePanelOrders(storeId: string | undefined) {
  const [orders, setOrders] = useState<PanelOrder[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const knownPendingRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const updatingRef = useRef<Set<string>>(new Set());

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
      if (initializedRef.current) {
        for (const o of data) {
          if (o.status === "pending" && !knownPendingRef.current.has(o.id)) {
            playNewOrderAlert();
            toast.info(`Novo pedido #${o.order_number}`, { duration: 5000 });
          }
        }
      }
      knownPendingRef.current = new Set(data.filter((o) => o.status === "pending").map((o) => o.id));
      initializedRef.current = true;

      setOrders(data as PanelOrder[]);
      const ids = data.map((o) => o.id);
      setItemsByOrder(ids.length ? await fetchItemsForOrders(ids) : {});
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    fetchOrders();

    const channel = supabase
      .channel(`panel-orders-${storeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
        async (payload) => {
          const row = payload.new as PanelOrder;
          if (!isToday(row.created_at)) return;
          if (updatingRef.current.has(row.id)) return;

          setOrders((prev) => {
            if (prev.some((o) => o.id === row.id)) return prev;
            return [row, ...prev];
          });

          const items = await fetchItemsForOrders([row.id]);
          setItemsByOrder((prev) => ({ ...prev, ...items }));

          if (initializedRef.current && row.status === "pending" && !knownPendingRef.current.has(row.id)) {
            knownPendingRef.current.add(row.id);
            playNewOrderAlert();
            toast.info(`Novo pedido #${row.order_number}`, { duration: 5000 });
            void tryPrintPanelOrder(storeId, row, items[row.id] || []);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
        (payload) => {
          const row = payload.new as PanelOrder;
          if (updatingRef.current.has(row.id)) return;
          setOrders((prev) => prev.map((o) => (o.id === row.id ? { ...o, ...row } : o)));
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, fetchOrders]);

  const updateStatus = useCallback(async (order: PanelOrder, newStatus: OrderStatus, prepMinutes?: number) => {
    if (updatingRef.current.has(order.id)) return;
    updatingRef.current.add(order.id);
    const prevStatus = order.status;

    const patch: Record<string, unknown> = { status: newStatus as Database["public"]["Enums"]["order_status"] };
    if (newStatus === "preparing" && prepMinutes) {
      const eta = new Date();
      eta.setMinutes(eta.getMinutes() + prepMinutes);
      patch.estimated_ready_at = eta.toISOString();
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, status: newStatus as PanelOrder["status"], estimated_ready_at: (patch.estimated_ready_at as string) ?? o.estimated_ready_at }
          : o,
      ),
    );

    const { error } = await supabase.from("orders").update(patch).eq("id", order.id);

    updatingRef.current.delete(order.id);

    if (error) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: prevStatus } : o)));
      toast.error("Erro ao actualizar");
      return;
    }

    toast.success(`Pedido → ${getStatusLabel(newStatus, order.order_type)}`);
    await notifyOrderStatusChange(order.id, newStatus, order.order_number);
  }, []);

  const cancelOrder = useCallback(async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || updatingRef.current.has(orderId)) return;

    updatingRef.current.add(orderId);
    const prevStatus = order.status;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)));

    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    updatingRef.current.delete(orderId);

    if (error) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: prevStatus } : o)));
      toast.error("Erro ao cancelar");
      return;
    }

    toast.success("Pedido cancelado");
    await notifyOrderStatusChange(orderId, "cancelled", order.order_number);
  }, [orders]);

  const setPrepMinutes = useCallback(async (order: PanelOrder, minutes: number) => {
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + minutes);
    const iso = eta.toISOString();
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, estimated_ready_at: iso } : o)));
    await supabase.from("orders").update({ estimated_ready_at: iso }).eq("id", order.id);
  }, []);

  return { orders, itemsByOrder, loading, updateStatus, cancelOrder, setPrepMinutes, refresh: fetchOrders };
}
