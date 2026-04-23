import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { products, type Extra, type Size, type Variant } from "@/data/products";
import QuantitySelector from "@/components/QuantitySelector";
import ScreenHeader from "@/components/ScreenHeader";
import { emojiFor } from "@/lib/foodEmojis";

const ingredientMap: Record<string, string[]> = {
  "pita-kebab": ["Lechuga", "Col", "Tomate", "Pepino", "Cebolla", "Maíz", "Zanahoria", "Salsas"],
  "rollo-kebab": ["Lechuga", "Col", "Tomate", "Pepino", "Cebolla", "Maíz", "Zanahoria", "Salsas"],
  "rollo-casero": ["Lechuga", "Col", "Tomate", "Pepino", "Cebolla", "Maíz", "Zanahoria", "Salsas"],
  platos: ["Lechuga", "Cebolla", "Tomate", "Col", "Zanahoria", "Maíz", "Pepino", "Salsa"],
  hamburguesas: ["Lechuga", "Tomate", "Cebolla", "Salsa"],
  ensaladas: ["Lechuga", "Tomate", "Cebolla"],
  box: ["Salsa"],
  pizzas: ["Orégano", "Queso", "Tomate"],
  menus: ["Lechuga", "Tomate", "Cebolla", "Salsa"],
  "taco-french": ["Lechuga", "Tomate", "Cebolla", "Salsa"],
  bowl: ["Cebolla crujiente", "Salsa"],
};

const extrasByCategory: Record<string, { id: string; name: Record<string, string>; price: number }[]> = {
  pizzas: [
    { id: "queso", name: { es: "Queso extra", en: "Extra cheese", pt: "Queijo extra", fr: "Fromage extra" }, price: 1.5 },
    { id: "bacon", name: { es: "Bacon", en: "Bacon", pt: "Bacon", fr: "Bacon" }, price: 1.5 },
    { id: "champinones", name: { es: "Champiñones", en: "Mushrooms", pt: "Cogumelos", fr: "Champignons" }, price: 1.0 },
    { id: "jamon", name: { es: "Jamón", en: "Ham", pt: "Presunto", fr: "Jambon" }, price: 1.5 },
    { id: "pepperoni", name: { es: "Pepperoni", en: "Pepperoni", pt: "Pepperoni", fr: "Pepperoni" }, price: 1.5 },
    { id: "atun", name: { es: "Atún", en: "Tuna", pt: "Atum", fr: "Thon" }, price: 1.5 },
    { id: "aceitunas", name: { es: "Aceitunas", en: "Olives", pt: "Azeitonas", fr: "Olives" }, price: 1.0 },
  ],
  "pita-kebab": [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
    { id: "carne-extra", name: { es: "Carne extra", en: "Extra meat", pt: "Carne extra", fr: "Viande extra" }, price: 2.0 },
    { id: "patatas", name: { es: "Patatas dentro", en: "Fries inside", pt: "Batatas", fr: "Frites" }, price: 1.0 },
  ],
  "rollo-kebab": [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
    { id: "carne-extra", name: { es: "Carne extra", en: "Extra meat", pt: "Carne extra", fr: "Viande extra" }, price: 2.0 },
    { id: "patatas", name: { es: "Patatas dentro", en: "Fries inside", pt: "Batatas", fr: "Frites" }, price: 1.0 },
  ],
  "rollo-casero": [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
    { id: "carne-extra", name: { es: "Carne extra", en: "Extra meat", pt: "Carne extra", fr: "Viande extra" }, price: 2.0 },
  ],
  platos: [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
    { id: "carne-extra", name: { es: "Carne extra", en: "Extra meat", pt: "Carne extra", fr: "Viande extra" }, price: 2.0 },
  ],
  hamburguesas: [
    { id: "queso", name: { es: "Queso extra", en: "Extra cheese", pt: "Queijo extra", fr: "Fromage extra" }, price: 1.0 },
    { id: "bacon", name: { es: "Bacon", en: "Bacon", pt: "Bacon", fr: "Bacon" }, price: 1.0 },
    { id: "huevo", name: { es: "Huevo", en: "Egg", pt: "Ovo", fr: "Œuf" }, price: 1.0 },
  ],
  menus: [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
    { id: "carne-extra", name: { es: "Carne extra", en: "Extra meat", pt: "Carne extra", fr: "Viande extra" }, price: 2.0 },
  ],
  ensaladas: [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
    { id: "pollo", name: { es: "Pollo", en: "Chicken", pt: "Frango", fr: "Poulet" }, price: 2.0 },
  ],
  box: [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
  ],
  "taco-french": [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
    { id: "bacon", name: { es: "Bacon", en: "Bacon", pt: "Bacon", fr: "Bacon" }, price: 1.0 },
  ],
  bowl: [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
    { id: "bacon", name: { es: "Bacon", en: "Bacon", pt: "Bacon", fr: "Bacon" }, price: 1.0 },
  ],
};

