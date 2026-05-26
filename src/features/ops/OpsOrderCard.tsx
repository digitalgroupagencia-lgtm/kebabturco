import { memo, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Clock, Bike, XCircle, Banknote } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { getPanelPaymentBadge } from "@/lib/orderStatusLabels";
import { getPanelOrderAction, isDeliveryOrder } from "@/lib/orderOperationalFlow";
import { blocksOperationalProgressUntilPaid } from "@/lib/orderKitchenRules";
import { canAssignDeliveryDriver } from "@/lib/staffPermissions";
import type { PanelOrder, OrderStatus } from "./usePanelOrders";
import {
  compactCardBorderClass,
  formatOrderClock,
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
  viewerRole?: string | null;
  driverName?: string | null;
  onAdvance: (order: PanelOrder, status: OrderStatus, prepMinutes?: number) => void | Promise<void> | Promise<boolean>;
  onCancel: (orderId: string) => void;
  onOpenDetail: (order: PanelOrder) => void;
  onRequestAccept: (order: PanelOrder) => void;
  onRequestAssignDriver: (order: PanelOrder) => void;
  onMarkPaid?: (order: PanelOrder, method: "cash" | "card") => void | Promise<void> | Promise<boolean>;
}

const OpsOrderCard = memo(function OpsOrderCard({
  order,
  items,
  needsAttention = false,
  viewerRole,
  driverName,
  onAdvance,
  onCancel,
  onOpenDetail,
  onRequestAccept,
  onRequestAssignDriver,
  onMarkPaid,
}: OpsOrderCardProps) {
  const payment = getPanelPaymentBadge(order);
  const action = getPanelOrderAction(order, { canAssignDriver: canAssignDeliveryDriver(viewerRole as any) });
  const actionLabel = getCompactActionLabel(order, viewerRole);
  const itemCount = orderItemCount(items);
  const itemSummary = summarizeOrderItems(items, 1);
  const prepRemaining = formatPrepRemaining(order);
  const timeLabel = formatOrderClock(order.created_at);
  const [advancing, setAdvancing] = useState(false);
  const [payingNow, setPayingNow] = useState(false);
  const isPending = order.status === "pending";
  const borderClass = compactCardBorderClass(order.status);
  const isDelivery = isDeliveryOrder(order);
  const awaitingDriver = isDelivery && order.status === "ready" && order.assigned_driver_id;
  const onTheWay = order.status === "out_for_delivery";
  const paymentPending = order.payment_status !== "paid" && order.status !== "cancelled";
  const canQuickPay = paymentPending && !!onMarkPaid;
  const blockedUntilPaid = blocksOperationalProgressUntilPaid(order);

  const handlePrimary = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!action) return;
    if (action.kind === "accept_eta") {
      onRequestAccept(order);
      return;
    }
    if (action.kind === "assign_driver") {
      onRequestAssignDriver(order);
      return;
    }
    if (action.kind === "delivery_code" || action.kind === "start_delivery") return;
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
      className={`rounded-md border bg-card overflow-hidden ${borderClass} ${
        needsAttention ? "ring-2 ring-red-500/50 animate-pulse" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenDetail(order)}
        className="w-full text-left px-2 py-1.5 hover:bg-muted/40 transition-colors touch-action-manipulation"
      >
        <div className="flex items-center gap-1.5 min-w-0 text-xs">
          <span className="font-black text-sm tabular-nums shrink-0">#{order.order_number}</span>
          <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold shrink-0">
            {getModalityShortLabel(order)}
          </Badge>
          <span className="truncate font-medium flex-1 min-w-0">{order.customer_name || "Cliente"}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{itemCount}it</span>
          <span className="font-black text-primary text-xs tabular-nums shrink-0">€{Number(order.total).toFixed(2)}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          <Badge className={`h-4 px-1 ${paymentBadgeClass[payment.tone]}`}>{payment.label}</Badge>
          {prepRemaining && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-yellow-500/15 text-yellow-700 dark:text-yellow-400">
              <Clock className="h-2 w-2 mr-0.5" /> {prepRemaining}
            </Badge>
          )}
          {!prepRemaining && (
            <span className="text-[9px] text-muted-foreground tabular-nums">{timeLabel}</span>
          )}
          {awaitingDriver && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px] gap-0.5">
              <Bike className="h-2 w-2" /> {driverName || "Atribuído"}
            </Badge>
          )}
          {onTheWay && (
            <Badge className="h-4 px-1 text-[9px] bg-orange-600">A caminho</Badge>
          )}
        </div>

        {order.status === "preparing" && itemSummary && (
          <p className="mt-0.5 text-[9px] text-muted-foreground truncate">{itemSummary}</p>
        )}
        {blockedUntilPaid && (
          <p className="mt-0.5 text-[9px] font-semibold text-foreground">
            Balcão só vai para cozinha após confirmar pagamento.
          </p>
        )}
      </button>

      {(action || canQuickPay) && order.status !== "cancelled" && (
        <div className="px-2 pb-1.5 space-y-1">
          {action && (
            <div className="flex gap-1">
              <Button
                size="sm"
                className={`flex-1 h-8 font-bold text-[11px] touch-action-manipulation ${
                  action.kind === "assign_driver" ? "bg-orange-600 hover:bg-orange-700" : ""
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
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel(order.id);
                  }}
                  aria-label="Cancelar pedido"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
          {canQuickPay && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 font-bold text-[11px] touch-action-manipulation border-green-600/60 text-green-700 hover:bg-green-600 hover:text-white dark:text-green-400"
              disabled={payingNow}
              onClick={async (e) => {
                e.stopPropagation();
                setPayingNow(true);
                try {
                  await onMarkPaid!(order, "cash");
                } finally {
                  setPayingNow(false);
                }
              }}
            >
              <Banknote className="h-3 w-3 mr-1" />
              {payingNow ? "A registar…" : `Confirmar pagamento €${Number(order.total).toFixed(2)}`}
            </Button>
          )}
        </div>
      )}
    </article>
  );
});

export default OpsOrderCard;
