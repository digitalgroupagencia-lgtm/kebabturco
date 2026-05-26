import { memo, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Clock, XCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { getPanelPaymentBadge } from "@/lib/orderStatusLabels";
import { getPanelOrderAction } from "@/lib/orderOperationalFlow";
import type { PanelOrder, OrderStatus } from "./usePanelOrders";
import {
  compactCardBorderClass,
  formatOrderClock,
  formatOrderEta,
  formatPrepRemaining,
  getCompactActionLabel,
  getModalityShortLabel,
  orderItemCount,
  requiresEtaBeforeAccept,
  summarizeOrderItems,
} from "./opsOrderUi";

type OrderItem = Tables<"order_items">;

const paymentBadgeClass = {
  paid: "bg-green-600/90 text-white text-[10px]",
  pending: "bg-yellow-500 text-black text-[10px]",
} as const;

interface OpsOrderCardProps {
  order: PanelOrder;
  items: OrderItem[];
  needsAttention?: boolean;
  onAdvance: (order: PanelOrder, status: OrderStatus, prepMinutes?: number) => void | Promise<void>;
  onCancel: (orderId: string) => void;
  onOpenDetail: (order: PanelOrder) => void;
  onRequestAccept: (order: PanelOrder) => void;
  onRequestDeliveryConfirm: (order: PanelOrder) => void;
}

const OpsOrderCard = memo(function OpsOrderCard({
  order,
  items,
  needsAttention = false,
  onAdvance,
  onCancel,
  onOpenDetail,
  onRequestAccept,
  onRequestDeliveryConfirm,
}: OpsOrderCardProps) {
  const payment = getPanelPaymentBadge(order);
  const action = getPanelOrderAction(order);
  const actionLabel = getCompactActionLabel(order);
  const itemCount = orderItemCount(items);
  const itemSummary = summarizeOrderItems(items);
  const etaLabel = formatOrderEta(order);
  const prepRemaining = formatPrepRemaining(order);
  const timeLabel = formatOrderClock(order.created_at);
  const [advancing, setAdvancing] = useState(false);

  const isPending = order.status === "pending";
  const borderClass = compactCardBorderClass(order.status);

  const handlePrimary = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!action) return;
    if (action.kind === "accept_eta") {
      onRequestAccept(order);
      return;
    }
    if (action.kind === "delivery_code") {
      onRequestDeliveryConfirm(order);
      return;
    }
    if (requiresEtaBeforeAccept(order.status, action.next)) {
      onRequestAccept(order);
      return;
    }
    setAdvancing(true);
    try {
      await onAdvance(order, action.next);
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <article
      className={`rounded-lg border bg-card shadow-sm overflow-hidden ${borderClass} ${
        needsAttention ? "ring-2 ring-red-500/50 animate-pulse" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenDetail(order)}
        className="w-full text-left px-2.5 py-2 hover:bg-muted/40 transition-colors touch-action-manipulation"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black text-base tabular-nums shrink-0">#{order.order_number}</span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold shrink-0">
            {getModalityShortLabel(order)}
          </Badge>
          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{timeLabel}</span>
          <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground shrink-0" />
        </div>

        <div className="mt-1 flex items-center gap-2 min-w-0 text-sm">
          <span className="truncate font-medium flex-1 min-w-0">
            {order.customer_name || "Cliente"}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">{itemCount} it.</span>
          <span className="font-black text-primary tabular-nums shrink-0">€{Number(order.total).toFixed(2)}</span>
        </div>

        {order.status === "preparing" && itemSummary && (
          <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{itemSummary}</p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1">
          <Badge className={`h-5 px-1.5 ${paymentBadgeClass[payment.tone]}`}>{payment.label}</Badge>
          {prepRemaining && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
              <Clock className="h-2.5 w-2.5" /> {prepRemaining}
            </Badge>
          )}
          {!prepRemaining && etaLabel && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5">
              <Clock className="h-2.5 w-2.5" /> {etaLabel}
            </Badge>
          )}
        </div>
      </button>

      {action && order.status !== "cancelled" && (
        <div className="px-2 pb-2 flex gap-1.5">
          <Button
            size="sm"
            className={`flex-1 h-9 font-bold text-xs touch-action-manipulation ${
              action.kind === "delivery_code" ? "bg-orange-600 hover:bg-orange-700" : ""
            }`}
            disabled={advancing}
            onClick={(e) => void handlePrimary(e)}
          >
            {advancing ? "…" : actionLabel}
          </Button>
          {isPending && (
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-9 p-0 text-destructive hover:text-destructive shrink-0 touch-action-manipulation"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(order.id);
              }}
              aria-label="Cancelar pedido"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </article>
  );
});

export default OpsOrderCard;
