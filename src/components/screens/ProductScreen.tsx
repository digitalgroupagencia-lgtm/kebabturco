import { useMemo } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useMenuData } from "@/hooks/useMenuData";
import { useEffectiveModifierConfig } from "@/hooks/useEffectiveModifierConfig";
import ProductCustomizationFlow from "@/components/customization/ProductCustomizationFlow";
import LegacyProductCustomizer from "@/components/screens/LegacyProductCustomizer";
import ProductErrorBoundary from "@/components/ProductErrorBoundary";
import PageSpinner from "@/components/PageSpinner";
import ScreenHeader from "@/components/ScreenHeader";
import { useLanguage } from "@/contexts/LanguageContext";

/** Escolhe ecrã legado vs personalização avançada — sem violar regras de hooks do React. */
const ProductScreen = () => {
  const {
    selectedProductId,
    setScreen,
    productReturnScreen,
    setProductReturnScreen,
    editingCartItemId,
    setEditingCartItemId,
  } = useOrder();

  const goBack = () => {
    const target = productReturnScreen;
    setProductReturnScreen("home");
    setEditingCartItemId(null);
    setScreen(target);
  };

  const { items } = useCart();
  const { t, tProduct } = useLanguage();
  const { products, loading: menuLoading } = useMenuData();
  const product = products.find((item) => item.id === selectedProductId);
  const { config: modifierConfig, loading: modifierLoading, hasStructuredModifiers } =
    useEffectiveModifierConfig(product, products);

  const editingItem = useMemo(
    () => (editingCartItemId ? items.find((i) => i.id === editingCartItemId) : undefined),
    [editingCartItemId, items],
  );

  const productLabel = product ? tProduct(product.name) : undefined;

  if (menuLoading || modifierLoading || (selectedProductId && !product)) {
    return (
      <div className="flex h-full items-center justify-center">
        <PageSpinner />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-full flex-col bg-background">
        <ScreenHeader eyebrow={t("menu")} title={t("productUnavailable")} onBack={goBack} sticky />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <p className="text-muted-foreground text-sm">{t("productUnavailable")}</p>
          <button
            type="button"
            onClick={goBack}
            className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-bold"
          >
            {t("back")}
          </button>
        </div>
      </div>
    );
  }

  const productContent =
    hasStructuredModifiers && modifierConfig ? (
      <ProductErrorBoundary
        key={product.id}
        onBack={goBack}
        productLabel={productLabel}
        fallback={
          <LegacyProductCustomizer
            product={product}
            editingItem={editingItem}
            editingCartItemId={editingCartItemId}
            onBack={goBack}
          />
        }
      >
        <ProductCustomizationFlow
          product={product}
          config={modifierConfig}
          editingItem={editingItem}
          onBack={goBack}
        />
      </ProductErrorBoundary>
    ) : (
      <LegacyProductCustomizer
        product={product}
        editingItem={editingItem}
        editingCartItemId={editingCartItemId}
        onBack={goBack}
      />
    );

  return productContent;
};

export default ProductScreen;
