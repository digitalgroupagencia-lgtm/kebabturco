import { useMemo, useState, useCallback, useEffect } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { getCustomerTrackingSteps } from "@/lib/orderStatusLabels";
import { customerTrackingStepIndex } from "@/lib/orderOperationalFlow";
import { useOrderTracking, type PublicOrderTrack } from "@/hooks/useOrderTracking";
import { useCustomerOrderNotifications } from "@/hooks/useCustomerOrderNotifications";
import ScreenHeader from "@/components/ScreenHeader";
import { TAB_BAR_VISIBLE_SCREENS } from "@/lib/customerBottomBars";
import { Loader2, CheckCircle2, Circle, Radio, EyeOff } from "lucide-react";
import OrderReviewForm from "@/customer/components/OrderReviewForm";
import OrderDelaySupportBanner from "@/customer/components/OrderDelaySupportBanner";
import OrderWaitFeedbackHost from "@/customer/components/OrderWaitFeedbackHost";
import DeliveryTrackingMap from "@/components/customer/DeliveryTrackingMap";
import OrderSupportChat from "@/components/customer/OrderSupportChat";
import { useDriverLocationForOrder } from "@/hooks/useDriverLocationForOrder";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { clearStoredActiveOrder } from "@/customer/active-order/useActiveOrderStorage";
import { Button } from "@/components/ui/button";

