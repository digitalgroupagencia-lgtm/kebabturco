import { useState, useEffect } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import QuantitySelector from "@/components/QuantitySelector";
import { ArrowLeft, Loader2, Check } from "lucide-react";

interface DBSize {
  id: string;
  name: Record<string, string>;
  price_add: number;
  sort_order: number | null;
}

interface DBExtra {
  id: string;
  name: Record<string, string>;
  price: number;
  max_qty: number | null;
  sort_order: number | null;
}

interface DBProduct {
  id: string;
  name: Record<string, string>;
  description: Record<string, string> | null;
  price: number;
  image_url: string | null;
}

// Default removable ingredients per category (can be extended)
const defaultIngredients = [
  "Alface", "Tomate", "Cebola", "Picles", "Mostarda", "Ketchup", "Maionese"
];

const ProductScreen = () => {
  const { selectedProductId, setScreen, storeId } = useOrder();
  const { addItem } = useCart();
  const { tProduct } = useLanguage();

  const [product, setProduct] = useState<DBProduct | null>(null);
  const [sizes, setSizes] = useState<DBSize[]>([]);
  const [extras, setExtras] = useState<DBExtra[]>([]);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState(1);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [extraQtys, setExtraQtys] = useState<Map<string, number>>(new Map());
  const [ingredients, setIngredients] = useState<Map<string, boolean>>(
    new Map(defaultIngredients.map(i => [i, true]))
  );

  useEffect(() => {
    if (!selectedProductId) return;
    const load = async () => {
      setLoading(true);
      const [prodRes, sizesRes, extrasRes] = await Promise.all([
        supabase.from("products").select("id, name, description, price, image_url").eq("id", selectedProductId).single(),
        supabase.from("product_sizes").select("id, name, price_add, sort_order").eq("product_id", selectedProductId).order("sort_order"),
        supabase.from("product_extras").select("id, name, price, max_qty, sort_order").eq("product_id", selectedProductId).order("sort_order"),
      ]);
      const p = prodRes.data as unknown as DBProduct | null;
      const s = (sizesRes.data || []) as unknown as DBSize[];
      const e = (extrasRes.data || []) as unknown as DBExtra[];
      setProduct(p);
      setSizes(s);
      setExtras(e);
      if (s.length > 0) setSelectedSizeId(s[0].id);
      setLoading(false);
    };
    load();
  }, [selectedProductId]);

  if (loading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedSize = sizes.find(s => s.id === selectedSizeId);
  const extrasTotal = Array.from(extraQtys.entries()).reduce((sum, [id, qty]) => {
    const extra = extras.find(e => e.id === id);
    return sum + (extra ? Number(extra.price) * qty : 0);
  }, 0);
  const unitPrice = Number(product.price) + (selectedSize ? Number(selectedSize.price_add) : 0) + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const removedIngredients = Array.from(ingredients.entries())
    .filter(([, included]) => !included)
    .map(([name]) => name);

  const handleAdd = () => {
    const selectedExtras = Array.from(extraQtys.entries())
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const extra = extras.find(e => e.id === id)!;
        return { id, name: extra.name as Record<string, string>, price: Number(extra.price), quantity: qty };
      });

    addItem({
      productId: product.id,
      productName: product.name as Record<string, string>,
      productImage: product.image_url,
      basePrice: Number(product.price),
      quantity,
      sizeName: selectedSize ? selectedSize.name as Record<string, string> : null,
      sizeAdd: selectedSize ? Number(selectedSize.price_add) : 0,
      extras: selectedExtras,
      removedIngredients,
      unitPrice,
      totalPrice,
    });
    setScreen("home");
  };

  const nameStr = tProduct(product.name as Record<string, string>);
  const descStr = product.description ? tProduct(product.description as Record<string, string>) : "";

  return (
    <div className="min-h-[100dvh] bg-background animate-fade-in pb-[88px]">
      {/* Back button */}
      <div className="relative">
        <button
          onClick={() => setScreen("home")}
          className="absolute top-4 left-4 z-10 w-10 h-10 bg-card/90 backdrop-blur rounded-full shadow-sm flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center justify-center bg-secondary/50 pt-12 pb-4">
          {product.image_url ? (
            <img src={product.image_url} alt={nameStr} className="w-44 h-44 object-contain" />
          ) : (
            <div className="w-44 h-44 rounded-2xl bg-muted flex items-center justify-center">
              <span className="text-5xl font-bold text-muted-foreground">{nameStr.charAt(0)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Name & description */}
        <div>
          <h1 className="text-2xl font-black text-foreground">{nameStr}</h1>
          {descStr && <p className="text-muted-foreground mt-1 text-sm">{descStr}</p>}
          <p className="text-2xl font-black text-primary mt-2">R$ {Number(product.price).toFixed(2)}</p>
        </div>

        {/* Sizes */}
        {sizes.length > 0 && (
          <div>
            <h3 className="text-base font-bold text-foreground mb-2">Tamanho</h3>
            <div className="flex gap-2">
              {sizes.map(size => {
                const isSelected = selectedSizeId === size.id;
                return (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSizeId(size.id)}
                    className={`flex-1 py-3 rounded-xl text-center font-bold text-sm transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-foreground border border-border"
                    }`}
                  >
                    {tProduct(size.name as Record<string, string>)}
                    {Number(size.price_add) > 0 && (
                      <span className="block text-[11px] mt-0.5 opacity-80">
                        +R$ {Number(size.price_add).toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Extras */}
        {extras.length > 0 && (
          <div>
            <h3 className="text-base font-bold text-foreground mb-2">Adicionais</h3>
            <div className="flex flex-col gap-2">
              {extras.map(extra => (
                <div key={extra.id} className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
                  <div>
                    <span className="font-semibold text-sm text-foreground">
                      {tProduct(extra.name as Record<string, string>)}
                    </span>
                    <span className="text-primary font-bold text-sm ml-2">
                      +R$ {Number(extra.price).toFixed(2)}
                    </span>
                  </div>
                  <QuantitySelector
                    value={extraQtys.get(extra.id) || 0}
                    onChange={(v) => {
                      const next = new Map(extraQtys);
                      if (v <= 0) next.delete(extra.id);
                      else next.set(extra.id, v);
                      setExtraQtys(next);
                    }}
                    max={extra.max_qty || 5}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remove ingredients */}
        <div>
          <h3 className="text-base font-bold text-foreground mb-2">Personalizar seu pedido</h3>
          <div className="flex flex-col gap-1.5">
            {Array.from(ingredients.entries()).map(([name, included]) => (
              <button
                key={name}
                onClick={() => {
                  const next = new Map(ingredients);
                  next.set(name, !included);
                  setIngredients(next);
                }}
                className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3 active:scale-[0.98] transition-transform"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  included ? "bg-primary border-primary" : "bg-transparent border-muted-foreground"
                }`}>
                  {included && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
                <span className={`text-sm font-medium ${included ? "text-foreground" : "text-muted-foreground line-through"}`}>
                  {name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-foreground">Quantidade</span>
          <QuantitySelector value={quantity} onChange={setQuantity} min={1} />
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border p-4">
        <button
          onClick={handleAdd}
          className="w-full max-w-md mx-auto flex items-center justify-center gap-2 py-4 bg-success text-success-foreground rounded-2xl text-base font-black active:scale-[0.97] transition-transform touch-action-manipulation shadow-sm"
        >
          Adicionar ao pedido · R$ {totalPrice.toFixed(2)}
        </button>
      </div>
    </div>
  );
};

export default ProductScreen;
