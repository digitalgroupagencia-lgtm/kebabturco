import { useEffect, useMemo, useRef, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ScreenHeader from "@/components/ScreenHeader";
import { Trash2, ShoppingCart, Pencil, Plus, ChevronRight, Sparkles, Utensils, ShoppingBag, Bike, ArrowRight } from "lucide-react";
import { useMenuData } from "@/hooks/useMenuData";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { loadSavedOrderType } from "@/lib/customerSession";
import { configurationSummaryLines } from "@/lib/modifiers/legacyBridge";
import type { CartConfiguration } from "@/lib/modifiers/types";
import InAppConfirmDialog from "@/components/InAppConfirmDialog";
import { TAB_BAR_VISIBLE_SCREENS } from "@/lib/customerBottomBars";

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
  } = useOrder();
  const { items, addItem, removeItem, totalPrice, orderType, clearCart, setOrderType } = useCart();

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
  const canCheckout = items.length > 0 && !!orderType;

  useEffect(() => {
    if (orderType) return;
    const saved = loadSavedOrderType();
    if (saved) setOrderType(saved);
  }, [orderType, setOrderType]);

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
    const drinkCategoryIds = categories
      .filter((category) => /bebida|drink|boisson/i.test(Object.values(category.name).join(" ")))
      .map((category) => category.id);
    const cartCats = new Set(items.map((i) => products.find((p) => p.id === i.productId)?.category));
    const drinks = products.filter((p) => drinkCategoryIds.includes(p.category) && !inCartIds.has(p.id));
    if (!drinkCategoryIds.some((id) => cartCats.has(id)) && drinks.length > 0) {
      return drinks.slice(0, 4);
    }
    return products.filter((p) => p.isBestseller && !inCartIds.has(p.id)).slice(0, 4);
  }, [suggestionConfig, configuredEnabled, configuredIds, products, categories, items, inCartIds]);

  const customTitle = pickLang(suggestionConfig?.title);
  const fallbackTitle = (() => {
    const drinkCategoryIds = categories
      .filter((category) => /bebida|drink|boisson/i.test(Object.values(category.name).join(" ")))
      .map((category) => category.id);
    const cartCats = new Set(items.map((i) => products.find((p) => p.id === i.productId)?.category).filter(Boolean));
    const suggestingDrinks = !drinkCategoryIds.some((id) => cartCats.has(id));
    return suggestingDrinks ? t("addDrink") : t("addMore");
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
  const ModalityIcon = orderType === "here" ? Utensils : orderType === "delivery" ? Bike : ShoppingBag;

  const tabBarVisible = TAB_BAR_VISIBLE_SCREENS.has(screen);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-secondary/20 animate-fade-in">
      <ScreenHeader
        eyebrow={t("yourOrder")}
        title={t("review")}
        onBack={tabBarVisible ? undefined : () => setScreen("home")}
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
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ModalityIcon className="w-5 h-5" />
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
          </div>
        </section>

        {/* Items */}
        <div className="flex flex-col gap-2.5">
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

          {items.map((item) => (
            <article key={item.id} className="bg-card rounded-3xl border border-border shadow-card overflow-hidden">
              <div className="flex gap-3 p-3">
                {item.productImage ? (
                  <img
                    src={item.productImage}
                    alt={tProduct(item.productName)}
                    className="w-20 h-20 object-cover rounded-2xl shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-muted-foreground">
                      {tProduct(item.productName).charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-black text-foreground text-[15px] leading-tight line-clamp-2">
                      {tProduct(item.productName).replace(/^\d{1,3}[A-Za-z]?\s*[.\-–—:)]\s*/, "")}
                    </h3>

                    <span className="text-[16px] font-black text-price tabular-nums shrink-0">
                      {item.totalPrice.toFixed(2)}€
                    </span>
                  </div>
                  {item.sizeName && (
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                      {t("size_label")}: {tProduct(item.sizeName)}
                    </p>
                  )}
                  {item.extras.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.extras.map((e) => (
                        <span
                          key={e.id}
                          className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full"
                        >
                          +{e.quantity}× {tProduct(e.name)}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.removedIngredients.length > 0 && (
                    <p className="text-[11px] text-destructive font-semibold mt-1">
                      {t("without")}: {item.removedIngredients.join(", ")}
                    </p>
                  )}
                  {item.configuration && (
                    <ul className="mt-1.5 space-y-0.5">
                      {configurationSummaryLines(item.configuration as CartConfiguration, tProduct, t("without")).map((line) => (
                        <li key={line} className="text-[11px] text-foreground/80 font-medium">
                          · {line}
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.note && (
                    <p className="text-[11px] text-foreground/80 italic mt-1 bg-warning/10 px-2 py-1 rounded-md border-l-2 border-warning">
                      📝 {item.note}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 px-3 py-2 bg-secondary/30 border-t border-border">
                <button
                  onClick={() => handleEdit(item.productId, item.id)}
                  className="flex items-center gap-1.5 text-primary text-[13px] font-black px-3 py-1.5 rounded-full hover:bg-primary/5 active:scale-95 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" /> {t("edit2")}
                </button>
                <button
                  onClick={() => setRemoveItemId(item.id)}
                  className="flex items-center gap-1.5 text-destructive text-[13px] font-black px-3 py-1.5 rounded-full hover:bg-destructive/5 active:scale-95 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t("remove2")}
                </button>
              </div>
            </article>
          ))}

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
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-0.5">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddSuggestion(p.id)}
                  className="shrink-0 w-[108px] bg-card border border-border rounded-xl shadow-card overflow-hidden text-left active:scale-[0.97] transition-transform"
                >
                  <div className="h-[52px] bg-secondary/40 overflow-hidden">
                    <img
                      src={p.image}
                      alt={tProduct(p.name)}
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                    />
                  </div>
                  <div className="px-2 py-1.5 flex flex-col gap-1">
                    <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-snug break-words hyphens-auto">
                      {tProduct(p.name).replace(/^\d{1,3}[A-Za-z]?\s*[.\-–—:)]\s*/, "")}
                    </p>

                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[12px] font-black text-price tabular-nums">
                        {p.price.toFixed(2)}€
                      </span>
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                      </span>
                    </div>
                  </div>
                </button>
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

      {/* Checkout compacto — acima da tab bar */}
      {items.length > 0 && (
        <div className="shrink-0 z-40 border-t border-border/70 bg-background/98 backdrop-blur-md px-4 pt-2 pb-2 shadow-[0_-6px_20px_-16px_rgba(0,0,0,0.18)]">
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

          <button
            onClick={() => canCheckout && setScreen("payment")}
            disabled={!canCheckout}
            className="flex w-full touch-action-manipulation items-center justify-between gap-2 rounded-2xl bg-gradient-cta px-4 py-2.5 text-[14px] font-black uppercase tracking-wide text-success-foreground shadow-cta transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            <span>{t("goToPayment")}</span>
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
            ? `${t("confirmRemoveItem")} (${tProduct(pendingRemoveItem.productName).replace(/^\d{1,3}[A-Za-z]?\s*[.\-–—:)]\s*/, "")})`
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
