import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useMenuData } from "@/hooks/useMenuData";
import PromoBannerCarousel from "@/components/PromoBannerCarousel";
import { Plus, RefreshCw } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import CustomerHomeSkeleton from "@/customer/components/CustomerHomeSkeleton";
import { splitProductName } from "@/lib/splitProductName";
import { parseProductCode } from "@/lib/parseProductCode";
import { shouldHideHeader } from "@/lib/embed-mode";
import { nav } from "@/lib/navPaths";
import SmartImage from "@/components/SmartImage";


const HomeScreen = () => {
  const { setScreen, setSelectedProductId, setProductReturnScreen, setEditingCartItemId, selectedCategory, setSelectedCategory } = useOrder();
  const { t, tProduct, preloadMenuTranslations, lang, primaryLang } = useLanguage();
  const { settings } = useBranding();
  const { theme } = useTheme();
  const { categories, products, loading, error, retry } = useMenuData();
  const navigate = useNavigate();
  const [logoTaps, setLogoTaps] = useState(0);
  const tapResetRef = useRef<number | null>(null);
  const handleLogoTap = () => {
    setLogoTaps((c) => {
      const next = c + 1;
      if (next >= 5) {
        navigate(nav.staff());
        return 0;
      }
      return next;
    });
    if (tapResetRef.current) window.clearTimeout(tapResetRef.current);
    tapResetRef.current = window.setTimeout(() => setLogoTaps(0), 1500);
  };
  const isDark = theme === "dark";
  const headerLogo =
    (isDark && ((settings as any)?.logo_main_dark_url || (settings as any)?.logo_secondary_dark_url)) ||
    settings?.logo_main_url ||
    settings?.logo_secondary_url ||
    "";

  useEffect(() => {
    if (loading) return;
    const hasBestsellers = products.some((product) => product.isBestseller);
    const availableIds = new Set([...(hasBestsellers ? ["bestsellers"] : []), ...categories.map((category) => category.id)]);
    if (!selectedCategory || !availableIds.has(selectedCategory)) {
      setSelectedCategory(hasBestsellers ? "bestsellers" : categories[0]?.id ?? null);
    }
  }, [categories, loading, products, selectedCategory, setSelectedCategory]);

  const scrollRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "auto" });
  }, [selectedCategory]);

  useEffect(() => {
    if (loading || lang === primaryLang) return;
    preloadMenuTranslations([
      ...categories.map((category) => category.name),
      ...products.map((product) => product.name),
      ...products.map((product) => product.description),
    ]);
  }, [loading, categories, products, lang, primaryLang, preloadMenuTranslations]);

  const allCategories = [
    ...(products.some((product) => product.isBestseller) ? [{
      id: "bestsellers",
      name: { pt: "Mais vendidos", en: "Bestsellers", es: "Más vendidos", fr: "Meilleures ventes" },
      image: products.find((p) => p.isBestseller)?.image || categories[0]?.image || "",
      icon: "",
    }] : []),
    ...categories,
  ];

  const activeCategory = selectedCategory || allCategories[0]?.id || "";
  const filteredProducts =
    activeCategory === "bestsellers"
      ? products.filter((product) => product.isBestseller)
      : products.filter((product) => product.category === activeCategory);

  const activeCategoryName =
    activeCategory === "bestsellers"
      ? t("bestsellers")
      : tProduct(categories.find((category) => category.id === activeCategory)?.name || { pt: "" });

  const openProduct = (id: string) => {
    setEditingCartItemId(null);
    setProductReturnScreen("home");
    setSelectedProductId(id);
    setScreen("product");
  };

  if (loading && products.length === 0 && categories.length === 0) {
    return <CustomerHomeSkeleton />;
  }

  if (error) {
    const copy =
      error === "empty"
        ? { title: t("menuUnavailable"), body: t("menuUnavailableHint") }
        : error === "no_store"
          ? { title: t("storeNotFound"), body: t("storeNotFoundHint") }
          : { title: t("menuLoadError"), body: t("menuLoadErrorHint") };

    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-lg font-black text-foreground">{copy.title}</p>
        <p className="text-sm text-muted-foreground max-w-xs">{copy.body}</p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-primary"
        >
          <RefreshCw className="h-4 w-4" />
          {t("tryAgainBtn")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {!shouldHideHeader() && (
      <header
        className="sticky top-0 z-30 shrink-0 text-primary-foreground px-4 pb-3 shadow-header overflow-hidden rounded-b-[18px]"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
          backgroundColor: "var(--browser-chrome-hex, #3A0205)",
        }}
      >
        <div className="relative flex items-center justify-between gap-3 min-h-[48px]">
          <button
            type="button"
            onClick={handleLogoTap}
            aria-label="logo"
            className="flex items-center min-w-0 flex-1 text-left bg-transparent border-0 p-0"
          >
            {headerLogo ? (
              <img
                src={headerLogo}
                alt={settings?.company_name || ""}
                className="h-11 sm:h-12 w-auto max-w-full object-contain object-left drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)] select-none"
                draggable={false}
              />
            ) : (
              <span className="text-lg font-black uppercase leading-none truncate">
                {settings?.company_name || ""}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-foreground opacity-80" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success-foreground" />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.22em]">{t("storeOpen")}</span>
            </div>
            <ThemeToggle variant="onColor" className="w-8 h-8 shadow-none" />
          </div>
        </div>
      </header>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        <aside className="w-[98px] min-w-[98px] shrink-0 overflow-y-auto border-r border-border/40 bg-secondary/30 md:[&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-2 px-2 py-2">
            {allCategories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`group relative flex w-full flex-col items-stretch gap-1.5 rounded-2xl p-2 transition-all touch-action-manipulation ${
                    isActive
                      ? "bg-card shadow-[0_6px_20px_-6px_hsla(0,0%,0%,0.18)] ring-1 ring-primary/25"
                      : "bg-card shadow-[0_4px_14px_-6px_hsla(0,0%,0%,0.08)] active:scale-[0.97]"
                  }`}
                >
                  <div className="aspect-square w-full overflow-hidden rounded-2xl bg-secondary/25">
                  <SmartImage
                    src={category.image}
                    alt={tProduct(category.name)}
                    targetWidth={176}
                    priority
                    className="h-full w-full object-contain object-center"
                    wrapperClassName="flex h-full w-full items-center justify-center"
                  />
                  </div>
                  <span
                    className={`text-[10px] font-bold text-center leading-tight line-clamp-2 px-0.5 ${
                      isActive ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {tProduct(category.name)}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r-full bg-primary" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-background md:scrollbar-thin">
          {/* Banner e título rolam com os produtos — liberta espaço vertical com a barra inferior */}
          <div className="px-3 pt-2">
            <PromoBannerCarousel />
            <div className="px-1 pt-2.5 pb-1.5 flex items-end justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  {t("menu")}
                </span>
                <h2 className="text-[18px] font-black text-foreground tracking-tight leading-tight mt-0.5">
                  {activeCategoryName}
                </h2>
                <div className="h-[3px] w-8 bg-primary rounded-full mt-1" />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground tabular-nums pb-0.5">
                {filteredProducts.length} {filteredProducts.length === 1 ? t("oneItem") : t("items")}
              </span>
            </div>
          </div>

          <div className="px-3 pb-16 grid grid-cols-2 gap-2.5">
            {filteredProducts.map((product, index) => {
              const { code, name: cleanName } = parseProductCode(tProduct(product.name));
              const [l1, l2] = splitProductName(cleanName);
              // Primeiros 6 produtos (acima da dobra em grid 2 cols) ganham priority.
              const isPriority = index < 6;
              return (
              <button
                key={product.id}
                onClick={() => openProduct(product.id)}
                className="group flex flex-col rounded-2xl border border-border/60 bg-card p-2 text-left active:scale-[0.98] transition-all hover:border-border hover:shadow-card touch-action-manipulation"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-secondary/25">
                  {product.isPromo && (
                    <span className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                      Oferta
                    </span>
                  )}
                  {code && (
                    <span className="absolute top-2 right-2 z-10 flex items-center justify-center min-w-[26px] h-[22px] px-1.5 rounded-full bg-foreground/85 text-background text-[10px] font-black tabular-nums shadow-sm backdrop-blur-sm">
                      {code}
                    </span>
                  )}
                  <SmartImage
                    src={product.image}
                    alt={cleanName}
                    targetWidth={400}
                    priority={isPriority}
                    className="h-full w-full object-contain object-center"
                    wrapperClassName="flex h-full w-full items-center justify-center"
                  />
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <span className="text-[14px] font-bold text-foreground text-left leading-[1.2] min-h-[34px] flex flex-col">
                    <span className="block">{l1}</span>
                    {l2 && <span className="block">{l2}</span>}
                  </span>

                  <div className="flex items-center justify-between gap-2 pb-0.5">
                    <span className="text-[16px] font-black text-price tabular-nums tracking-tight">
                      {product.price.toFixed(2)}€
                    </span>
                    <span
                      aria-hidden
                      className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground shadow-sm group-active:scale-90 transition-transform"
                    >
                      <Plus className="w-4 h-4" strokeWidth={3} />
                    </span>
                  </div>
                </div>
              </button>
              );
            })}

          </div>
        </main>
      </div>
    </div>
  );
};

export default HomeScreen;
