import { memo, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Clock, Bike, XCircle, Banknote, CreditCard } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { getPanelPaymentBadge } from "@/lib/orderStatusLabels";
import { getPanelOrderAction, isDeliveryOrder } from "@/lib/orderOperationalFlow";
import { blocksOperationalProgressUntilPaid, isAwaitingCounterPaymentConfirmation } from "@/lib/orderKitchenRules";
import { canAssignDeliveryDriver } from "@/lib/staffPermissions";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
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
  urgentAttention?: boolean;
  viewerRole?: string | null;
  driverName?: string | null;
  onAdvance: (order: PanelOrder, status: OrderStatus, prepMinutes?: number) => void | Promise<void> | Promise<boolean>;
  onCancel: (orderId: string) => void;
  onOpenDetail: (order: PanelOrder) => void;
  onRequestAccept: (order: PanelOrder) => void;
  onRequestAssignDriver: (order: PanelOrder) => void;
  onMarkPaid?: (order: PanelOrder, method: "cash" | "card") => void | Promise<void> | Promise<boolean>;
  showTapToPayButton?: boolean;
}

const OpsOrderCard = memo(function OpsOrderCard({
  order,
  items,
  needsAttention = false,
  urgentAttention = false,
  viewerRole,
  driverName,
  onAdvance,
  onCancel,
  onOpenDetail,
  onRequestAccept,
  onRequestAssignDriver,
  onMarkPaid,
  showTapToPayButton = false,
}: OpsOrderCardProps) {
  const { t, lang } = useStaffT();
  const payment = getPanelPaymentBadge(order, lang);
  const action = getPanelOrderAction(order, { canAssignDriver: canAssignDeliveryDriver(viewerRole as any), lang });
  const actionLabel = getCompactActionLabel(order, viewerRole, lang);
  const itemCount = orderItemCount(items);
  const itemSummary = summarizeOrderItems(items, 1);
  const prepRemaining = formatPrepRemaining(order, lang);
  const timeLabel = formatOrderClock(order.created_at, lang);
  const [advancing, setAdvancing] = useState(false);
  const [payingNow, setPayingNow] = useState(false);
  const isPending = order.status === "pending";
  const canCancel = order.status === "pending" || order.status === "preparing";
  const borderClass = compactCardBorderClass(order.status);
  const isDelivery = isDeliveryOrder(order);
  const awaitingDriver = isDelivery && order.status === "ready" && order.assigned_driver_id;
  const onTheWay = order.status === "out_for_delivery";
  const canQuickPay = isAwaitingCounterPaymentConfirmation(order) && !!onMarkPaid;
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

  const isTest = Boolean((order as unknown as { is_test?: boolean }).is_test);
  return (
    <article
      className={`rounded-md border bg-card overflow-hidden ${borderClass} ${
        urgentAttention
          ? "ring-4 ring-red-600 animate-pulse bg-red-500/5"
          : needsAttention
            ? "ring-2 ring-red-500/50 animate-pulse"
            : ""
      } ${isTest ? "border-dashed border-yellow-500 bg-yellow-500/5" : ""}`}
    >
      <button
        type="button"
        onClick={() => onOpenDetail(order)}
        className="w-full text-left px-2 py-1.5 hover:bg-muted/40 transition-colors touch-action-manipulation"
      >
        <div className="flex items-center gap-1.5 min-w-0 text-xs">
          {isTest && (
            <Badge className="h-4 px-1 text-[9px] font-black bg-yellow-500 text-black shrink-0" title={t("ops.card.test_hint")}>
              {t("ops.card.test_badge")}
            </Badge>
          )}
          <span className="font-black text-sm tabular-nums shrink-0">#{order.order_number}</span>
          <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold shrink-0">
            {getModalityShortLabel(order, lang)}
          </Badge>
          <span className="truncate font-medium flex-1 min-w-0">{order.customer_name || t("common.customer")}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{itemCount}it</span>
          <span className="font-black text-primary text-xs tabular-nums shrink-0">€{Number(order.total).toFixed(2)}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        </div>


        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          <Badge className={`h-4 px-1 ${paymentBadgeClass[payment.tone]}`}>{payment.label}</Badge>
          {payment.methodLabel && payment.tone === "paid" && (
            <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold">
              {payment.methodLabel}
            </Badge>
          )}
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
              <Bike className="h-2 w-2" /> {driverName || t("ops.card.assigned")}
            </Badge>
          )}
          {onTheWay && (
            <Badge className="h-4 px-1 text-[9px] bg-orange-600">{t("ops.card.on_the_way")}</Badge>
          )}
        </div>

        {order.status === "preparing" && itemSummary && (
          <p className="mt-0.5 text-[9px] text-muted-foreground truncate">{itemSummary}</p>
        )}
        {(order as unknown as { accepted_by_name?: string | null }).accepted_by_name && order.status !== "pending" && (
          <p className="mt-0.5 text-[9px] text-muted-foreground truncate">
            {panelT(lang, "ops.card.accepted_by", {
              name: (order as unknown as { accepted_by_name?: string | null }).accepted_by_name!,
            })}
          </p>
        )}
        {order.payment_status === "paid" && order.payment_confirmed_by_name && (
          <p className="mt-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">
            {panelT(lang, "ops.card.paid_by", { name: order.payment_confirmed_by_name })}
          </p>
        )}
        {blockedUntilPaid && (
          <p className="mt-0.5 text-[9px] font-semibold text-foreground">
            {t("ops.card.blocked_until_paid")}
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
              {canCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel(order.id);
                  }}
                  aria-label={t("ops.card.cancel")}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
          {canQuickPay && (
            <div className={action ? "space-y-1" : "flex gap-1"}>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-8 font-bold text-[11px] touch-action-manipulation border-green-600/60 text-green-700 hover:bg-green-600 hover:text-white dark:text-green-400 ${
                    showTapToPayButton ? "flex-1" : action ? "w-full" : "flex-1"
                  }`}
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
                  {payingNow ? t("ops.card.registering") : t("cashier.method.cash")}
                </Button>
                <Button
                  size="sm"
                  className={`h-8 font-bold text-[11px] touch-action-manipulation bg-primary hover:bg-primary/90 text-primary-foreground ${
                    showTapToPayButton ? "flex-1" : "flex-1"
                  }`}
                  disabled={payingNow}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (showTapToPayButton) {
                      void onMarkPaid!(order, "card");
                      return;
                    }
                    void (async () => {
                      setPayingNow(true);
                      try {
                        await onMarkPaid!(order, "card");
                      } finally {
                        setPayingNow(false);
                      }
                    })();
                  }}
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  {payingNow
                    ? t("ops.card.registering")
                    : showTapToPayButton
                      ? t("ops.card.tap_to_pay")
                      : t("order.detail.mark_card")}
                </Button>
              </div>
              {!action && canCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel(order.id);
                  }}
                  aria-label={t("ops.card.cancel")}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
});

export default OpsOrderCard;
