import { useEffect, useRef, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import { CheckCircle, Clock, RotateCcw, Hash, Store, Utensils, ShoppingBag, User, Phone, Download } from "lucide-react";
import { toPng } from "html-to-image";

const ConfirmationScreen = () => {
  const {
    setScreen, orderNumber, tableNumber, paymentMethod,
    customerName, customerPhone, setTableNumber, setPaymentMethod,
    setCustomerName, setCustomerPhone,
  } = useOrder();
  const { orderType } = useCart();
  const { settings } = useOperationsSettings();
  const { settings: brand } = useBranding();
  const { t } = useLanguage();

  const isCounter = paymentMethod === "counter";
  const isHere = orderType === "here";
  const prepMin = (settings as any)?.avg_prep_minutes ?? 12;
  const cardRef = useRef<HTMLDivElement>(null);
  const [savedAt] = useState(() => new Date());
  const [downloading, setDownloading] = useState(false);

  const message = isCounter
    ? settings?.msg_counter || "Pago pendiente en mostrador"
    : settings?.msg_paid || "Pago confirmado";

  const handleNewOrder = () => {
    setTableNumber("");
    setPaymentMethod(null);
    setCustomerName("");
    setCustomerPhone("");
    setScreen("orderType");
  };

  // Auto reset após 30s
  useEffect(() => {
    const t = setTimeout(handleNewOrder, 60000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#000",
      });
      const link = document.createElement("a");
      link.download = `pedido-${orderNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch (_e) {
      // silencioso
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

  return (
    <div className="h-[100dvh] overflow-hidden bg-background animate-fade-in flex flex-col">
      {/* Card único — tudo cabe em uma tela, sem scroll */}
      <div
        ref={cardRef}
        className="flex-1 flex flex-col gap-2 px-3 pt-3 pb-2 min-h-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        {/* Header marca: logo + nome + data/hora */}
        <div className="flex items-center justify-between gap-3 px-1 shrink-0">
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

        {/* Header verde compacto */}
        <div className="relative rounded-[22px] bg-success text-success-foreground px-4 py-4 text-center shadow-card overflow-hidden shrink-0">
          <div className="pointer-events-none absolute -top-12 -right-8 w-36 h-36 rounded-full bg-white/15 blur-3xl" />
          <div className="relative flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle className="w-7 h-7" strokeWidth={2.4} />
            </div>
            <div className="text-left">
              <p className="text-[9px] uppercase tracking-[0.28em] opacity-90 font-bold leading-tight">
                {t("confirmedEyebrow")}
              </p>
              <h1 className="text-[18px] font-black tracking-tight leading-tight">
                {t("orderReceived")}
              </h1>
            </div>
          </div>
        </div>

        {/* Número grande verde */}
        <div className="relative rounded-[22px] bg-card border-2 border-success/30 px-4 py-3 text-center shadow-card overflow-hidden shrink-0">
          <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground font-bold">
            {t("yourNumber")}
          </p>
          <p className="text-[64px] leading-none font-black text-success mt-1 tabular-nums tracking-tighter">
            #{orderNumber}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
            {t("showAtPickup")}
          </p>
        </div>

        {/* Grid 2 colunas compacto */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {customerName && (
            <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2 shadow-card min-w-0">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-muted-foreground uppercase tracking-[0.18em] font-bold">
                  {t("customerLabel")}
                </p>
                <p className="font-black text-foreground text-[13px] truncate leading-tight">
                  {customerName}
                </p>
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
                <p className="font-black text-foreground text-base tabular-nums leading-tight">
                  {tableNumber}
                </p>
              </div>
            </div>
          )}

          {!isHere && customerPhone && (
            <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2 shadow-card min-w-0">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-muted-foreground uppercase tracking-[0.18em] font-bold">
                  {t("phoneLabel")}
                </p>
                <p className="font-black text-foreground text-[12px] tabular-nums truncate leading-tight">
                  {customerPhone}
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
                {isHere ? t("eatHere") : t("takeaway")}
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

        {/* Status pagamento — destaque */}
        <div
          className={`rounded-xl p-2.5 flex items-center gap-2 border-2 shadow-card shrink-0 ${
            isCounter ? "bg-accent/10 border-accent" : "bg-success/10 border-success"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isCounter ? "bg-accent text-accent-foreground" : "bg-success text-success-foreground"
            }`}
          >
            {isCounter ? <Store className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] text-muted-foreground uppercase tracking-[0.18em] font-bold">
              {t("paymentStatus")}
            </p>
            <p className="font-black text-foreground text-[13px] truncate leading-tight">
              {message}
            </p>
          </div>
        </div>

        {/* Rodapé recibo: marca/endereço */}
        <div className="mt-auto pt-2 border-t border-dashed border-border text-center shrink-0">
          <p className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">
            {companyName || "—"}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
            #{orderNumber} · {dateStr} {timeStr}
          </p>
        </div>
      </div>

      {/* Ações fixas no rodapé */}
      <div className="shrink-0 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-1 flex flex-col gap-2">
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
