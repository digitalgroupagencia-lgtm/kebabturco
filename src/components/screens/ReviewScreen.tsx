import { useEffect, useMemo, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import QuantitySelector from "@/components/QuantitySelector";
import ScreenHeader from "@/components/ScreenHeader";
import { Trash2, ShoppingCart, Pencil, Plus, ChevronRight, Sparkles, Utensils, ShoppingBag, Bike, ArrowRight } from "lucide-react";
import { useMenuData } from "@/hooks/useMenuData";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { loadSavedOrderType } from "@/lib/customerSession";

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
const CONFIRM_CLEAR: Record<string, string> = {
  pt: "Tem certeza que deseja limpar todo o pedido?",
  en: "Are you sure you want to clear the entire order?",
  es: "¿Seguro que quieres vaciar todo el pedido?",
  fr: "Voulez-vous vraiment vider toute la commande ?",
};

const ReviewScreen = () => {
  const {
    setScreen,
    setSelectedProductId,
    setProductReturnScreen,
    setEditingCartItemId,
    setSelectedCategory,
  } = useOrder();
  const { items, addItem, removeItem, totalPrice, orderType, clearCart, setOrderType } = useCart();

  const { t, tProduct, lang } = useLanguage();
  const { products, categories } = useMenuData();
  const { storeId, selectedStoreId } = useResolvedStore();
  const effectiveStoreId = selectedStoreId ?? storeId;
  const clearLabel = CLEAR_LABEL[lang] || CLEAR_LABEL.es;
  const confirmMsg = CONFIRM_CLEAR[lang] || CONFIRM_CLEAR.es;

  const [suggestionConfig, setSuggestionConfig] = useState<SuggestionConfig | null>(null);

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

  const handleClearAll = () => {
    if (window.confirm(confirmMsg)) clearCart();
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


  return (
    <div className="relative h-[100dvh] md:h-full min-h-0 bg-secondary/20 animate-fade-in flex flex-col overflow-hidden">
      <ScreenHeader
        eyebrow={t("yourOrder")}
        title={t("review")}
        onBack={() => setScreen("home")}
        sticky
      />

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-4 flex flex-col gap-3">
        {/* Tipo de pedido + Mesa */}
        <div className="bg-card rounded-3xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {orderType === "here" ? <Utensils className="w-5 h-5" /> : orderType === "delivery" ? <Bike className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{t("modality")}</p>
              <p className="text-sm font-black text-foreground">
                {orderType === "here" ? t("eatHere") : orderType === "delivery" ? t("delivery") : t("takeaway")}
              </p>
            </div>
          </div>
        </div>

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
                  {item.note && (
                    <p className="text-[11px] text-foreground/80 italic mt-1 bg-warning/10 px-2 py-1 rounded-md border-l-2 border-warning">
                      📝 {item.note}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 px-3 py-2.5 bg-secondary/30 border-t border-border">
                <button
                  onClick={() => handleEdit(item.productId, item.id)}
                  className="flex items-center gap-1.5 text-primary text-[13px] font-black px-3 py-1.5 rounded-full hover:bg-primary/5 active:scale-95 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" /> {t("edit2")}
                </button>
                <button
                  onClick={() => removeItem(item.id)}
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
          <div className="mt-2">
            <div className="flex items-center gap-2 px-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                {sectionTitle}
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddSuggestion(p.id)}
                  className="shrink-0 w-[150px] bg-card border border-border rounded-2xl shadow-card overflow-hidden text-left active:scale-[0.97] transition-transform"
                >
                  <div className="aspect-[5/4] bg-secondary/40">
                    <img
                      src={p.image}
                      alt={tProduct(p.name)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2.5 flex flex-col gap-1.5">
                    <p className="text-[13px] font-bold text-foreground line-clamp-2 leading-tight min-h-[32px] break-words hyphens-auto">
                      {tProduct(p.name).replace(/^\d{1,3}[A-Za-z]?\s*[.\-–—:)]\s*/, "")}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-black text-price tabular-nums">
                        {p.price.toFixed(2)}€
                      </span>
                      <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                        <Plus className="w-4 h-4" strokeWidth={3} />
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {showButton && (
                <button
                  onClick={handleOpenCategory}
                  className="shrink-0 w-[150px] bg-primary/10 border-2 border-dashed border-primary/40 rounded-2xl text-left active:scale-[0.97] transition-transform flex flex-col items-center justify-center gap-2 p-3"
                >
                  <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                    <ArrowRight className="w-5 h-5" strokeWidth={3} />
                  </span>
                  <span className="text-[13px] font-black text-primary text-center leading-tight">
                    {buttonLabel}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* CTA fixo (sticky para respeitar a moldura mobile no desktop) */}
      {items.length > 0 && (
        <div className="shrink-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
          <div className="flex items-end justify-between mb-2.5 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{t("total")}</p>
              <p className="text-[28px] font-black text-price tabular-nums tracking-tight leading-none mt-0.5">
                {totalPrice.toFixed(2)}€
              </p>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground pb-1.5">
              {t("taxesIncluded")}
            </span>
          </div>
          <button
            onClick={() => canCheckout && setScreen("payment")}
            disabled={!canCheckout}
            className="w-full flex items-center justify-between gap-3 py-4 px-5 bg-gradient-cta text-success-foreground rounded-[26px] shadow-cta text-[15px] font-black tracking-wide uppercase active:scale-[0.98] transition-transform touch-action-manipulation disabled:opacity-50 disabled:active:scale-100"
          >
            <span>
              {t("goToPayment")}
            </span>
            <ChevronRight className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewScreen;
