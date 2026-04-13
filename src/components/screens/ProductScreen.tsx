import { useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { products } from "@/data/products";
import QuantitySelector from "@/components/QuantitySelector";
import { ArrowLeft } from "lucide-react";
import type { Extra, Size } from "@/data/products";

const ProductScreen = () => {
  const { selectedProductId, setScreen } = useOrder();
  const { addItem } = useCart();
  const { t, tProduct } = useLanguage();

  const product = products.find(p => p.id === selectedProductId);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<Size | undefined>(product?.sizes?.[0]);
  const [extras, setExtras] = useState<Map<string, number>>(new Map());

  if (!product) return null;

  const toggleExtra = (extra: Extra, qty: number) => {
    const next = new Map(extras);
    if (qty <= 0) next.delete(extra.id);
    else next.set(extra.id, qty);
    setExtras(next);
  };

  const extrasTotal = Array.from(extras.entries()).reduce((sum, [id, qty]) => {
    const extra = product.extras?.find(e => e.id === id);
    return sum + (extra ? extra.price * qty : 0);
  }, 0);

  const unitPrice = product.price + (selectedSize?.priceAdd || 0) + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    const selectedExtras = Array.from(extras.entries())
      .map(([id, qty]) => ({ extra: product.extras!.find(e => e.id === id)!, quantity: qty }))
      .filter(e => e.extra);

    addItem({
      product,
      quantity,
      selectedSize,
      selectedExtras,
      totalPrice,
    });
    setScreen("upsell");
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in pb-24">
      {/* Header */}
      <div className="relative">
        <button
          onClick={() => setScreen("home")}
          className="absolute top-4 left-4 z-10 w-10 h-10 bg-card rounded-full shadow-card flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center justify-center bg-secondary pt-12 pb-4">
          <img src={product.image} alt={tProduct(product.name)} className="w-48 h-48 object-contain" />
        </div>
      </div>

      <div className="px-4 py-4">
        <h1 className="text-2xl font-black text-foreground">{tProduct(product.name)}</h1>
        <p className="text-muted-foreground mt-1">{tProduct(product.description)}</p>
        <p className="text-2xl font-black text-primary mt-2">€{product.price.toFixed(2)}</p>

        {/* Sizes */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-foreground mb-2">{t("size")}</h3>
            <div className="flex gap-2">
              {product.sizes.map(size => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size)}
                  className={`flex-1 py-3 rounded-xl text-center font-bold transition-all ${
                    selectedSize?.id === size.id
                      ? "bg-primary text-primary-foreground shadow-elevated"
                      : "bg-secondary text-foreground border border-border"
                  }`}
                >
                  {tProduct(size.name)}
                  {size.priceAdd > 0 && <span className="block text-xs mt-0.5">+€{size.priceAdd.toFixed(2)}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Extras */}
        {product.extras && product.extras.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-foreground mb-2">{t("extras")}</h3>
            <div className="flex flex-col gap-2">
              {product.extras.map(extra => (
                <div key={extra.id} className="flex items-center justify-between bg-secondary rounded-xl p-3">
                  <div>
                    <span className="font-bold text-foreground">{tProduct(extra.name)}</span>
                    <span className="text-primary font-bold ml-2">+€{extra.price.toFixed(2)}</span>
                  </div>
                  <QuantitySelector
                    value={extras.get(extra.id) || 0}
                    onChange={(v) => toggleExtra(extra, v)}
                    max={5}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="mt-6 flex items-center justify-between">
          <span className="text-lg font-bold text-foreground">Quantidade</span>
          <QuantitySelector value={quantity} onChange={setQuantity} min={1} />
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <button
          onClick={handleAdd}
          className="w-full py-4 bg-success text-success-foreground rounded-2xl text-lg font-black active:scale-95 transition-transform touch-action-manipulation"
        >
          {t("addToOrder")} · €{totalPrice.toFixed(2)}
        </button>
      </div>
    </div>
  );
};

export default ProductScreen;
