import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DriverOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_street: string | null;
  delivery_number: string | null;
  delivery_city: string | null;
  delivery_notes: string | null;
  notes: string | null;
  delivery_confirmation_code: string | null;
  delivery_started_at: string | null;
  estimated_ready_at: string | null;
  created_at: string;
  assigned_driver_id: string | null;
};

const POLL_MS = 8_000;

export function useDriverOrders(storeId?: string) {
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const updatingRef = useRef<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)("get_driver_deliveries", {
      _store_id: storeId ?? null,
    });
    if (!error && data) {
      setOrders(data as unknown as DriverOrder[]);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    void fetchOrders();
    const id = window.setInterval(() => void fetchOrders(), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchOrders]);

  const startDelivery = useCallback(
    async (order: DriverOrder) => {
      if (updatingRef.current.has(order.id)) return false;
      updatingRef.current.add(order.id);
      try {
        const { data, error } = await (supabase.rpc as any)("start_delivery", { _order_id: order.id });
        if (error) throw error;
        const result = data as { success?: boolean; delivery_confirmation_code?: string };
        if (!result?.success) throw new Error("Não foi possível iniciar a entrega");
        toast.success("Entrega iniciada — cliente notificado");
        await fetchOrders();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao iniciar entrega");
        return false;
      } finally {
        updatingRef.current.delete(order.id);
      }
    },
    [fetchOrders],
  );

  const confirmDelivery = useCallback(
    async (order: DriverOrder, code: string) => {
      if (updatingRef.current.has(order.id)) return false;
      updatingRef.current.add(order.id);
      try {
        const { data, error } = await (supabase.rpc as any)("confirm_delivery_with_code", {
          _order_id: order.id,
          _code: code,
        });
        if (error) throw error;
        const result = data as { success?: boolean; error?: string };
        if (!result?.success) throw new Error(result?.error || "Código incorrecto");
        toast.success(`Entrega concluída — #${order.order_number}`);
        await fetchOrders();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Código incorrecto");
        throw e;
      } finally {
        updatingRef.current.delete(order.id);
      }
    },
    [fetchOrders],
  );

  return { orders, loading, refresh: fetchOrders, startDelivery, confirmDelivery };
}
