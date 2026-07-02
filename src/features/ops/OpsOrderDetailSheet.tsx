import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MapPin, Clock, XCircle, Printer, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { getOrderModalityBanner, getPanelPaymentBadge, getStatusLabel } from "@/lib/orderStatusLabels";
import { getPanelOrderAction, isDeliveryOrder } from "@/lib/orderOperationalFlow";
import { blocksOperationalProgressUntilPaid, isAwaitingCounterPaymentConfirmation, isAwaitingOnlinePaymentConfirmation } from "@/lib/orderKitchenRules";
import { canAssignDeliveryDriver } from "@/lib/staffPermissions";
import { groupOrderItemDetails } from "@/lib/modifiers/formatOrderItem";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT, formatStaffPanelDateTime } from "@/lib/staffPanelLocale";
import type { StaffI18nKey } from "@/lib/staffI18n";
import type { PanelOrder, OrderStatus } from "./usePanelOrders";
import {
  ETA_QUICK_OPTIONS,
  formatOrderClock,
  formatOrderEta,
  formatPrepRemaining,
  getModalityShortLabel,
  orderItemCount,
  requiresEtaBeforeAccept,
} from "./opsOrderUi";
import { isTapToPayPlatform } from "@/lib/stripeTerminalService";

type OrderItem = Tables<"order_items">;

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

function getSourceLabel(source: string, t: (key: StaffI18nKey) => string) {
  const map: Record<string, StaffI18nKey> = {
    totem: "order.source.totem",
    ifood: "order.source.ifood",
    counter: "order.source.counter",
    delivery: "order.source.delivery",
    waiter: "order.source.waiter",
  };
  const key = map[source];
  return key ? t(key) : source;
}

type Props = {
  order: PanelOrder | null;
  items: OrderItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdvance: (order: PanelOrder, status: OrderStatus, prepMinutes?: number) => void | Promise<void> | Promise<boolean>;
  onRequestAccept: (order: PanelOrder) => void;
  onCancel: (orderId: string) => void;
  onSetPrepMinutes?: (order: PanelOrder, minutes: number) => void;
  onMarkPaid?: (order: PanelOrder, method: "cash" | "card") => void | Promise<void>;
  onRequestAssignDriver?: (order: PanelOrder) => void;
  onReprint?: (order: PanelOrder) => void | Promise<void> | Promise<boolean>;
  viewerRole?: string | null;
  driverName?: string | null;
};

