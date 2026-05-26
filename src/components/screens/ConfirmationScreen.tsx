import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Check, Download, RotateCcw } from "lucide-react";
import { toPng } from "html-to-image";
import { shouldForceDeliveryOnly } from "@/lib/embed-mode";
import { useOrderTracking, type PublicOrderTrack } from "@/hooks/useOrderTracking";
import { clearStoredActiveOrder } from "@/features/customer/useActiveOrderStorage";
import { hasCustomerAcknowledged } from "@/lib/customerOrderUrl";
import { updateLocalOrderHistoryStatus } from "@/lib/customerOrderHistory";

function minimalStepIndex(status: string): number {
  if (status === "cancelled") return -1;
  if (status === "pending") return 0;
  if (status === "preparing") return 1;
  if (status === "ready") return 2;
  if (status === "out_for_delivery" || status === "delivered") return 3;
  return 0;
}

const ConfirmationScreen = () => {
  const {
    setScreen,
    orderNumber,
    tableNumber,
    paymentMethod,
    orderPaymentStatus,
    setTableNumber,
    setPaymentMethod,
    setOrderPaymentStatus,
    setCustomerName,
    setCustomerPhone,
    activeOrderId,
    setActiveOrderId,
    setTrackingOrderId,
  } = useOrder();
  const { orderType } = useCart();
  const { settings } = useOperationsSettings();
  const { settings: brand } = useBranding();
  const { t } = useLanguage();

  const isCounter = paymentMethod === "counter";
  const isCash = paymentMethod === "cash";
  const isPaidOnline = orderPaymentStatus === "paid";
  const prepMin = (settings as { avg_prep_minutes?: number })?.avg_prep_minutes ?? 12;
  const cardRef = useRef<HTMLDivElement>(null);
  const [savedAt] = useState(() => new Date());
  const [downloading, setDownloading] = useState(false);
  const [liveOrder, setLiveOrder] = useState<PublicOrderTrack | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [customerAcked, setCustomerAcked] = useState(() =>
    activeOrderId ? hasCustomerAcknowledged(activeOrderId) : false,
  );

  const onLiveOrder = useCallback((o: PublicOrderTrack | null) => {
    setLiveOrder(o);
    if (o?.id && o.status) updateLocalOrderHistoryStatus(o.id, o.status);
  }, []);
  const onTrackingLoading = useCallback(() => {}, []);
  useOrderTracking(activeOrderId || null, onLiveOrder, onTrackingLoading);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const liveStatus = liveOrder?.status || "pending";
  const liveOrderType = liveOrder?.order_type || (orderType === "here" ? "dine_in" : orderType === "delivery" ? "delivery" : "takeaway");
  const displayNumber = liveOrder?.order_number || orderNumber;
  const stepIdx = minimalStepIndex(liveStatus);
  const isCancelled = liveStatus === "cancelled";

  const timelineSteps = useMemo(() => {
    const last =
      liveOrderType === "delivery" ? t("stepDelivered") : t("stepCollected");
    return [t("stepReceived"), t("stepPreparing"), t("stepReady"), last];
  }, [liveOrderType, t]);

  const modalityLabel = useMemo(() => {
    if (liveOrderType === "delivery") return t("delivery");
    if (liveOrderType === "dine_in") {
      return tableNumber ? `${t("eatHere")} · ${tableNumber}` : t("eatHere");
    }
    return t("takeaway");
  }, [liveOrderType, tableNumber, t]);

  const etaLabel = useMemo(() => {
    if (isCancelled) return null;
    if (liveOrder?.estimated_ready_at) {
      const etaMs = new Date(liveOrder.estimated_ready_at).getTime();
      const minsLeft = Math.max(0, Math.ceil((etaMs - nowTick) / 60_000));
      if (minsLeft > 0) {
        return t("etaMinutesLeft").replace("{n}", String(minsLeft));
      }
      const timeStr = new Date(liveOrder.estimated_ready_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${t("estimatedTime")}: ${timeStr}`;
    }
    if (liveStatus === "pending") return t("etaWaitingAccept");
    return t("etaMinutesLeft").replace("{n}", String(prepMin));
  }, [isCancelled, liveOrder?.estimated_ready_at, liveStatus, nowTick, prepMin, t]);

  const paymentLabel = isPaidOnline
    ? t("paymentConfirmedShort")
    : isCounter
      ? settings?.msg_counter || t("payAtCounterTitle")
      : isCash
        ? t("payAtCounterSub")
        : null;

  const handleNewOrder = () => {
    setTableNumber("");
    setPaymentMethod(null);
    setOrderPaymentStatus("pending");
    setCustomerName("");
    setCustomerPhone("");
    const isTerminal = liveStatus === "delivered" || liveStatus === "cancelled" || customerAcked;
    if (activeOrderId && !customerAcked && !isTerminal) {
      setScreen(shouldForceDeliveryOnly() ? "home" : "orderType");
      return;
    }
    clearStoredActiveOrder();
    setActiveOrderId("");
    setTrackingOrderId("");
    setScreen(shouldForceDeliveryOnly() ? "home" : "orderType");
  };

  const handleViewOrder = () => {
    if (!activeOrderId) return;
    setTrackingOrderId(activeOrderId);
    setScreen("tracking");
  };

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#fff",
      });
      const link = document.createElement("a");
      link.download = `pedido-${displayNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      /* silencioso */
    } finally {
      setDownloading(false);
    }
  };

  const timeStr = savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = savedAt.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const logoUrl = brand?.logo_main_url || brand?.logo_secondary_url || null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background animate-fade-in">
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <div ref={cardRef} className="mx-auto flex w-full max-w-md flex-col px-6 pb-8 pt-2">
          {/* Topo discreto */}
          <div className="mb-10 flex items-center justify-between gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="" crossOrigin="anonymous" className="h-8 w-auto object-contain opacity-90" />
            ) : (
              <span className="text-sm font-bold text-foreground/80">{brand?.company_name || ""}</span>
            )}
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {dateStr} · {timeStr}
            </p>
          </div>

          {/* Bloco principal */}
          <div className="flex flex-col items-center text-center">
            {!isCancelled ? (
              <>
                <div className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-success/12">
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-success text-success-foreground shadow-[0_8px_24px_-8px_hsl(var(--success)/0.55)]">
                    <Check className="h-7 w-7" strokeWidth={2.8} />
                  </div>
                </div>
                <h1 className="text-[26px] font-black tracking-tight text-foreground leading-tight">
                  {t("orderConfirmedTitle")}
                </h1>
                <p className="mt-2 max-w-[260px] text-[15px] leading-relaxed text-muted-foreground">
                  {liveStatus === "pending" ? t("etaWaitingAccept") : t("preparingOrder")}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[26px] font-black tracking-tight text-destructive leading-tight">
                  Pedido cancelado
                </h1>
                <p className="mt-2 text-[15px] text-muted-foreground">Entre em contacto com o restaurante.</p>
              </>
            )}

            <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
              {t("yourNumber")}
            </p>
            <p className="mt-1 text-[56px] font-black tabular-nums leading-none tracking-tighter text-foreground">
              #{displayNumber}
            </p>

            {etaLabel && !isCancelled && (
              <p className="mt-5 text-[17px] font-bold text-foreground">{etaLabel}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
              <span>{modalityLabel}</span>
              {paymentLabel && (
                <>
                  <span className="text-border">·</span>
                  <span className={isPaidOnline ? "font-semibold text-success" : ""}>{paymentLabel}</span>
                </>
              )}
            </div>
          </div>

          {/* Timeline minimalista */}
          {!isCancelled && activeOrderId && (
            <div className="mt-12 px-1">
              <div className="relative flex items-start justify-between">
                <div className="absolute left-[10%] right-[10%] top-[5px] h-px bg-border" aria-hidden />
                {timelineSteps.map((label, i) => {
                  const done = stepIdx > i;
                  const active = stepIdx === i;
                  return (
                    <div key={label} className="relative z-10 flex w-[22%] flex-col items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full transition-colors ${
                          done
                            ? "bg-success"
                            : active
                              ? "bg-primary ring-4 ring-primary/15"
                              : "bg-muted-foreground/25"
                        }`}
                      />
                      <span
                        className={`text-center text-[10px] font-bold leading-tight ${
                          active ? "text-foreground" : done ? "text-success" : "text-muted-foreground"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {customerAcked && (
            <p className="mt-10 text-center text-sm font-semibold text-success">Obrigado! Pedido concluído.</p>
          )}
        </div>
      </div>

      {/* Rodapé fixo */}
      <div
        className="shrink-0 border-t border-border/40 bg-background/95 px-5 pt-4 backdrop-blur-md"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        {activeOrderId && !customerAcked && !isCancelled && (
          <button
            type="button"
            onClick={handleViewOrder}
            className="mb-3 w-full touch-manipulation rounded-[22px] bg-primary py-4 text-[15px] font-black uppercase tracking-wide text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.45)] transition-transform active:scale-[0.98]"
          >
            {t("viewOrder")}
          </button>
        )}

        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            {t("saveImage")}
          </button>
          <span className="h-4 w-px bg-border" aria-hidden />
          <button
            type="button"
            onClick={handleNewOrder}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            {t("newOrder")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
