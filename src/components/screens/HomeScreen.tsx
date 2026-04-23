import { useEffect } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { products, categories } from "@/data/products";
import PromoBannerCarousel from "@/components/PromoBannerCarousel";

const HomeScreen = () => {
  const { setScreen, setSelectedProductId, selectedCategory, setSelectedCategory } = useOrder();
  const { t, tProduct } = useLanguage();
  const { totalItems, orderType } = useCart();

  useEffect(() => {
    if (!selectedCategory) {
      setSelectedCategory("bestsellers");
    }
  }, [selectedCategory, setSelectedCategory]);

  const allCategories = [
    {
      id: "bestsellers",
      name: { pt: "Mais vendidos", en: "Bestsellers", es: "Más vendidos", fr: "Meilleures ventes" },
      image: products.find((p) => p.isBestseller)?.image || categories[0]?.image || "",
    },
    ...categories,
  ];

  const activeCategory = selectedCategory || "bestsellers";
  const filteredProducts =
    activeCategory === "bestsellers"
      ? products.filter((product) => product.isBestseller)
      : products.filter((product) => product.category === activeCategory);

  const activeCategoryName =
    activeCategory === "bestsellers"
      ? t("bestsellers")
      : tProduct(categories.find((category) => category.id === activeCategory)?.name || { pt: "" });

  const openProduct = (id: string) => {
    setSelectedProductId(id);
    setScreen("product");
  };

  return (
    <div className={`h-[100dvh] flex flex-col bg-background ${totalItems > 0 ? "pb-[72px]" : ""}`}>
      {/* Header refinado com gradiente sutil */}
      <header className="bg-gradient-header text-primary-foreground px-5 py-4 flex items-center justify-between shrink-0 shadow-header">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-75 font-semibold">
            {orderType === "takeaway" ? t("takeaway") : t("eatHere")}
          </span>
          <h1 className="text-xl font-black tracking-tight leading-tight mt-0.5">{t("menu")}</h1>
        </div>
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-success-foreground animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Abierto</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[120px] min-w-[120px] bg-secondary/70 border-r border-border overflow-y-auto shrink-0 no-scrollbar">
          <div className="flex flex-col gap-3 p-2">
            {allCategories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-3xl transition-all touch-action-manipulation min-h-[120px] justify-center border ${
                    isActive
                      ? "bg-card border-primary shadow-sm"
                      : "bg-transparent border-transparent active:scale-95"
                  }`}
                >
                  <img
                    src={category.image}
                    alt={tProduct(category.name)}
                    className="w-20 h-20 object-cover rounded-2xl bg-card"
                    loading="lazy"
                  />
                  <span
                    className={`text-[10px] font-bold text-center leading-tight line-clamp-2 ${
                      isActive ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {tProduct(category.name)}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-background no-scrollbar">
          <PromoBannerCarousel />

          <div className="px-4 pt-4 pb-3 sticky top-0 bg-background/95 backdrop-blur z-10">
            <h2 className="text-xl font-black text-foreground tracking-tight">{activeCategoryName}</h2>
            <div className="h-0.5 w-10 bg-primary rounded-full mt-1.5" />
          </div>

          <div className="px-3 pb-6 grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => openProduct(product.id)}
                className="group relative flex flex-col bg-card rounded-[22px] shadow-card border border-border/70 overflow-hidden active:scale-[0.98] transition-all hover:shadow-elevated touch-action-manipulation"
              >
                {product.isPromo && (
                  <span className="absolute top-2.5 left-2.5 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full z-10 shadow-sm">
                    Oferta
                  </span>
                )}
                <div className="bg-gradient-to-br from-secondary/40 to-secondary/70 aspect-square p-3 flex items-center justify-center">
                  <img
                    src={product.image}
                    alt={tProduct(product.name)}
                    className="w-full h-full object-cover rounded-2xl"
                    loading="lazy"
                  />
                </div>
                <div className="px-3 pt-3 pb-2 flex flex-col gap-1.5 flex-1">
                  <span className="text-[13px] font-bold text-foreground text-center leading-tight line-clamp-2 min-h-[34px]">
                    {tProduct(product.name)}
                  </span>
                  <span className="text-[17px] font-black text-price text-center tabular-nums tracking-tight">
                    {product.price.toFixed(2)}€
                  </span>
                </div>
                <div className="px-2.5 pb-2.5">
                  <div className="w-full flex items-center justify-center gap-1.5 bg-gradient-cta text-success-foreground rounded-xl py-2.5 text-[12px] font-black tracking-wide shadow-cta uppercase">
                    <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                    {t("addToOrder")}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomeScreen;
