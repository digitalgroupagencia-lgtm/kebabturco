import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { products, type Extra, type Size, type Variant } from "@/data/products";
import QuantitySelector from "@/components/QuantitySelector";

const ingredientMap: Record<string, string[]> = {
  "pita-kebab": ["Lechuga", "Col", "Tomate", "Pepino", "Cebolla", "Maíz", "Zanahoria", "Salsas"],
  "rollo-kebab": ["Lechuga", "Col", "Tomate", "Pepino", "Cebolla", "Maíz", "Zanahoria", "Salsas"],
  "rollo-casero": ["Lechuga", "Col", "Tomate", "Pepino", "Cebolla", "Maíz", "Zanahoria", "Salsas"],
  platos: ["Lechuga", "Cebolla", "Tomate", "Col", "Zanahoria", "Maíz", "Pepino", "Salsa"],
  hamburguesas: ["Lechuga", "Tomate", "Cebolla", "Salsa"],
  ensaladas: ["Lechuga", "Tomate", "Cebolla"],
  box: ["Salsa"],
};

const ProductScreen = () => {
  const { selectedProductId, setScreen } = useOrder();
  const { addItem } = useCart();
  const { t, tProduct } = useLanguage();

  const product = products.find((item) => item.id === selectedProductId);
  const ingredientOptions = useMemo(
    () => (product ? ingredientMap[product.category] || [] : []),
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
    const extra = product.extras?.find((item) => item.id === id);
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
        const extra = product.extras?.find((item) => item.id === id);
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

    setScreen("home");
  };

  return (
    <div className="relative min-h-[100dvh] bg-background animate-fade-in pb-[110px]">
      <div className="relative">
        <button
          onClick={() => setScreen("home")}
          className="absolute top-4 left-4 z-10 w-11 h-11 bg-card/95 rounded-full shadow-sm flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="bg-secondary/60 pt-14 pb-5 flex items-center justify-center">
          <img src={product.image} alt={tProduct(product.name)} className="w-52 h-52 object-contain" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        <div>
          <h1 className="text-[30px] leading-tight font-black text-foreground">{tProduct(product.name)}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{tProduct(product.description)}</p>
          <p className="text-[32px] font-black text-primary mt-3">{product.price.toFixed(2)}€</p>
          {product.note && (
            <p className="text-xs text-muted-foreground italic mt-2">{tProduct(product.note)}</p>
          )}
        </div>

        {product.variants && product.variants.length > 0 && (
          <div>
            <h3 className="text-base font-bold text-foreground mb-3">{t("choose")}</h3>
            <div className="grid grid-cols-2 gap-2">
              {product.variants.map((v) => {
                const sel = selectedVariant?.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`rounded-2xl p-4 text-left border transition-all ${sel ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-secondary/50 text-foreground border-border"}`}
                  >
                    <div className="font-bold text-sm">{tProduct(v.name)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {product.sizes && product.sizes.length > 0 && (
          <div>
            <h3 className="text-base font-bold text-foreground mb-3">{t("size")}</h3>
            <div className="grid grid-cols-2 gap-2">
              {product.sizes.map((size) => {
                const selected = selectedSize?.id === size.id;
                return (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-2xl p-4 text-left border transition-all ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-secondary/50 text-foreground border-border"
                    }`}
                  >
                    <div className="font-bold text-sm">{tProduct(size.name)}</div>
                    <div className="text-xs mt-1 opacity-80">
                      {size.priceAdd > 0 ? `+${size.priceAdd.toFixed(2)}€` : "Sin suplemento"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {product.extras && product.extras.length > 0 && (
          <div>
            <h3 className="text-base font-bold text-foreground mb-3">{t("extras")}</h3>
            <div className="space-y-2">
              {product.extras.map((extra) => (
                <div key={extra.id} className="bg-secondary/50 rounded-2xl p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{tProduct(extra.name)}</div>
                    <div className="text-sm font-bold text-primary">+{extra.price.toFixed(2)}€</div>
                  </div>
                  <QuantitySelector
                    value={extras.get(extra.id) || 0}
                    onChange={(value) => toggleExtra(extra, value)}
                    max={5}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {ingredientOptions.length > 0 && (
          <div>
            <h3 className="text-base font-bold text-foreground mb-3">Personaliza tu pedido</h3>
            <div className="space-y-2">
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
                    className="w-full bg-secondary/50 rounded-2xl p-3 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        included ? "bg-primary border-primary" : "border-muted-foreground bg-background"
                      }`}
                    >
                      {included && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                    <span className={`text-sm font-medium ${included ? "text-foreground" : "text-muted-foreground line-through"}`}>
                      {ingredient}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-foreground">Cantidad</span>
          <QuantitySelector value={quantity} onChange={setQuantity} min={1} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <button
          onClick={handleAdd}
          className="w-full flex items-center justify-between gap-3 py-4 px-5 bg-success text-success-foreground rounded-full shadow-lg active:scale-[0.97] transition-transform touch-action-manipulation"
        >
          <span className="text-base font-black tracking-wide">{t("addToOrder")}</span>
          <span className="text-base font-black bg-white/15 rounded-full px-3 py-1">
            {totalPrice.toFixed(2)}€
          </span>
        </button>
      </div>
    </div>
  );
};

export default ProductScreen;
