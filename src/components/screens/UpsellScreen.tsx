import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { upsellProducts } from "@/data/products";

const UpsellScreen = () => {
  const { setScreen } = useOrder();
  const { addItem } = useCart();
  const { t, tProduct } = useLanguage();

  const handleAdd = (productId: string) => {
    const product = upsellProducts.find(p => p.id === productId);
    if (!product) return;
    addItem({
      product,
      quantity: 1,
      selectedSize: product.sizes?.[0],
      selectedExtras: [],
      totalPrice: product.price,
    });
    setScreen("home");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 animate-fade-in">
      <h2 className="text-2xl font-black text-foreground mb-6 text-center">{t("upsellTitle")}</h2>
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-8">
        {upsellProducts.map(p => (
          <button
            key={p.id}
            onClick={() => handleAdd(p.id)}
            className="flex flex-col items-center bg-card rounded-2xl shadow-card border border-border p-3 active:scale-95 transition-transform touch-action-manipulation"
          >
            <img src={p.image} alt={tProduct(p.name)} className="w-20 h-20 object-contain mb-2" loading="lazy" />
            <span className="text-xs font-bold text-foreground text-center">{tProduct(p.name)}</span>
            <span className="text-sm font-black text-primary mt-1">+€{p.price.toFixed(2)}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setScreen("home")}
        className="text-muted-foreground font-bold text-lg active:opacity-70 transition"
      >
        {t("noThanks")}
      </button>
    </div>
  );
};

export default UpsellScreen;
