import { useEffect, useMemo, useState } from "react";
import { Check, X, Plus } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { products, type Extra, type Size, type Variant } from "@/data/products";
import QuantitySelector from "@/components/QuantitySelector";
import ScreenHeader from "@/components/ScreenHeader";

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
          <section className="space-y-4 rounded-[24px] border border-border bg-card p-4 shadow-card">
            {product.variants && product.variants.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">Paso 1</p>
                    <h3 className="text-xl font-black text-foreground">{t("choose")}</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {product.variants.map((v) => {
                    const sel = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`rounded-[22px] border px-4 py-4 text-left transition-all active:scale-[0.99] ${
                          sel
                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                            : "border-border bg-secondary/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className={`text-lg font-black ${sel ? "text-primary" : "text-foreground"}`}>{tProduct(v.name)}</span>
                          <span className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center ${sel ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                            {sel && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {product.sizes && product.sizes.length > 0 && (
              <div>
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">Paso 2</p>
                  <h3 className="text-xl font-black text-foreground">{t("size")}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {product.sizes.map((size) => {
                    const selected = selectedSize?.id === size.id;
                    return (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-[22px] border px-4 py-4 text-left transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-secondary/30"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className={`text-lg font-black ${selected ? "text-primary" : "text-foreground"}`}>{tProduct(size.name)}</div>
                            <div className="text-sm text-muted-foreground mt-1 tabular-nums">
                              {size.priceAdd > 0 ? `+${size.priceAdd.toFixed(2)}€` : "Sin suplemento"}
                            </div>
                          </div>
                          <span className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                            {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                          </span>
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
          <section className="rounded-[24px] border border-border bg-card p-4 shadow-card">
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">Personalización</p>
              <h3 className="text-[24px] font-black text-foreground">Personaliza tu pedido</h3>
              <p className="text-sm text-muted-foreground mt-1">Toca para quitar un ingrediente</p>
            </div>
            <div className="space-y-2.5">
              {ingredientOptions.map((ingredient) => {
                const included = ingredients.get(ingredient) ?? true;
                return (
                  <button
                    key={ingredient}
                    onClick={() => {
                      const next = new Map(ingredients);
                      next.set(ingredient, !included);
                      setIngredients(next);
                    }}
                    className={`w-full rounded-[18px] border px-3.5 py-3 flex items-center gap-3 text-left transition-all ${included ? "bg-secondary/30 border-border" : "bg-muted/40 border-border/60 opacity-80"}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${included ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {included ? <Check className="w-4 h-4" strokeWidth={3} /> : <X className="w-4 h-4" strokeWidth={3} />}
                    </div>
                    <span className={`text-base font-bold ${included ? "text-foreground" : "text-muted-foreground line-through"}`}>{ingredient}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {availableExtras.length > 0 && (
          <section className="rounded-[24px] border border-border bg-card p-4 shadow-card">
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">Extras</p>
              <h3 className="text-[24px] font-black text-foreground">Añadir ingredientes</h3>
              <p className="text-sm text-muted-foreground mt-1">Suplementos opcionales</p>
            </div>
            <div className="space-y-3">
              {availableExtras.map((extra) => {
                const qty = extras.get(extra.id) || 0;
                const selected = qty > 0;
                return (
                  <div
                    key={extra.id}
                    className={`rounded-[20px] border px-3.5 py-3 flex items-center justify-between gap-3 ${selected ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${selected ? "bg-primary text-primary-foreground" : "bg-background border border-border text-primary"}`}>
                        {selected ? <Check className="w-4 h-4" strokeWidth={3} /> : <Plus className="w-4 h-4" strokeWidth={3} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-black text-foreground truncate">{tProduct(extra.name)}</div>
                        <div className="text-sm font-bold text-price-muted tabular-nums">+{extra.price.toFixed(2)}€</div>
                      </div>
                    </div>
                    <QuantitySelector value={qty} onChange={(value) => toggleExtra(extra, value)} max={5} variant="compact" />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-[24px] border border-border bg-card p-4 shadow-card mb-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">Paso final</p>
              <span className="text-[24px] font-black text-foreground">Cantidad</span>
            </div>
            <QuantitySelector value={quantity} onChange={setQuantity} min={1} variant="compact" />
          </div>
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
