import { useState, useEffect } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2 } from "lucide-react";

interface DBCategory {
  id: string;
  name: Record<string, string>;
  image_url: string | null;
  sort_order: number | null;
}

interface DBProduct {
  id: string;
  name: Record<string, string>;
  description: Record<string, string> | null;
  price: number;
  image_url: string | null;
  category_id: string;
  is_bestseller: boolean | null;
  is_promo: boolean | null;
}

const HomeScreen = () => {
  const { setScreen, setSelectedProductId, storeId } = useOrder();
  const { tProduct } = useLanguage();
  const { totalItems } = useCart();
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [catRes, prodRes] = await Promise.all([
        supabase.from("categories").select("id, name, image_url, sort_order").eq("store_id", storeId).eq("is_active", true).order("sort_order"),
        supabase.from("products").select("id, name, description, price, image_url, category_id, is_bestseller, is_promo").eq("store_id", storeId).eq("is_active", true).order("sort_order"),
      ]);
      const cats = (catRes.data || []) as unknown as DBCategory[];
      const prods = (prodRes.data || []) as unknown as DBProduct[];
      setCategories(cats);
      setProducts(prods);
      if (cats.length > 0) setActiveCategory(cats[0].id);
      setLoading(false);
    };
    load();
  }, [storeId]);

  const filteredProducts = products.filter((p) => p.category_id === activeCategory);

  const openProduct = (id: string) => {
    setSelectedProductId(id);
    setScreen("product");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] flex flex-col bg-background ${totalItems > 0 ? "pb-[64px]" : ""}`}>
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center shrink-0">
        <h1 className="text-lg font-black tracking-wide">Cardápio</h1>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar */}
        <aside className="w-[82px] bg-secondary/50 border-r border-border overflow-y-auto shrink-0 no-scrollbar">
          <div className="flex flex-col gap-0.5 p-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const nameStr = tProduct(cat.name as Record<string, string>);
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all touch-action-manipulation min-h-[72px] justify-center ${
                    isActive
                      ? "bg-card shadow-sm border-l-[3px] border-l-primary"
                      : "border-l-[3px] border-l-transparent active:scale-95"
                  }`}
                >
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={nameStr} className="w-10 h-10 object-contain rounded-lg" loading="lazy" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-xs font-bold text-muted-foreground">{nameStr.charAt(0)}</span>
                    </div>
                  )}
                  <span className={`text-[10px] font-bold text-center leading-tight line-clamp-2 ${isActive ? "text-primary" : "text-foreground"}`}>
                    {nameStr}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Products */}
        <main className="flex-1 overflow-y-auto bg-background no-scrollbar">
          <div className="px-3 pt-3 pb-2">
            <h2 className="text-lg font-black text-foreground">
              {activeCategory && categories.find(c => c.id === activeCategory)
                ? tProduct(categories.find(c => c.id === activeCategory)!.name as Record<string, string>)
                : ""}
            </h2>
          </div>

          <div className="px-3 pb-6 grid grid-cols-2 gap-2.5">
            {filteredProducts.map((p) => {
              const nameStr = tProduct(p.name as Record<string, string>);
              return (
                <button
                  key={p.id}
                  onClick={() => openProduct(p.id)}
                  className="relative flex flex-col bg-card rounded-2xl shadow-sm border border-border overflow-hidden active:scale-[0.97] transition-transform touch-action-manipulation"
                >
                  {p.is_promo && (
                    <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full z-10">
                      PROMO
                    </span>
                  )}
                  <div className="flex items-center justify-center bg-secondary/50 p-3 aspect-square">
                    {p.image_url ? (
                      <img src={p.image_url} alt={nameStr} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                        <span className="text-2xl font-bold text-muted-foreground">{nameStr.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 flex flex-col gap-1 flex-1">
                    <span className="text-xs font-bold text-foreground text-center leading-tight line-clamp-2">
                      {nameStr}
                    </span>
                    <span className="text-sm font-black text-primary text-center">
                      R$ {Number(p.price).toFixed(2)}
                    </span>
                  </div>
                  <div className="px-2 pb-2">
                    <div className="w-full flex items-center justify-center gap-1 bg-success text-success-foreground rounded-xl py-2 text-xs font-bold">
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </div>
                  </div>
                </button>
              );
            })}
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
