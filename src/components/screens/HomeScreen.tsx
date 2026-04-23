import { useEffect } from "react";
import { Plus } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { products, categories } from "@/data/products";

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
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-black tracking-wide">{t("menu")}</h1>
          <p className="text-[11px] opacity-80 mt-0.5">
            {orderType === "takeaway" ? t("takeaway") : t("eatHere")}
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[104px] min-w-[104px] bg-secondary/70 border-r border-border overflow-y-auto shrink-0 no-scrollbar">
          <div className="flex flex-col gap-2 p-2">
            {allCategories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all touch-action-manipulation min-h-[94px] justify-center border ${
                    isActive
                      ? "bg-card border-primary shadow-sm"
                      : "bg-transparent border-transparent active:scale-95"
                  }`}
                >
                  <img
                    src={category.image}
                    alt={tProduct(category.name)}
                    className="w-12 h-12 object-contain"
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
          <div className="px-4 pt-4 pb-3 sticky top-0 bg-background/95 backdrop-blur z-10">
            <h2 className="text-xl font-black text-foreground">{activeCategoryName}</h2>
          </div>

          <div className="px-3 pb-6 grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => openProduct(product.id)}
                className="relative flex flex-col bg-card rounded-[24px] shadow-sm border border-border overflow-hidden active:scale-[0.97] transition-transform touch-action-manipulation"
              >
                {product.isPromo && (
                  <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-1 rounded-full z-10">
                    Oferta
                  </span>
                )}
                <div className="bg-secondary/60 aspect-square p-4 flex items-center justify-center">
                  <img
                    src={product.image}
                    alt={tProduct(product.name)}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <span className="text-sm font-bold text-foreground text-center leading-tight line-clamp-2 min-h-[40px]">
                    {tProduct(product.name)}
                  </span>
                  <span className="text-base font-black text-primary text-center">
                    {product.price.toFixed(2)}€
                  </span>
                </div>
                <div className="px-3 pb-3">
                  <div className="w-full flex items-center justify-center gap-1.5 bg-success text-success-foreground rounded-2xl py-3 text-sm font-bold">
                    <Plus className="w-4 h-4" />
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