const OpsOrderDetailSheet = ({
  order,
  items,
  open,
  onOpenChange,
  onAdvance,
  onRequestAccept,
  onCancel,
  onSetPrepMinutes,
  onMarkPaid,
  onRequestAssignDriver,
  onReprint,
  viewerRole,
  driverName,
}: Props) => {
  const { t, lang } = useStaffT();
  const [advancing, setAdvancing] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [reprinting, setReprinting] = useState(false);

  if (!order) {
    if (!open) return null;
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md staff-wide:max-w-xl overflow-y-auto p-0">
          <div className="flex min-h-[240px] items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const modality = getOrderModalityBanner(order, lang);
  const payment = getPanelPaymentBadge(order, lang);
  const action = getPanelOrderAction(order, { canAssignDriver: canAssignDeliveryDriver(viewerRole as any), lang });
  const etaLabel = formatOrderEta(order, lang);
  const prepRemaining = formatPrepRemaining(order, lang);
  const itemCount = orderItemCount(items);
  const blockedUntilPaid = blocksOperationalProgressUntilPaid(order);
  const awaitingOnlinePayment = isAwaitingOnlinePaymentConfirmation(order);
  const showDeliveryCode =
    isDeliveryOrder(order) &&
    (order.status === "ready" || order.status === "out_for_delivery") &&
    order.delivery_confirmation_code;

  const handlePrimary = async () => {
    if (!action) return;
    if (action.kind === "accept_eta") {
      onRequestAccept(order);
      return;
    }
    if (action.kind === "assign_driver") {
      onRequestAssignDriver?.(order);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md staff-wide:max-w-xl overflow-y-auto p-0">
        <div className={`px-4 py-3 text-center ${modalityBannerClass[modality.tone]}`}>
          <p className="text-base font-black tracking-wide">{modality.label}</p>
          <p className="text-[11px] font-semibold opacity-90">{modality.detail}</p>
        </div>

        <div className="p-4 space-y-4">
          <SheetHeader className="space-y-1 text-left p-0">
            <SheetTitle className="flex items-center justify-between gap-2">
              <span>{panelT(lang, "order.detail.title", { code: order.order_number })}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {formatStaffPanelDateTime(order.created_at, lang)}
              </span>
            </SheetTitle>
            <p className="text-sm text-muted-foreground">{getStatusLabel(order.status, order.order_type, lang)}</p>
          </SheetHeader>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{getSourceLabel(order.source || "totem", t)}</Badge>
            <Badge variant="outline">{getModalityShortLabel(order, lang)}</Badge>
            <Badge className={paymentBadgeClass[payment.tone]}>{payment.label}</Badge>
            {payment.methodLabel && (
              <Badge variant="secondary" className="font-semibold">
                {payment.methodLabel}
              </Badge>
            )}
            {order.payment_status === "paid" && order.payment_confirmed_by_name && (
              <Badge variant="outline" className="font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                {panelT(lang, "order.detail.paid_by", { name: order.payment_confirmed_by_name })}
              </Badge>
            )}
            {prepRemaining && (
              <Badge variant="secondary" className="gap-1 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400">
                <Clock className="h-3 w-3" /> {prepRemaining}
              </Badge>
            )}
            {!prepRemaining && etaLabel && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" /> ~{etaLabel}
              </Badge>
            )}
          </div>

          {showDeliveryCode && (
            <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                {t("order.detail.delivery_code")}
              </p>
              <p className="text-3xl font-black tracking-[0.25em] tabular-nums text-orange-600">
                {order.delivery_confirmation_code}
              </p>
              {driverName && (
                <p className="text-xs text-muted-foreground mt-1">
                  {panelT(lang, "order.detail.driver_label", { name: driverName })}
                </p>
              )}
            </div>
          )}

          {(order.customer_name || order.customer_phone) && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
              {order.customer_name && (
                <div className="flex items-center gap-2 font-semibold">
                  <User className="h-4 w-4 shrink-0" />
                  {order.customer_name}
                </div>
              )}
              {order.customer_phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  {order.customer_phone}
                </div>
              )}
            </div>
          )}

          {order.delivery_street && (
            <div className="flex items-start gap-2 text-sm rounded-lg border p-3">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <span>
                {order.delivery_street} {order.delivery_number}, {order.delivery_city}
              </span>
            </div>
          )}

          {order.notes && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                {t("order.detail.notes")}
              </p>
              <p>{order.notes}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
              {panelT(lang, "order.detail.items_with_count", { count: itemCount })}
            </p>
            <ul className="space-y-2 text-sm">
              {items.map((it) => {
                const groups = groupOrderItemDetails(it);
                return (
                  <li key={it.id} className="rounded-lg border p-2.5 space-y-2">
                    <div className="flex justify-between gap-2 font-semibold">
                      <span>
                        {it.quantity}x {it.product_name}
                      </span>
                      <span className="shrink-0">€{Number(it.total_price).toFixed(2)}</span>
                    </div>
                    {groups.map((g, idx) => (
                      <div
                        key={`${it.id}-${g.unitIndex ?? "g"}-${idx}`}
                        className={g.unitLabel ? "rounded-md border border-border/60 bg-muted/40 p-2" : ""}
                      >
                        {g.unitLabel && (
                          <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-1">
                            {g.unitLabel}
                          </p>
                        )}
                        {g.lines.map((d, li) => (
                          <p key={`${it.id}-${idx}-${li}`} className="text-xs text-muted-foreground pl-1">
                            · {d}
                          </p>
                        ))}
                      </div>
                    ))}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex items-center justify-between text-lg font-black text-primary border-t pt-3">
            <span>{t("order.detail.total")}</span>
            <span>€ {Number(order.total).toFixed(2)}</span>
          </div>

          {order.status === "preparing" && onSetPrepMinutes && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("order.detail.adjust_prep")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ETA_QUICK_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onSetPrepMinutes(order, m)}
                    className="min-h-[32px] px-2.5 rounded-md text-xs font-bold bg-muted hover:bg-primary hover:text-primary-foreground touch-action-manipulation"
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {awaitingOnlinePayment && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide">{t("order.detail.payment_pending")}</p>
              <p className="text-xs font-semibold text-foreground">{t("order.detail.awaiting_online_payment")}</p>
            </div>
          )}

          {isAwaitingCounterPaymentConfirmation(order) && onMarkPaid && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide">{t("order.detail.payment_pending")}</p>
              {blockedUntilPaid && (
                <p className="text-xs font-semibold text-foreground">{t("order.detail.counter_payment_required")}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 h-10 font-bold"
                  disabled={markingPaid}
                  onClick={async () => {
                    setMarkingPaid(true);
                    try {
                      await onMarkPaid(order, "cash");
                    } finally {
                      setMarkingPaid(false);
                    }
                  }}
                >
                  {t("order.detail.mark_cash")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 h-10 font-bold"
                  disabled={markingPaid}
                  onClick={() => {
                    if (isTapToPayPlatform()) {
                      void onMarkPaid(order, "card");
                      return;
                    }
                    void (async () => {
                      setMarkingPaid(true);
                      try {
                        await onMarkPaid(order, "card");
                      } finally {
                        setMarkingPaid(false);
                      }
                    })();
                  }}
                >
                  {isTapToPayPlatform() ? t("order.detail.tap_to_pay") : t("order.detail.mark_card")}
                </Button>
              </div>
            </div>
          )}

          {action && order.status !== "cancelled" && (
            <Button
              className={`w-full h-11 font-bold touch-action-manipulation ${
                action.kind === "assign_driver" ? "bg-orange-600 hover:bg-orange-700" : ""
              }`}
              disabled={advancing}
              onClick={() => void handlePrimary()}
            >
              {advancing
                ? t("order.detail.updating")
                : action.kind === "accept_eta"
                  ? t("order.detail.accept")
                  : action.label}
            </Button>
          )}

          {onReprint && order.status !== "cancelled" && (
            <Button
              variant="outline"
              className="w-full h-10 touch-action-manipulation"
              disabled={reprinting}
              onClick={async () => {
                setReprinting(true);
                try {
                  await onReprint(order);
                } finally {
                  setReprinting(false);
                }
              }}
            >
              <Printer className="h-4 w-4 mr-1" />
              {reprinting ? t("order.detail.sending") : t("order.detail.reprint")}
            </Button>
          )}

          {(order.status === "pending" || order.status === "preparing") && (
            <Button
              variant="destructive"
              className="w-full h-10 touch-action-manipulation"
              onClick={() => {
                onCancel(order.id);
                onOpenChange(false);
              }}
            >
              <XCircle className="h-4 w-4 mr-1" /> {t("order.detail.cancel")}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default OpsOrderDetailSheet;
