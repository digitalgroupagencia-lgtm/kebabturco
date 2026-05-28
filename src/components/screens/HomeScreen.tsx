import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useMenuData } from "@/hooks/useMenuData";
import PromoBannerCarousel from "@/components/PromoBannerCarousel";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { splitProductName } from "@/lib/splitProductName";
import { parseProductCode } from "@/lib/parseProductCode";
import { shouldHideHeader } from "@/lib/embed-mode";
import { nav } from "@/lib/navPaths";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import CustomerNotificationOptInDialog from "@/components/CustomerNotificationOptInDialog";
import {
  isCustomerMarketingPushSupported,
  shouldPromptCustomerMarketingPush,
} from "@/lib/customerMarketingPush";


const HomeScreen = () => {
  const { setScreen, setSelectedProductId, setProductReturnScreen, setEditingCartItemId, selectedCategory, setSelectedCategory } = useOrder();
  const { t, tProduct, preloadMenuTranslations, lang, primaryLang } = useLanguage();
  const { settings } = useBranding();
  const { theme } = useTheme();
  const { categories, products, loading, error, retry } = useMenuData();
  const navigate = useNavigate();
  const { storeId: resolvedStoreId, selectedStoreId } = useResolvedStore();
  const activeStoreId = selectedStoreId || resolvedStoreId || "";
  const [notifyOptInOpen, setNotifyOptInOpen] = useState(false);
  const notifyPromptedRef = useRef(false);
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

  useEffect(() => {
    if (loading || !activeStoreId || notifyPromptedRef.current) return;
    if (!isCustomerMarketingPushSupported()) return;
    if (!shouldPromptCustomerMarketingPush()) return;
    notifyPromptedRef.current = true;
    const timer = window.setTimeout(() => setNotifyOptInOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [loading, activeStoreId]);

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

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-label="A carregar menu" />
        <p className="text-sm text-muted-foreground font-semibold">A carregar menu…</p>
      </div>
    );
  }

  if (error) {
    const copy =
      error === "empty"
        ? { title: "Menu indisponível", body: "Esta loja ainda não tem produtos activos. Tente mais tarde." }
        : error === "no_store"
          ? { title: "Loja não encontrada", body: "Não foi possível identificar a loja. Actualize a página." }
          : { title: "Erro ao carregar menu", body: "Verifique a ligação e tente novamente." };

    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-lg font-black text-foreground">{copy.title}</p>
        <p className="text-sm text-muted-foreground max-w-xs">{copy.body}</p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {!shouldHideHeader() && (
      <header
        className="sticky top-0 z-30 relative bg-gradient-header text-primary-foreground px-5 pb-4 shrink-0 shadow-header overflow-hidden rounded-b-[18px]"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-black/15 blur-3xl" />

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
              <span className="text-[10px] font-extrabold uppercase tracking-[0.22em]">Abierto</span>
            </div>
            <ThemeToggle variant="onColor" className="w-8 h-8 shadow-none" />
          </div>
        </div>
      </header>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        <aside className="w-[108px] min-w-[108px] bg-secondary/40 overflow-y-auto shrink-0 md:[&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-2.5 px-1.5 py-3">
            {allCategories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`group relative flex flex-col items-center gap-1.5 pt-2 pb-2.5 rounded-2xl transition-all touch-action-manipulation ${
                    isActive
                      ? "bg-card shadow-[0_6px_20px_-6px_hsla(0,0%,0%,0.18)]"
                      : "bg-card/60 hover:bg-card shadow-[0_4px_14px_-6px_hsla(0,0%,0%,0.12)] active:scale-[0.97]"
                  }`}
                >
                  <img
                    src={category.image}
                    alt={tProduct(category.name)}
                    className="w-[96px] h-[72px] object-cover rounded-[14px] drop-shadow-[0_5px_8px_rgba(0,0,0,0.16)]"
                    loading="lazy"
                  />
                  <span
                    className={`text-[11px] font-bold text-center leading-tight line-clamp-2 px-0.5 ${
                      isActive ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {tProduct(category.name)}
                  </span>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-9 bg-primary rounded-r-full" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-background md:scrollbar-thin">
          {/* Banner + título da categoria fixos no topo; produtos rolam por baixo */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md px-3 pt-3">
            <PromoBannerCarousel />
            <div className="px-1 pt-3 pb-2 flex items-end justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  {t("menu")}
                </span>
                <h2 className="text-[20px] font-black text-foreground tracking-tight leading-tight mt-0.5">
                  {activeCategoryName}
                </h2>
                <div className="h-[3px] w-8 bg-primary rounded-full mt-1.5" />
              </div>
              <span className="text-[11px] font-bold text-muted-foreground tabular-nums pb-1">
                {filteredProducts.length} {filteredProducts.length === 1 ? t("oneItem") : t("items")}
              </span>
            </div>
          </div>


          <div className="px-3 pb-24 grid grid-cols-2 gap-2.5">
            {filteredProducts.map((product) => {
              const { code, name: cleanName } = parseProductCode(tProduct(product.name));
              const [l1, l2] = splitProductName(cleanName);
              return (
              <button
                key={product.id}
                onClick={() => openProduct(product.id)}
                className="group relative flex flex-col bg-card rounded-2xl border border-border/60 overflow-hidden active:scale-[0.98] transition-all hover:border-border hover:shadow-card touch-action-manipulation"
              >
                {product.isPromo && (
                  <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md z-10 shadow-sm">
                    Oferta
                  </span>
                )}
                {code && (
                  <span className="absolute top-2 right-2 z-10 flex items-center justify-center min-w-[26px] h-[22px] px-1.5 rounded-full bg-foreground/85 text-background text-[10px] font-black tabular-nums shadow-sm backdrop-blur-sm">
                    {code}
                  </span>
                )}

                {/* Imagem protagonista, sem moldura pesada */}
                <div className="aspect-[5/4] px-2 pt-2 pb-1 flex items-center justify-center">
                  <img
                    src={product.image}
                    alt={cleanName}
                    className="w-full h-full object-cover rounded-[16px] drop-shadow-[0_6px_10px_rgba(0,0,0,0.12)] transition-transform group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>

                {/* Bloco inferior compacto: nome, preço e botão integrado */}
                <div className="px-2.5 pt-1 pb-2.5 flex flex-col gap-1.5">
                  <span className="text-[14px] font-bold text-foreground text-left leading-[1.2] min-h-[34px] flex flex-col">
                    <span className="block">{l1}</span>
                    {l2 && <span className="block">{l2}</span>}
                  </span>

                  <div className="flex items-center justify-between gap-2">
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

      {activeStoreId && (
        <CustomerNotificationOptInDialog
          open={notifyOptInOpen}
          storeId={activeStoreId}
          onOpenChange={setNotifyOptInOpen}
        />
      )}
    </div>
  );
};

export default HomeScreen;
