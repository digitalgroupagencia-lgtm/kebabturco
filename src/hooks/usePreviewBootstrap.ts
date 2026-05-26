import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { isAdminPreviewMode } from "@/lib/tenantPreview";
import { isLovableEditorPreview } from "@/lib/lovablePreview";
import { saveSavedLang, saveSavedOrderType } from "@/lib/customerSession";

/** Prepara totem em modo preview: ecrã fixo, carrinho demo para checkout, sem saltar idioma. */
export function usePreviewBootstrap(storeId: string) {
  const { screen } = useOrder();
  const { items, addItem, setOrderType } = useCart();
  const seeded = useRef(false);
  const inPreview = isAdminPreviewMode() || isLovableEditorPreview();

  useEffect(() => {
    if (!inPreview || !storeId) return;
    saveSavedLang("es");
    saveSavedOrderType("takeaway");
    setOrderType("takeaway");
  }, [storeId, setOrderType]);

  useEffect(() => {
    if (!inPreview || !storeId || seeded.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("seedCheckout") !== "1") return;
    if (items.length > 0) {
      seeded.current = true;
      return;
    }

    (async () => {
      const { data: product } = await supabase
        .from("products")
        .select("id, name, image_url, price")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!product) return;

      const name =
        typeof product.name === "object" && product.name !== null
          ? (product.name as Record<string, string>)
          : { es: String(product.name ?? "Produto") };

      addItem({
        productId: product.id,
        productName: name,
        productImage: product.image_url,
        basePrice: Number(product.price) || 0,
        quantity: 1,
        sizeName: null,
        sizeAdd: 0,
        extras: [],
        removedIngredients: [],
        unitPrice: Number(product.price) || 0,
        totalPrice: Number(product.price) || 0,
      });
      seeded.current = true;
    })();
  }, [storeId, screen, items.length, addItem]);
}
