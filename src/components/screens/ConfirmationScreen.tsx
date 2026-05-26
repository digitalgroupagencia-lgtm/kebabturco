import { useCallback, useMemo, useRef, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import {
  CheckCircle,
  Clock,
  RotateCcw,
  Hash,
  Store,
  Utensils,
  ShoppingBag,
  User,
  Phone,
  Download,
  MapPin,
  Radio,
  Loader2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { toPng } from "html-to-image";
import { shouldForceDeliveryOnly } from "@/lib/embed-mode";
import {
  canCustomerConfirmReceipt,
  getCustomerTrackingSteps,
  getLiveStatusHeadline,
  getStatusLabel,
} from "@/lib/orderStatusLabels";
import { useOrderTracking, type PublicOrderTrack } from "@/hooks/useOrderTracking";
import { clearStoredActiveOrder } from "@/features/customer/useActiveOrderStorage";
import { hasCustomerAcknowledged, markCustomerAcknowledged } from "@/lib/customerOrderUrl";
import { formatFullPhone } from "@/lib/phoneNumber";

const ConfirmationScreen = () => {
  const {
    setScreen,
    orderNumber,
    tableNumber,
    paymentMethod,
    orderPaymentStatus,
    customerName,
    customerPhone,
    phoneDialCode,
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
  const isHere = orderType === "here";
  const prepMin = (settings as { avg_prep_minutes?: number })?.avg_prep_minutes ?? 12;
  const cardRef = useRef<HTMLDivElement>(null);
  const [savedAt] = useState(() => new Date());
  const [downloading, setDownloading] = useState(false);
  const [liveOrder, setLiveOrder] = useState<PublicOrderTrack | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(!!activeOrderId);
  const [customerAcked, setCustomerAcked] = useState(() =>
    activeOrderId ? hasCustomerAcknowledged(activeOrderId) : false,
  );

  const onLiveOrder = useCallback((o: PublicOrderTrack | null) => setLiveOrder(o), []);
  const onTrackingLoading = useCallback((l: boolean) => setTrackingLoading(l), []);
  useOrderTracking(activeOrderId || null, onLiveOrder, onTrackingLoading);

  const liveStatus = liveOrder?.status || "pending";
  const liveOrderType = liveOrder?.order_type || (orderType === "here" ? "dine_in" : orderType === "delivery" ? "delivery" : "takeaway");
  const displayNumber = liveOrder?.order_number || orderNumber;
  const steps = useMemo(() => getCustomerTrackingSteps(liveOrderType), [liveOrderType]);
  const currentIdx = useMemo(() => {
    const idx = steps.findIndex((s) => s.key === liveStatus);
    if (idx >= 0) return idx;
    if (liveStatus === "cancelled") return -1;
    return 0;
  }, [liveStatus, steps]);

  const showConfirmReceipt =
    !customerAcked &&
    liveOrder &&
    canCustomerConfirmReceipt(liveStatus, liveOrderType);
  const isTerminal =
    liveStatus === "delivered" || liveStatus === "cancelled" || customerAcked;

  const message = isPaidOnline
    ? settings?.msg_paid || "Pago confirmado online"
    : isCounter
      ? settings?.msg_counter || "Pago pendiente en mostrador"
      : isCash
        ? "Pago en efectivo al recoger o recibir"
        : "Pedido registrado — pago pendiente";

  const statusHeadline =
    liveStatus === "pending"
      ? t("orderReceived")
      : getLiveStatusHeadline(liveStatus, liveOrderType);

  const handleNewOrder = () => {
    setTableNumber("");
    setPaymentMethod(null);
    setOrderPaymentStatus("pending");
    setCustomerName("");
    setCustomerPhone("");
    if (activeOrderId && !customerAcked && !isTerminal) {
      setScreen(shouldForceDeliveryOnly() ? "home" : "orderType");
      return;
    }
    clearStoredActiveOrder();
    setActiveOrderId("");
    setTrackingOrderId("");
    setScreen(shouldForceDeliveryOnly() ? "home" : "orderType");
  };

  const handleConfirmReceipt = () => {
    if (!activeOrderId) return;
    markCustomerAcknowledged(activeOrderId);
    setCustomerAcked(true);
    clearStoredActiveOrder();
    setActiveOrderId("");
    setTrackingOrderId("");
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
  const companyName = brand?.company_name || "";

  const bannerClass =
    liveStatus === "preparing"
      ? "bg-amber-500 text-white"
      : liveStatus === "ready" || liveStatus === "delivered"
        ? "bg-success text-success-foreground"
        : liveStatus === "out_for_delivery"
          ? "bg-blue-600 text-white"
          : liveStatus === "cancelled"
            ? "bg-destructive text-destructive-foreground"
            : "bg-success text-success-foreground";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background animate-fade-in">
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ paddingTop: "max(8px, env(safe-area-inset-top))" }}
      >
        <div ref={cardRef} className="flex flex-col gap-1.5 px-3 pt-1 pb-4 max-w-lg mx-auto w-full">
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 min-w-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={companyName}
                  crossOrigin="anonymous"
                  className="h-9 w-auto object-contain"
                />
              ) : (
                <div className="h-9 px-3 rounded-lg bg-primary text-primary-foreground flex items-center font-black text-sm">
                  {companyName || "BRAND"}
                </div>
              )}
              {logoUrl && companyName && (
                <span className="font-black text-foreground text-sm truncate">{companyName}</span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[8px] uppercase tracking-[0.22em] text-muted-foreground font-bold leading-none">
                {t("orderTime")}
              </p>
              <p className="text-[12px] font-black text-foreground tabular-nums leading-tight mt-0.5">
                {dateStr} · {timeStr}
              </p>
            </div>
          </div>

          <div className={`relative rounded-[20px] px-4 py-3 shadow-card overflow-hidden ${bannerClass}`}>
            <div className="pointer-events-none absolute -top-12 -right-8 w-36 h-36 rounded-full bg-white/15 blur-3xl" />
            <div className="relative flex items-center justify-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                {trackingLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" strokeWidth={2.4} />
                ) : (
                  <CheckCircle className="w-6 h-6" strokeWidth={2.4} />
                )}
              </div>
              <div className="text-left">
                <p className="text-[9px] uppercase tracking-[0.28em] opacity-90 font-bold leading-tight">
                  {liveStatus === "pending" ? t("confirmedEyebrow") : "Estado do pedido"}
                </p>
                <h1 className="text-[17px] font-black tracking-tight leading-tight">{statusHeadline}</h1>
              </div>
            </div>
          </div>

          {activeOrderId && !trackingLoading && liveOrder && liveStatus !== "cancelled" && (
            <div className="rounded-[20px] bg-card border border-border px-4 py-3 shadow-card space-y-3">
              <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                <Radio className="h-3 w-3 text-success animate-pulse" />
                Actualização automática · ~1s
              </p>
              <ol className="space-y-0">
                {steps.map((step, i) => {
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  return (
                    <li key={step.key} className="flex gap-3 pb-3 last:pb-0 relative">
                      {i < steps.length - 1 && (
                        <span
                          className={`absolute left-[13px] top-7 w-0.5 h-[calc(100%-4px)] ${done ? "bg-success" : "bg-border"}`}
                        />
                      )}
                      <span
                        className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                          done
                            ? "bg-success text-success-foreground"
                            : active
                              ? "bg-primary text-primary-foreground ring-2 ring-primary/25"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : active ? step.icon : <Circle className="w-3.5 h-3.5" />}
                      </span>
                      <div className="pt-0.5 min-w-0">
                        <p className={`text-sm font-bold leading-tight ${active ? "text-foreground" : done ? "text-success" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                        {active && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {getStatusLabel(liveStatus, liveOrderType)}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="relative rounded-[20px] bg-card border-2 border-success/30 px-4 py-2.5 text-center shadow-card overflow-hidden">
            <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground font-bold">
              {t("yourNumber")}
            </p>
            <p className="text-[42px] sm:text-[48px] leading-none font-black text-success mt-0.5 tabular-nums tracking-tighter">
              #{displayNumber}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
              {t("showAtPickup")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {customerName && (
              <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2 shadow-card min-w-0">
                <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] text-muted-foreground uppercase tracking-[0.18em] font-bold">
                    {t("customerLabel")}
                  </p>
                  <p className="font-black text-foreground text-[13px] truncate leading-tight">{customerName}</p>
                </div>
              </div>
            )}

            {isHere && tableNumber && (
              <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2 shadow-card min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Hash className="w-4 h-4" strokeWidth={2.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] text-muted-foreground uppercase tracking-[0.18em] font-bold">
                    {t("tableLabel")}
                  </p>
                  <p className="font-black text-foreground text-base tabular-nums leading-tight">{tableNumber}</p>
                </div>
              </div>
            )}

            {customerPhone && (
              <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2 shadow-card min-w-0">
                <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] text-muted-foreground uppercase tracking-[0.18em] font-bold">
                    {t("phoneLabel")}
                  </p>
                  <p className="font-black text-foreground text-[12px] tabular-nums truncate leading-tight">
                    {formatFullPhone(phoneDialCode, customerPhone)}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2 shadow-card min-w-0">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                {isHere ? <Utensils className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-muted-foreground uppercase tracking-[0.18em] font-bold">
                  {t("modeLabel")}
                </p>
                <p className="font-black text-foreground text-[13px] leading-tight truncate">
                  {orderType === "here" ? t("eatHere") : orderType === "delivery" ? t("delivery") : t("takeaway")}
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2 shadow-card min-w-0">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-muted-foreground uppercase tracking-[0.18em] font-bold">
                  {t("estTime")}
                </p>
                <p className="font-black text-foreground text-[13px] tabular-nums leading-tight">
                  ~ {prepMin} {t("minutes")}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl p-2.5 flex items-center gap-2 border-2 shadow-card ${
              isPaidOnline
                ? "bg-success/10 border-success"
                : isCounter || isCash
                  ? "bg-accent/10 border-accent"
                  : "bg-secondary border-border"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isPaidOnline
                  ? "bg-success text-success-foreground"
                  : isCounter || isCash
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-foreground"
              }`}
            >
              {isPaidOnline ? <CheckCircle className="w-4 h-4" /> : <Store className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] text-muted-foreground uppercase tracking-[0.18em] font-bold">
                {t("paymentStatus")}
              </p>
              <p className="font-black text-foreground text-[13px] truncate leading-tight">{message}</p>
            </div>
          </div>

          <div className="pt-1 border-t border-dashed border-border text-center">
            <p className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">{companyName || "—"}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
              #{displayNumber} · {dateStr} {timeStr}
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col gap-2 bg-background border-t border-border/60">
        {showConfirmReceipt && (
          <button
            onClick={handleConfirmReceipt}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-success text-success-foreground rounded-2xl text-[14px] font-black active:scale-[0.98] transition-transform touch-action-manipulation uppercase tracking-wide shadow-md"
          >
            <CheckCircle className="w-5 h-5" />
            {liveOrderType === "delivery" ? "Confirmar que recebi a entrega" : "Confirmar que recebi o pedido"}
          </button>
        )}
        {customerAcked && (
          <p className="text-center text-sm font-bold text-success py-2">Obrigado! Pedido concluído.</p>
        )}
        {activeOrderId && !customerAcked && (
          <button
            onClick={() => {
              setTrackingOrderId(activeOrderId);
              setScreen("tracking");
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-2xl text-[14px] font-black active:scale-[0.98] transition-transform touch-action-manipulation uppercase tracking-wide"
          >
            <MapPin className="w-4 h-4" />
            Ver acompanhamento completo
          </button>
        )}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border rounded-2xl text-[12px] font-black text-foreground active:scale-[0.98] transition-transform touch-action-manipulation uppercase tracking-wide disabled:opacity-50"
        >
          <Download className="w-4 h-4" strokeWidth={2.5} />
          {t("saveImage")}
        </button>
        <button
          onClick={handleNewOrder}
          className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-cta text-success-foreground rounded-2xl text-[14px] font-black active:scale-[0.98] transition-transform touch-action-manipulation shadow-cta uppercase tracking-wide"
        >
          <RotateCcw className="w-4 h-4" strokeWidth={3} />
          {t("newOrder")}
        </button>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
