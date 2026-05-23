import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { getCustomerTrackingSteps } from "@/lib/orderStatusLabels";
import ScreenHeader from "@/components/ScreenHeader";
import { Loader2, CheckCircle2, Circle } from "lucide-react";

type PublicOrder = {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  total: number;
  created_at: string;
  estimated_ready_at: string | null;
  delivery_street: string | null;
  delivery_city: string | null;
};

const OrderTrackingScreen = () => {
  const { trackingOrderId, setScreen, orderNumber } = useOrder();
  const { t } = useLanguage();
  const { settings } = useOperationsSettings();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = trackingOrderId || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("order") : null);

  const fetchOrder = async () => {
    if (!orderId) return;
    const { data, error } = await supabase.rpc("get_order_public", { _order_id: orderId });
    if (!error && data?.[0]) setOrder(data[0] as PublicOrder);
    setLoading(false);
  };

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    fetchOrder();
    const channel = supabase
      .channel(`order-track-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        fetchOrder,
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const steps = useMemo(() => getCustomerTrackingSteps(order?.order_type), [order?.order_type]);

  const currentIdx = useMemo(() => {
    if (!order) return 0;
    const idx = steps.findIndex((s) => s.key === order.status);
    if (idx >= 0) return idx;
    if (order.status === "cancelled") return -1;
    return 0;
  }, [order, steps]);

  const prepMin = (settings as { avg_prep_minutes?: number })?.avg_prep_minutes ?? 12;

  if (!orderId) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">Pedido não encontrado</p>
        <button onClick={() => setScreen("home")} className="mt-4 text-primary font-bold">Voltar ao menu</button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col animate-fade-in">
      <ScreenHeader
        eyebrow={t("menu")}
        title={`Pedido #${order?.order_number || orderNumber || "..."}`}
        onBack={() => setScreen("home")}
        sticky
      />

      <div className="flex-1 px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
        ) : !order ? (
          <p className="text-center text-muted-foreground">Pedido não encontrado</p>
        ) : (
          <>
            {order.status === "cancelled" ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
                <p className="text-lg font-black text-destructive">Pedido cancelado</p>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Estado actual</p>
                  <p className="text-2xl font-black text-foreground">
                    {steps[currentIdx]?.icon} {steps[currentIdx]?.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tempo estimado: ~{prepMin} min
                    {order.estimated_ready_at && (
                      <> · Pronto ~{new Date(order.estimated_ready_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                    )}
                  </p>
                </div>

                <ol className="space-y-0 relative">
                  {steps.map((step, i) => {
                    const done = i < currentIdx;
                    const active = i === currentIdx;
                    return (
                      <li key={step.key} className="flex gap-4 pb-6 last:pb-0 relative">
                        {i < steps.length - 1 && (
                          <span className={`absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)] ${done ? "bg-success" : "bg-border"}`} />
                        )}
                        <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground"
                        }`}>
                          {done ? <CheckCircle2 className="w-4 h-4" /> : active ? <span className="text-sm">{step.icon}</span> : <Circle className="w-4 h-4" />}
                        </span>
                        <div className="pt-1">
                          <p className={`font-bold ${active ? "text-foreground" : done ? "text-success" : "text-muted-foreground"}`}>{step.label}</p>
                          {active && <p className="text-xs text-muted-foreground mt-0.5">Em curso...</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {order.delivery_street && (
              <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                <p className="font-bold text-muted-foreground text-xs uppercase mb-1">Entrega em</p>
                <p>{order.delivery_street}{order.delivery_city ? `, ${order.delivery_city}` : ""}</p>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-4 flex justify-between items-center">
              <span className="font-bold">Total</span>
              <span className="text-xl font-black text-price tabular-nums">{Number(order.total).toFixed(2)}€</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingScreen;
