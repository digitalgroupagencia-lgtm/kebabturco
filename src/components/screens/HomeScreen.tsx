import { useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { products, categories } from "@/data/products";
import { Plus } from "lucide-react";

const HomeScreen = () => {
  const { setScreen, setSelectedProductId } = useOrder();
  const { t, tProduct } = useLanguage();
  const { totalItems } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>("bestsellers");

  const filteredProducts =
    activeCategory === "bestsellers"
      ? products.filter((p) => p.isBestseller)
      : products.filter((p) => p.category === activeCategory);

  const activeCategoryName =
    activeCategory === "bestsellers"
      ? t("bestsellers")
      : tProduct(categories.find((c) => c.id === activeCategory)?.name || { pt: "" });

  const openProduct = (id: string) => {
    setSelectedProductId(id);
    setScreen("product");
  };

  const allCategories = [
    {
      id: "bestsellers",
      name: { pt: "Mais vendidos", en: "Bestsellers", es: "Más vendidos", fr: "Meilleures ventes" },
      image: products.find((p) => p.isBestseller)?.image || "",
    },
    ...categories,
  ];

  return (
    <div className={`h-screen flex flex-col bg-background ${totalItems > 0 ? "pb-[60px]" : ""}`}>
      {/* Top header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-black tracking-wide">{t("menu")}</h1>
      </div>

      {/* Main kiosk layout: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR — fixed 28% width */}
        <aside className="w-[28%] min-w-[90px] bg-secondary border-r border-border overflow-y-auto shrink-0 no-scrollbar">
          <div className="flex flex-col gap-1 p-1.5">
            {allCategories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all touch-action-manipulation min-h-[70px] justify-center ${
                    isActive
                      ? "bg-card shadow-card border-2 border-primary scale-[1.02]"
                      : "bg-transparent border-2 border-transparent active:scale-95"
                  }`}
                >
                  <img
                    src={cat.image}
                    alt={tProduct(cat.name)}
                    className="w-12 h-12 object-contain"
                    loading="lazy"
                  />
                  <span
                    className={`text-[10px] font-bold text-center leading-tight ${
                      isActive ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {tProduct(cat.name)}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT CONTENT — fills remaining space */}
        <main className="flex-1 overflow-y-auto bg-background no-scrollbar">
          {/* Category title */}
          <div className="px-3 pt-4 pb-2">
            <h2 className="text-xl font-black text-foreground">{activeCategoryName}</h2>
          </div>

          {/* Products grid */}
          <div className="px-3 pb-6 grid grid-cols-2 gap-2.5">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => openProduct(p.id)}
                className="relative flex flex-col bg-card rounded-2xl shadow-card border border-border overflow-hidden active:scale-[0.97] transition-transform touch-action-manipulation"
              >
                {p.isPromo && (
                  <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                    PROMO
                  </span>
                )}
                <div className="flex items-center justify-center bg-secondary p-3">
                  <img
                    src={p.image}
                    alt={tProduct(p.name)}
                    className="w-20 h-20 object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="p-2.5 flex flex-col gap-1 flex-1">
                  <span className="text-xs font-bold text-foreground text-center leading-tight line-clamp-2">
                    {tProduct(p.name)}
                  </span>
                  <span className="text-sm font-black text-primary text-center">
                    €{p.price.toFixed(2)}
                  </span>
                </div>
                <div className="px-2.5 pb-2.5">
                  <div className="w-full flex items-center justify-center gap-1 bg-success text-success-foreground rounded-xl py-2 text-xs font-bold">
                    <Plus className="w-3.5 h-3.5" />
                    {t("addToOrder")}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Nenhum produto nesta categoria
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default HomeScreen;