const OrderTrackingScreen = () => {
  const { trackingOrderId, setScreen, orderNumber, screen, setActiveOrderId, setTrackingOrderId } = useOrder();
  const { t } = useLanguage();
  const { settings } = useOperationsSettings();
  const [order, setOrder] = useState<PublicOrderTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { storeId } = useResolvedStore();

  const orderId =
    trackingOrderId ||
    (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("order") : null);

  const handleOrder = useCallback((o: PublicOrderTrack | null) => setOrder(o), []);
  const handleLoading = useCallback((l: boolean) => setLoading(l), []);

  useOrderTracking(orderId, handleOrder, handleLoading);
  useCustomerOrderNotifications(order);

  const driverLocation = useDriverLocationForOrder(
    orderId,
    order?.status === "out_for_delivery" && order?.order_type === "delivery",
  );

  const steps = useMemo(() => getCustomerTrackingSteps(order?.order_type, t), [order?.order_type, t]);

  const currentIdx = useMemo(() => {
    if (!order) return 0;
    return customerTrackingStepIndex(order.status);
  }, [order]);

  const prepMin = (settings as { avg_prep_minutes?: number })?.avg_prep_minutes ?? 12;

  if (!orderId) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">{t("orderNotFound")}</p>
        <button onClick={() => setScreen("home")} className="mt-4 text-primary font-bold">
          {t("backToMenu")}
        </button>
      </div>
    );
  }

  const tabBarVisible = TAB_BAR_VISIBLE_SCREENS.has(screen);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background animate-fade-in">
      <OrderWaitFeedbackHost
        orderId={orderId}
        orderStatus={order?.status}
        orderNumber={order?.order_number}
      />
      <ScreenHeader
        eyebrow={t("menu")}
        title={`${t("orderNumber")} #${order?.order_number || orderNumber || "..."}`}
        onBack={tabBarVisible ? undefined : () => setScreen("home")}
        sticky
      />

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 pb-24 space-y-6">
        {!loading && order && (
          <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <Radio className="h-3 w-3 text-success animate-pulse" />
            {t("trackingAutoUpdate")}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin w-8 h-8 text-primary" />
          </div>
        ) : !order ? (
          <p className="text-center text-muted-foreground">{t("orderNotFound")}</p>
        ) : (
          <>
            {order.status === "cancelled" ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
                <p className="text-lg font-black text-destructive">{t("orderCancelled")}</p>
              </div>
            ) : order.status === "delivered" ? (
              <>
                <div className="rounded-2xl border border-success/40 bg-success/10 p-6 text-center space-y-2">
                  <p className="text-4xl">🎉</p>
                  <p className="text-lg font-black text-success">
                    {t(
                      order.order_type === "takeaway"
                        ? "customerStatusCollected"
                        : order.order_type === "dine_in"
                          ? "customerStatusServed"
                          : "customerStatusDelivered",
                    )}
                  </p>
                </div>
                <OrderReviewForm orderId={order.id} />
              </>
            ) : (
              <>
                <OrderDelaySupportBanner
                  orderId={order.id}
                  storeId={storeId ?? undefined}
                  status={order.status}
                  createdAt={order.created_at}
                  orderNumber={order.order_number}
                  customerPhone={undefined}
                />

                {(() => {
                  const ageMs = now - new Date(order.created_at).getTime();
                  const TWO_HOURS = 2 * 60 * 60 * 1000;
                  if (ageMs < TWO_HOURS) return null;
                  return (
                    <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Já passou mais de 2 horas. Se já recebeu o seu pedido ou já resolveu com o restaurante, pode marcar como resolvido para esconder este acompanhamento.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 font-bold"
                        onClick={() => {
                          clearStoredActiveOrder();
                          setActiveOrderId("");
                          setTrackingOrderId("");
                          setScreen("home");
                        }}
                      >
                        <EyeOff className="h-4 w-4" />
                        Marcar como resolvido
                      </Button>
                    </div>
                  );
                })()}

                <div className="text-center space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    {t("trackingCurrentStatus")}
                  </p>
                  <p className="text-2xl font-black text-foreground">
                    {steps[currentIdx]?.icon} {steps[currentIdx]?.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("trackingEstimatedTime").replace("{n}", String(prepMin))}
                    {order.estimated_ready_at && (
                      <>
                        {" "}
                        · {t("trackingReadyAt")}
                        {new Date(order.estimated_ready_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </>
                    )}
                  </p>
                </div>

                {order.status === "out_for_delivery" && order.order_type === "delivery" && (
                  <DeliveryTrackingMap
                    driverLocation={driverLocation}
                    addressLabel={[order.delivery_street, order.delivery_city].filter(Boolean).join(", ")}
                  />
                )}

                {order.status === "out_for_delivery" && order.assigned_driver_name && (
                  <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      {t("trackingDriver")}
                    </p>
                    <p className="text-lg font-black">{order.assigned_driver_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t("trackingOutForDelivery")}</p>
                  </div>
                )}

                {order.delivery_confirmation_code &&
                  (order.status === "ready" || order.status === "out_for_delivery") && (
                    <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5 text-center space-y-2">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                        {t("trackingDeliveryCode")}
                      </p>
                      <p className="text-4xl font-black tracking-[0.3em] tabular-nums text-orange-600">
                        {order.delivery_confirmation_code}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("trackingShowCode")}</p>
                    </div>
                  )}

                <ol className="space-y-0 relative">
                  {steps.map((step, i) => {
                    const done = i < currentIdx;
                    const active = i === currentIdx;
                    return (
                      <li key={step.key} className="flex gap-4 pb-6 last:pb-0 relative">
                        {i < steps.length - 1 && (
                          <span
                            className={`absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)] ${done ? "bg-success" : "bg-border"}`}
                          />
                        )}
                        <span
                          className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            done
                              ? "bg-success text-success-foreground"
                              : active
                                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : active ? (
                            <span className="text-sm">{step.icon}</span>
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </span>
                        <div className="pt-1">
                          <p
                            className={`font-bold ${active ? "text-foreground" : done ? "text-success" : "text-muted-foreground"}`}
                          >
                            {step.label}
                          </p>
                          {active && (
                            <p className="text-xs text-muted-foreground mt-0.5">{t("trackingInProgress")}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {order.status !== "cancelled" &&
              order.status !== "delivered" &&
              (order.status === "ready" || order.status === "out_for_delivery") && (
                <OrderReviewForm orderId={order.id} />
              )}

            {order.delivery_street && (
              <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                <p className="font-bold text-muted-foreground text-xs uppercase mb-1">{t("trackingDeliveryTo")}</p>
                <p>
                  {order.delivery_street}
                  {order.delivery_city ? `, ${order.delivery_city}` : ""}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-4 flex justify-between items-center">
              <span className="font-bold">{t("total")}</span>
              <span className="text-xl font-black text-price tabular-nums">
                {Number(order.total).toFixed(2)}€
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingScreen;