const ProductScreen = () => {
  const { selectedProductId, setScreen, productReturnScreen, setProductReturnScreen } = useOrder();

  const goBack = () => {
    const target = productReturnScreen;
    setProductReturnScreen("home");
    setScreen(target);
  };
  const { addItem } = useCart();
  const { t, tProduct } = useLanguage();

  const product = products.find((item) => item.id === selectedProductId);
  const ingredientOptions = useMemo(
    () => (product ? ingredientMap[product.category] || [] : []),
    [product],
  );
  const availableExtras = useMemo(
    () => product?.extras ?? (product ? extrasByCategory[product.category] || [] : []),
    [product],
  );

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<Size | undefined>(undefined);
  const [selectedVariant, setSelectedVariant] = useState<Variant | undefined>(undefined);
  const [extras, setExtras] = useState<Map<string, number>>(new Map());
  const [ingredients, setIngredients] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!product) return;
    setQuantity(1);
    setSelectedSize(product.sizes?.[0]);
    setSelectedVariant(product.variants?.[0]);
    setExtras(new Map());
    setIngredients(new Map(ingredientOptions.map((ingredient) => [ingredient, true])));
  }, [product, ingredientOptions]);

  if (!product) return null;

  const toggleExtra = (extra: Extra, qty: number) => {
    const next = new Map(extras);
    if (qty <= 0) next.delete(extra.id);
    else next.set(extra.id, qty);
    setExtras(next);
  };

  const extrasTotal = Array.from(extras.entries()).reduce((sum, [id, qty]) => {
    const extra = availableExtras.find((item) => item.id === id);
    return sum + (extra ? extra.price * qty : 0);
  }, 0);

  const unitPrice = product.price + (selectedSize?.priceAdd || 0) + extrasTotal;
  const totalPrice = unitPrice * quantity;
  const removedIngredients = Array.from(ingredients.entries())
    .filter(([, included]) => !included)
    .map(([name]) => name);

  const handleAdd = () => {
    const selectedExtras = Array.from(extras.entries())
      .map(([id, qty]) => {
        const extra = availableExtras.find((item) => item.id === id);
        if (!extra) return null;
        return {
          id: extra.id,
          name: extra.name,
          price: extra.price,
          quantity: qty,
        };
      })
      .filter(Boolean) as { id: string; name: Record<string, string>; price: number; quantity: number }[];

    const variantSuffix = selectedVariant ? ` (${selectedVariant.name.es || selectedVariant.name.en})` : "";
    const finalName = selectedVariant
      ? Object.fromEntries(Object.entries(product.name).map(([k, v]) => [k, v + variantSuffix])) as Record<string, string>
      : product.name;

    addItem({
      productId: product.id,
      productName: finalName,
      productImage: product.image,
      basePrice: product.price,
      quantity,
      sizeName: selectedSize?.name || null,
      sizeAdd: selectedSize?.priceAdd || 0,
      extras: selectedExtras,
      removedIngredients,
      unitPrice,
      totalPrice,
    });

    goBack();
  };

  return (
    <div className="relative min-h-[100dvh] bg-background animate-fade-in pb-[126px]">
      <ScreenHeader
        eyebrow={t("menu")}
        title={tProduct(product.name)}
        onBack={goBack}
        sticky
      />

      <div className="px-4 pt-4 space-y-5">
        <section className="rounded-[28px] overflow-hidden border border-border/70 bg-card shadow-card">
          <div className="aspect-square bg-secondary/40">
            <img src={product.image} alt={tProduct(product.name)} className="w-full h-full object-cover rounded-[24px]" />
          </div>
        </section>

        <section className="space-y-2">
          <h1 className="text-[30px] leading-[1.02] font-black text-foreground">{tProduct(product.name)}</h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">{tProduct(product.description)}</p>
          <p className="text-[34px] font-black text-price pt-1 tabular-nums tracking-tight">{product.price.toFixed(2)}€</p>
          {product.note && <p className="text-sm text-muted-foreground italic">{tProduct(product.note)}</p>}
        </section>

        {(product.variants?.length || product.sizes?.length) && (
          <section className="space-y-5">
            {product.variants && product.variants.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <h3 className="text-[17px] font-black text-foreground">{t("choose")}</h3>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Escoge una opción</span>
                </div>
                <div className={`grid gap-2 ${product.variants.length === 3 ? "grid-cols-3" : product.variants.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
                  {product.variants.map((v) => {
                    const sel = selectedVariant?.id === v.id;
                    const variantLabel = tProduct(v.name);
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`rounded-2xl border px-2 py-3 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97] ${
                          sel
                            ? "border-success bg-success/10"
                            : "border-border bg-card"
                        }`}
                      >
                        <span className="text-[26px] leading-none" aria-hidden>{emojiFor(variantLabel)}</span>
                        <span className={`text-[13px] font-bold text-center leading-tight ${sel ? "text-success" : "text-foreground"}`}>
                          {variantLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {product.sizes && product.sizes.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <h3 className="text-[17px] font-black text-foreground">{t("size")}</h3>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Paso 2</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {product.sizes.map((size) => {
                    const selected = selectedSize?.id === size.id;
                    return (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.98] ${selected ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                      >
                        <div className={`text-[15px] font-black ${selected ? "text-primary" : "text-foreground"}`}>{tProduct(size.name)}</div>
                        <div className="text-[12px] text-muted-foreground tabular-nums mt-0.5">
                          {size.priceAdd > 0 ? `+${size.priceAdd.toFixed(2)}€` : "Sin suplemento"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {ingredientOptions.length > 0 && (
          <section>
            <div className="mb-2.5 flex items-baseline justify-between">
              <h3 className="text-[17px] font-black text-foreground">Personaliza tu pedido</h3>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Ingredientes</span>
            </div>
            <p className="text-[12px] text-muted-foreground mb-2">Toca para quitar</p>
            <ul className="divide-y divide-border/70 rounded-2xl border border-border bg-card overflow-hidden">
              {ingredientOptions.map((ingredient) => {
                const included = ingredients.get(ingredient) ?? true;
                return (
                  <li key={ingredient}>
                    <button
                      onClick={() => {
                        const next = new Map(ingredients);
                        next.set(ingredient, !included);
                        setIngredients(next);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left active:bg-muted/40 transition-colors"
                    >
                      <span className={`text-[22px] leading-none shrink-0 ${included ? "" : "grayscale opacity-40"}`} aria-hidden>{emojiFor(ingredient)}</span>
                      <span className={`flex-1 text-[15px] font-semibold ${included ? "text-foreground" : "text-muted-foreground line-through"}`}>{ingredient}</span>
                      <span
                        className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${included ? "bg-primary" : "bg-muted"}`}
                        aria-hidden
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-background shadow-sm transition-transform ${included ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {availableExtras.length > 0 && (
          <section>
            <div className="mb-2.5 flex items-baseline justify-between">
              <h3 className="text-[17px] font-black text-foreground">Añadir ingredientes</h3>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Extras</span>
            </div>
            <p className="text-[12px] text-muted-foreground mb-2">Suplementos opcionales</p>
            <ul className="divide-y divide-border/70 rounded-2xl border border-border bg-card overflow-hidden">
              {availableExtras.map((extra) => {
                const qty = extras.get(extra.id) || 0;
                const extraLabel = tProduct(extra.name);
                return (
                  <li key={extra.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="text-[22px] leading-none shrink-0" aria-hidden>{emojiFor(extraLabel)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold text-foreground truncate">{extraLabel}</div>
                      <div className="text-[12px] text-muted-foreground tabular-nums">+{extra.price.toFixed(2)}€</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleExtra(extra, Math.max(0, qty - 1))}
                        disabled={qty <= 0}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-30 active:scale-90 transition-transform"
                        aria-label="Disminuir"
                      >
                        <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                      <span className="text-[14px] font-bold tabular-nums w-4 text-center text-foreground">{qty}</span>
                      <button
                        onClick={() => toggleExtra(extra, Math.min(5, qty + 1))}
                        disabled={qty >= 5}
                        className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 ${qty > 0 ? "bg-primary text-primary-foreground" : "border border-border text-foreground"}`}
                        aria-label="Aumentar"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 mb-2">
          <span className="text-[15px] font-black text-foreground">Cantidad</span>
          <QuantitySelector value={quantity} onChange={setQuantity} min={1} variant="compact" />
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/92 backdrop-blur-md border-t border-border px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
        <button
          onClick={handleAdd}
          className="w-full flex items-center justify-between gap-3 py-4 px-5 bg-gradient-cta text-success-foreground rounded-[26px] shadow-cta active:scale-[0.98] transition-transform touch-action-manipulation"
        >
          <span className="text-[16px] font-black tracking-wide uppercase">{t("addToOrder")}</span>
          <span className="text-[16px] font-black bg-white/15 rounded-full px-4 py-1.5 tabular-nums">{totalPrice.toFixed(2)}€</span>
        </button>
      </div>
    </div>
  );
};

export default ProductScreen;
