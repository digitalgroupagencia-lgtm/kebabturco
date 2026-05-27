import { useCallback, useEffect, useState } from "react";
import { Banknote, Loader2, Store } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrderTracking, type PublicOrderTrack } from "@/hooks/useOrderTracking";
import { syncActiveOrderUrl } from "@/lib/customerOrderUrl";

const CashPendingScreen = () => {
  const {
    activeOrderId,
    orderNumber,
    setScreen,
    setOrderPaymentStatus,
    setTrackingOrderId,
  } = useOrder();
  const { t } = useLanguage();
  const [order, setOrder] = useState<PublicOrderTrack | null>(null);
  const [loading, setLoading] = useState(true);

  const onOrder = useCallback((next: PublicOrderTrack | null) => setOrder(next), []);
  useOrderTracking(activeOrderId || null, onOrder, setLoading);

  useEffect(() => {
    if (!activeOrderId) {
      setScreen("home");
      return;
    }
    syncActiveOrderUrl(activeOrderId, "cashPending");
    setTrackingOrderId(activeOrderId);
  }, [activeOrderId, setScreen, setTrackingOrderId]);

  useEffect(() => {
    if (order?.payment_status !== "paid") return;
    setOrderPaymentStatus("paid");
    syncActiveOrderUrl(order.id, "confirmation");
    setScreen("confirmation");
  }, [order?.payment_status, order?.id, setOrderPaymentStatus, setScreen]);

  const displayNumber = order?.order_number || orderNumber;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background animate-fade-in">
      <div
        className="flex flex-1 min-h-0 flex-col items-center justify-center px-6 text-center"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <div className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-amber-500/15">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-amber-500 text-white">
            <Banknote className="h-7 w-7" strokeWidth={2.2} />
          </div>
        </div>

        <h1 className="text-[26px] font-black tracking-tight text-foreground leading-tight">
          {t("cashPendingTitle")}
        </h1>
        <p className="mt-3 max-w-[300px] text-[15px] leading-relaxed text-muted-foreground">
          {t("cashPendingBody")}
        </p>

        <div className="mt-8 flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-3 text-left">
          <Store className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm font-semibold text-foreground">{t("cashPendingHint")}</p>
        </div>

        {displayNumber ? (
          <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            {t("cashPendingReference")}
          </p>
        ) : null}
        {displayNumber ? (
          <p className="mt-1 text-[40px] font-black tabular-nums leading-none text-foreground">#{displayNumber}</p>
        ) : null}

        <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
          <span>{t("cashPendingWaiting")}</span>
        </div>
      </div>
    </div>
  );
};

export default CashPendingScreen;
