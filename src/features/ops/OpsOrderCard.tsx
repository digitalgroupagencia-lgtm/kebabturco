import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MapPin, XCircle, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { getNextAction, getOrderModalityBanner, getPanelPaymentBadge } from "@/lib/orderStatusLabels";
import type { PanelOrder, OrderStatus } from "./usePanelOrders";

type OrderItem = Tables<"order_items">;

const statusCardClass: Record<string, string> = {
  pending: "bg-red-500/15 border-red-500 ring-1 ring-red-500/30 animate-pulse",
  preparing: "bg-yellow-500/15 border-yellow-400",
  ready: "bg-green-500/15 border-green-500",
  out_for_delivery: "bg-blue-500/15 border-blue-500",
  delivered: "bg-muted/80 border-muted-foreground/20 opacity-75",
  cancelled: "bg-destructive/10 border-destructive/30",
};

const modalityBannerClass = {
  delivery: "bg-blue-600 text-white",
  takeaway: "bg-amber-600 text-white",
  dine_in: "bg-primary text-primary-foreground",
  unknown: "bg-muted text-foreground",
} as const;

const paymentBadgeClass = {
  paid: "bg-green-600 text-white",
  pending: "bg-yellow-500 text-black",
} as const;

const PREP_OPTIONS = [10, 12, 15, 20, 25, 30];

function getSourceLabel(source: string) {
  const map: Record<string, string> = {
    totem: "App",
    ifood: "iFood",
    counter: "Balcão",
    delivery: "Delivery",
    waiter: "Garçon",
  };
  return map[source] || source;
}

interface OpsOrderCardProps {
  order: PanelOrder;
  items: OrderItem[];
  onAdvance: (order: PanelOrder, status: OrderStatus, prepMinutes?: number) => void | Promise<void>;
  onCancel: (orderId: string) => void;
  onSetPrepMinutes?: (order: PanelOrder, minutes: number) => void;
}

const OpsOrderCard = ({ order, items, onAdvance, onCancel, onSetPrepMinutes }: OpsOrderCardProps) => {
  const modality = getOrderModalityBanner(order);
  const payment = getPanelPaymentBadge(order);
  const next = getNextAction(order.status, order.order_type);
  const cardClass = statusCardClass[order.status] || "border-border";
  const [prepMin, setPrepMin] = useState(12);
  const [advancing, setAdvancing] = useState(false);

  const etaLabel = order.estimated_ready_at
    ? new Date(order.estimated_ready_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Card className={`overflow-hidden border-2 ${cardClass}`}>
      <div className={`px-4 py-2.5 text-center ${modalityBannerClass[modality.tone]}`}>
        <p className="text-lg font-black tracking-wide leading-none">{modality.label}</p>
        <p className="text-[11px] font-semibold opacity-90 mt-0.5">{modality.detail}</p>
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-black text-xl">#{order.order_number}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">{getSourceLabel(order.source || "totem")}</Badge>
          <Badge className={paymentBadgeClass[payment.tone]}>{payment.label}</Badge>
        </div>
        {order.customer_name && (
          <div className="flex items-center gap-1.5 text-sm">
            <User className="w-3.5 h-3.5" />
            {order.customer_name}
          </div>
        )}
        {order.customer_phone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5" />
            {order.customer_phone}
          </div>
        )}
        {order.delivery_street && (
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {order.delivery_street} {order.delivery_number}, {order.delivery_city}
            </span>
          </div>
        )}
        <ul className="text-xs space-y-1 border-t pt-2 max-h-28 overflow-y-auto">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-2">
              <span className="truncate">
                {it.quantity}x {it.product_name}
              </span>
              <span className="font-bold shrink-0">€{Number(it.total_price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between font-black text-lg text-primary">
          <span>Total</span>
          <span>€ {Number(order.total).toFixed(2)}</span>
        </div>

        {(order.status === "pending" || order.status === "preparing") && (
          <div className="rounded-xl border bg-background/80 p-2.5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Tempo estimado
              {etaLabel && <span className="ml-auto text-foreground">Pronto ~{etaLabel}</span>}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PREP_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setPrepMin(m);
                    onSetPrepMinutes?.(order, m);
                  }}
                  className={`min-h-[36px] min-w-[44px] px-2 rounded-lg text-xs font-bold touch-action-manipulation ${
                    prepMin === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        )}

        {next && (
          <Button
            size="lg"
            className="w-full h-14 font-black text-base touch-action-manipulation"
            disabled={advancing}
            onClick={async () => {
              setAdvancing(true);
              try {
                await onAdvance(
                  order,
                  next.next,
                  order.status === "pending" && next.next === "preparing" ? prepMin : undefined,
                );
              } finally {
                setAdvancing(false);
              }
            }}
          >
            {advancing ? "A actualizar…" : next.label}
          </Button>
        )}
        {order.status === "pending" && (
          <Button
            size="sm"
            variant="destructive"
            className="w-full h-11 touch-action-manipulation"
            onClick={() => onCancel(order.id)}
          >
            <XCircle className="h-4 w-4 mr-1" /> Cancelar
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default OpsOrderCard;
