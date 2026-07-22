import { useEffect, useMemo, useRef, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/customer/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ScreenHeader from "@/components/ScreenHeader";
import OrderTypeIcon from "@/components/OrderTypeIcon";
import UpsellProductCard from "@/customer/customization/UpsellProductCard";
import ReviewCartItemCard from "@/customer/review/ReviewCartItemCard";
import { Trash2, ShoppingCart, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { useMenuData } from "@/hooks/useMenuData";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { loadSavedOrderType } from "@/lib/customerSession";
import { configurationSummaryLines } from "@/lib/modifiers/legacyBridge";
import type { CartConfiguration } from "@/lib/modifiers/types";
import InAppConfirmDialog from "@/components/InAppConfirmDialog";
import { CUSTOMER_ACTION_FOOTER_PAD_CLASS } from "@/lib/storefrontFooter";
import { listCustomerDrinkProducts } from "@/lib/menuDrinkCatalog";
import { isCustomerMenuDrink } from "@/lib/modifiers/drinkProduct";

type LangMap = Record<string, string>;
type SuggestionConfig = {
  enabled: boolean;
  title: LangMap;
  product_ids: string[];
  button: { enabled: boolean; label: LangMap; category_id: string | null };
};

const CLEAR_LABEL: Record<string, string> = {
  pt: "Limpar pedido",
  en: "Clear order",
  es: "Vaciar pedido",
  fr: "Vider la commande",
};

const ReviewScreen = () => {
  const {
    screen,
    setScreen,
    setSelectedProductId,
    setProductReturnScreen,
    setEditingCartItemId,
    setSelectedCategory,
    tableNumber,
    mesaTableId,
    clearMesaLock,
  } = useOrder();
  const { items, addItem, removeItem, totalPrice, orderType, clearCart, setOrderType, clearOrderType } = useCart();

  const { t, tProduct, lang } = useLanguage();
  const { products, categories } = useMenuData();
  const { storeId, selectedStoreId } = useResolvedStore();
  const effectiveStoreId = selectedStoreId ?? storeId;
  const clearLabel = CLEAR_LABEL[lang] || CLEAR_LABEL.es;

  const [suggestionConfig, setSuggestionConfig] = useState<SuggestionConfig | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!effectiveStoreId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("totem_config")
        .select("screen_config")
        .eq("store_id", effectiveStoreId)
        .maybeSingle();
      if (!active) return;
      const sc = ((data as any)?.screen_config || {}) as any;
      const rs = sc.review_suggestion;
      if (rs) setSuggestionConfig(rs as SuggestionConfig);
      else setSuggestionConfig(null);
    })();
    return () => { active = false; };
  }, [effectiveStoreId]);

  const handleClearAll = () => setClearDialogOpen(true);

  const confirmClearAll = () => {
    clearCart();
    setClearDialogOpen(false);
  };

  const pendingRemoveItem = removeItemId ? items.find((i) => i.id === removeItemId) : null;

  const confirmRemoveFromCart = () => {
    if (removeItemId) removeItem(removeItemId);
    setRemoveItemId(null);
  };
  const needsMesa =
    orderType === "here" && !mesaTableId && !tableNumber.trim();
  const canCheckout =
    items.length > 0 && !!orderType && !needsMesa;
  const checkoutHint = !orderType
    ? t("checkoutNeedOrderType")
    : needsMesa
      ? t("checkoutNeedMesa")
      : null;

  useEffect(() => {
    if (orderType) return;
    const saved = loadSavedOrderType();
    if (saved) setOrderType(saved);
  }, [orderType, setOrderType]);

  const handleGoToPayment = () => {
    if (!orderType || needsMesa) {
      setScreen("orderType");
      return;
    }
    setScreen("payment");
  };

  const pickLang = (m?: LangMap) => (m && (m[lang] || m.es || m.pt || m.en || m.fr)) || "";

  // Sugestões configuráveis no painel admin (fallback: heurística antiga de bebidas)
  const inCartIds = useMemo(() => new Set(items.map((i) => i.productId)), [items]);

  const configuredEnabled = suggestionConfig?.enabled !== false;
  const configuredIds = suggestionConfig?.product_ids || [];

  const suggestions = useMemo(() => {
    if (suggestionConfig && configuredEnabled && configuredIds.length > 0) {
      const byId = new Map(products.map((p) => [p.id, p]));
      return configuredIds
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && !inCartIds.has(p!.id));
    }
    // Fallback antigo
    const cartHasDrink = items.some((i) => {
      const p = products.find((pr) => pr.id === i.productId);
      return isCustomerMenuDrink(p);
    });
    const drinks = listCustomerDrinkProducts(products).filter((p) => !inCartIds.has(p.id));
    if (!cartHasDrink && drinks.length > 0) {
      return drinks;
    }
    return products.filter((p) => p.isBestseller && !inCartIds.has(p.id)).slice(0, 8);
  }, [suggestionConfig, configuredEnabled, configuredIds, products, categories, items, inCartIds]);

  const customTitle = pickLang(suggestionConfig?.title);
  const fallbackTitle = (() => {
    const cartHasDrink = items.some((i) => {
      const p = products.find((pr) => pr.id === i.productId);
      return isCustomerMenuDrink(p);
    });
    return !cartHasDrink ? t("addDrink") : t("addMore");
  })();
  const sectionTitle = customTitle || fallbackTitle;

  const buttonCfg = suggestionConfig?.button;
  const buttonLabel = pickLang(buttonCfg?.label);
  const showButton = Boolean(
    configuredEnabled && buttonCfg?.enabled && buttonCfg?.category_id && buttonLabel
  );

  const handleEdit = (productId: string, itemId: string) => {
    setEditingCartItemId(itemId);
    setSelectedProductId(productId);
    setProductReturnScreen("review");
    setScreen("product");
  };

  const handleAddSuggestion = (productId: string) => {
    setEditingCartItemId(null);
    setSelectedProductId(productId);
    setProductReturnScreen("review");
    setScreen("product");
  };

  const handleOpenCategory = () => {
    if (!buttonCfg?.category_id) return;
    setSelectedCategory(buttonCfg.category_id);
    setScreen("home");
  };


  const modalityLabel =
    orderType === "here" ? t("eatHere") : orderType === "delivery" ? t("delivery") : t("takeaway");

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background animate-fade-in">
      <ScreenHeader
        eyebrow={t("yourOrder")}
        title={t("review")}
        onBack={() => setScreen("home")}
        sticky
      />

      <div
        ref={scrollRef}
        className="relative z-0 flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-pt-4"
        style={items.length > 0 ? { paddingBottom: "max(4px, env(safe-area-inset-bottom, 0px))" } : undefined}
      >
        <div className="px-4 pt-3 pb-2 flex flex-col gap-3">
        {/* Tipo de pedido + Mesa */}
        <section className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center">
              {orderType && (
                <OrderTypeIcon
                  type={orderType}
                  imgClassName="h-14 w-14 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)]"
                  iconClassName="h-10 w-10 text-foreground/70"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                {t("modality")}
              </p>
              <p className="text-base font-black text-foreground leading-tight mt-0.5">
                {modalityLabel}
              </p>
              {orderType === "here" && tableNumber ? (
                <p className="text-xs font-semibold text-muted-foreground mt-1">
                  {t("tableLabel")} {tableNumber}
                </p>
              ) : orderType === "takeaway" ? (
                <p className="text-xs font-semibold text-muted-foreground mt-1">{t("takeawaySub")}</p>
              ) : orderType === "delivery" ? (
                <p className="text-xs font-semibold text-muted-foreground mt-1">{t("deliverySub")}</p>
              ) : null}
            </div>
            {orderType && (
              <button
                type="button"
                onClick={() => {
                  if (orderType === "here") clearMesaLock();
                  else clearOrderType();
                  setScreen("orderType");
                }}
                aria-label={t("changeModality") || "Cambiar modalidad"}
                className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </section>


        {/* Items */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{t("yourProducts")}</p>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                {items.length} {items.length === 1 ? t("oneItem") : t("items")}
              </span>
              {items.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-destructive hover:bg-destructive/10 active:scale-95 px-2.5 py-1 rounded-full transition-all"
                >
                  <Trash2 className="w-3 h-3" /> {clearLabel}
                </button>
              )}
            </div>
          </div>

          {items.map((item, index) => {
            const cleanName = tProduct(item.productName).replace(
              /^\d{1,3}[A-Za-z]?\s*[.\-–, :)]\s*/,
              "",
            );
            const configLines = item.configuration
              ? configurationSummaryLines(item.configuration as CartConfiguration, tProduct, t("without"))
              : [];
            const extraBits = [
              item.sizeName ? `${t("size_label")}: ${tProduct(item.sizeName)}` : null,
              ...item.extras.map((e) => `+${e.quantity}× ${tProduct(e.name)}`),
              item.removedIngredients.length > 0
                ? `${t("without")}: ${item.removedIngredients.map((label) => tProduct(label)).join(", ")}`
                : null,
              ...configLines,
              item.note?.trim() ? item.note.trim() : null,
            ].filter(Boolean) as string[];
            const description = extraBits.length > 0 ? extraBits.join(" · ") : null;

            return (
              <ReviewCartItemCard
                key={item.id}
                layout={items.length === 1 ? "single" : "multi"}
                name={cleanName}
                priceLabel={`${item.totalPrice.toFixed(2)}€`}
                imageUrl={item.productImage}
                description={description}
                editLabel={t("edit2")}
                removeLabel={t("remove2")}
                editAriaLabel={`${t("edit2")} ${cleanName}`}
                removeAriaLabel={`${t("remove2")} ${cleanName}`}
                onEdit={() => handleEdit(item.productId, item.id)}
                onRemove={() => setRemoveItemId(item.id)}
                priorityImage={index === 0}
              />
            );
          })}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-3xl border border-border">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-40" />
              <span className="text-base font-semibold">{t("emptyCart")}</span>
              <button
                onClick={() => setScreen("home")}
                className="mt-4 text-sm font-black text-primary px-4 py-2 rounded-full bg-primary/10"
              >
                {t("viewMenu")}
              </button>
            </div>
          )}
        </div>

        {/* Sugestões */}
        {items.length > 0 && (suggestions.length > 0 || showButton) && (
          <div className="mt-1">
            <div className="flex items-center gap-1.5 px-1 mb-1.5">
              <Sparkles className="w-3 h-3 text-accent" />
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {sectionTitle}
              </p>
            </div>
            <div className="flex flex-nowrap gap-3 overflow-x-auto overscroll-x-contain no-scrollbar -mx-4 px-4 pb-1 snap-x snap-mandatory touch-pan-x">
              {suggestions.map((p) => (
                <UpsellProductCard
                  key={p.id}
                  product={p}
                  menuProducts={products}
                  onClick={() => handleAddSuggestion(p.id)}
                  className="snap-start"
                />
              ))}

              {showButton && (
                <button
                  onClick={handleOpenCategory}
                  className="shrink-0 w-[108px] min-h-[96px] bg-primary/10 border border-dashed border-primary/35 rounded-xl text-left active:scale-[0.97] transition-transform flex flex-col items-center justify-center gap-1.5 p-2"
                >
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <ArrowRight className="w-4 h-4" strokeWidth={3} />
                  </span>
                  <span className="text-[11px] font-black text-primary text-center leading-tight line-clamp-2">
                    {buttonLabel}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        </div>
      </div>

      {/* Checkout compacto, acima da tab bar */}
      {items.length > 0 && (
        <div className={`shrink-0 z-40 border-t border-border/70 bg-card px-4 pt-2 shadow-[0_-6px_20px_-16px_rgba(0,0,0,0.18)] ${CUSTOMER_ACTION_FOOTER_PAD_CLASS}`}>
          <button
            type="button"
            onClick={() => setScreen("home")}
            className="mb-1.5 w-full text-center text-[12px] font-bold text-primary underline-offset-2 hover:underline active:opacity-70 touch-action-manipulation"
          >
            {t("addMoreItems")}
          </button>

          <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {t("total")}
              </span>
              <span className="text-[22px] font-black leading-none text-price tabular-nums tracking-tight">
                {totalPrice.toFixed(2)}€
              </span>
            </div>
            <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
              {t("taxesIncluded")}
            </span>
          </div>

          {checkoutHint ? (
            <p className="mb-2 rounded-xl bg-amber-500/10 px-3 py-2 text-center text-[11px] font-semibold text-amber-800 dark:text-amber-200">
              {checkoutHint}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleGoToPayment}
            className={`flex w-full touch-action-manipulation items-center justify-between gap-2 rounded-2xl bg-gradient-cta px-4 py-2.5 text-[14px] font-black uppercase tracking-wide text-success-foreground shadow-cta transition-transform active:scale-[0.98] ${
              canCheckout ? "" : "opacity-95"
            }`}
          >
            <span>{canCheckout ? t("goToPayment") : orderType ? t("checkoutNeedMesa") : t("startOrder")}</span>
            <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={3} />
          </button>
        </div>
      )}
      <InAppConfirmDialog
        open={clearDialogOpen}
        title={t("confirmClearTitle")}
        description={t("confirmClear")}
        confirmLabel={t("yes")}
        cancelLabel={t("cancelBtn")}
        onConfirm={confirmClearAll}
        onCancel={() => setClearDialogOpen(false)}
      />
      <InAppConfirmDialog
        open={Boolean(removeItemId)}
        title={t("confirmRemoveTitle")}
        description={
          pendingRemoveItem
            ? `${t("confirmRemoveItem")} (${tProduct(pendingRemoveItem.productName).replace(/^\d{1,3}[A-Za-z]?\s*[.\-–, :)]\s*/, "")})`
            : t("confirmRemoveItem")
        }
        confirmLabel={t("remove2")}
        cancelLabel={t("cancelBtn")}
        onConfirm={confirmRemoveFromCart}
        onCancel={() => setRemoveItemId(null)}
      />
    </div>
  );
};

export default ReviewScreen;
