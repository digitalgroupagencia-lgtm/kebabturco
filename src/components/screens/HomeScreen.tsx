import { useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { products, categories } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import CategoryCard from "@/components/CategoryCard";

const HomeScreen = () => {
  const { setScreen, setSelectedProductId } = useOrder();
  const { t, tProduct } = useLanguage();
  const { totalItems } = useCart();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const bestsellers = products.filter(p => p.isBestseller);
  const promos = products.filter(p => p.isPromo);
  const filteredProducts = activeCategory ? products.filter(p => p.category === activeCategory) : null;

  const openProduct = (id: string) => {
    setSelectedProductId(id);
    setScreen("product");
  };

  return (
    <div className={`min-h-screen bg-secondary ${totalItems > 0 ? "pb-20" : ""}`}>
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4">
        <h1 className="text-2xl font-black">{t("menu")}</h1>
      </div>

      {/* Category bar */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
            !activeCategory ? "bg-primary text-primary-foreground" : "bg-card text-foreground border border-border"
          }`}
        >
          ⭐ {t("bestsellers")}
        </button>
        {categories.map(cat => (
          <CategoryCard
            key={cat.id}
            {...cat}
            isActive={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
          />
        ))}
      </div>

      <div className="px-4 pb-6 animate-fade-in">
        {filteredProducts ? (
          <>
            <h2 className="text-xl font-black text-foreground mb-3">
              {tProduct(categories.find(c => c.id === activeCategory)!.name)}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(p => (
                <ProductCard
                  key={p.id}
                  name={p.name}
                  image={p.image}
                  price={p.price}
                  onClick={() => openProduct(p.id)}
                  badge={p.isPromo ? "🔥 PROMO" : undefined}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Bestsellers */}
            <h2 className="text-xl font-black text-foreground mb-3">🔥 {t("bestsellers")}</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {bestsellers.map(p => (
                <ProductCard
                  key={p.id}
                  name={p.name}
                  image={p.image}
                  price={p.price}
                  onClick={() => openProduct(p.id)}
                />
              ))}
            </div>

            {/* Promotions */}
            {promos.length > 0 && (
              <>
                <h2 className="text-xl font-black text-foreground mb-3">🏷️ {t("promotions")}</h2>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {promos.map(p => (
                    <ProductCard
                      key={p.id}
                      name={p.name}
                      image={p.image}
                      price={p.price}
                      onClick={() => openProduct(p.id)}
                      badge="PROMO"
                    />
                  ))}
                </div>
              </>
            )}

            {/* Categories grid */}
            <h2 className="text-xl font-black text-foreground mb-3">📋 {t("categories")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center gap-3 p-4 bg-card rounded-2xl shadow-card border border-border active:scale-95 transition-transform touch-action-manipulation"
                >
                  <img src={cat.image} alt={tProduct(cat.name)} className="w-16 h-16 object-contain" loading="lazy" />
                  <span className="text-base font-bold text-foreground">{tProduct(cat.name)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomeScreen;
