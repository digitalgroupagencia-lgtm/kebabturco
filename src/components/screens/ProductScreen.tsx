import { useMemo } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useMenuData } from "@/hooks/useMenuData";
import { useEffectiveModifierConfig } from "@/hooks/useEffectiveModifierConfig";
import ProductCustomizationFlow from "@/components/customization/ProductCustomizationFlow";
import LegacyProductCustomizer from "@/components/screens/LegacyProductCustomizer";
import PageSpinner from "@/components/PageSpinner";

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
  const { products } = useMenuData();
  const product = products.find((item) => item.id === selectedProductId);
  const { config: modifierConfig, loading: modifierLoading, hasStructuredModifiers } =
    useEffectiveModifierConfig(product);

  const editingItem = useMemo(
    () => (editingCartItemId ? items.find((i) => i.id === editingCartItemId) : undefined),
    [editingCartItemId, items],
  );

  if (!product) return null;

  if (modifierLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <PageSpinner />
      </div>
    );
  }

  if (hasStructuredModifiers && modifierConfig) {
    return (
      <ProductCustomizationFlow
        product={product}
        config={modifierConfig}
        editingItem={editingItem}
        onBack={goBack}
      />
    );
  }

  return (
    <LegacyProductCustomizer
      product={product}
      editingItem={editingItem}
      editingCartItemId={editingCartItemId}
      onBack={goBack}
    />
  );
};

export default ProductScreen;
