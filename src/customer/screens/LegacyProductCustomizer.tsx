import { useEffect, useMemo, useState } from "react";
import { Check, Lock, Minus, Plus, X } from "lucide-react";
import { useCart, type CartItem } from "@/customer/contexts/CartContext";
import { isDrinkProduct } from "@/lib/modifiers/drinkProduct";
import { type Extra, type Size, type Variant } from "@/data/products";
import type { MenuProduct } from "@/hooks/useMenuData";
import ProductSummaryCard from "@/customer/customization/ProductSummaryCard";
import ScreenHeader from "@/components/ScreenHeader";
import { emojiFor } from "@/lib/foodEmojis";
import { parseProductCode } from "@/lib/parseProductCode";
import {
  isMeatChoiceLabel,
  isMeatVariantSet,
  mergeRemovableIngredients,
  parseRemovableIngredients,
  inferChoiceVariantsFromDescription,
} from "@/lib/parseProductCustomization";
import { resolveCustomerVariants } from "@/lib/modifiers/proteinRules";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const ingredientMap: Record<string, string[]> = {
  "pita-kebab": ["Lechuga", "Col", "Tomate", "Cebolla", "Maíz", "Zanahoria", "Salsas"],
  "rollo-kebab": ["Lechuga", "Col", "Tomate", "Cebolla", "Maíz", "Zanahoria", "Salsas"],
  "rollo-casero": ["Lechuga", "Col", "Tomate", "Cebolla", "Maíz", "Zanahoria", "Salsas"],
  platos: ["Lechuga", "Cebolla", "Tomate", "Col", "Zanahoria", "Maíz", "Salsa"],
  hamburguesas: ["Lechuga", "Tomate", "Cebolla", "Salsa"],
  ensaladas: ["Lechuga", "Tomate", "Cebolla"],
  box: ["Salsa"],
  pizzas: ["Orégano", "Queso", "Tomate"],
  menus: ["Lechuga", "Tomate", "Cebolla", "Salsa"],
  "taco-french": ["Lechuga", "Tomate", "Cebolla", "Salsa"],
  bowl: ["Cebolla crujiente", "Salsa"],
};

const extrasByCategory: Record<string, { id: string; name: Record<string, string>; price: number }[]> = {
  pizzas: [
    { id: "queso", name: { es: "Queso extra", en: "Extra cheese", pt: "Queijo extra", fr: "Fromage extra" }, price: 1.5 },
    { id: "bacon", name: { es: "Bacon", en: "Bacon", pt: "Bacon", fr: "Bacon" }, price: 1.5 },
  ],
  "pita-kebab": [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
    { id: "carne-extra", name: { es: "Carne extra", en: "Extra meat", pt: "Carne extra", fr: "Viande extra" }, price: 2.0 },
    { id: "patatas", name: { es: "Patatas dentro", en: "Fries inside", pt: "Batatas", fr: "Frites" }, price: 1.0 },
  ],
  "rollo-kebab": [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
    { id: "carne-extra", name: { es: "Carne extra", en: "Extra meat", pt: "Carne extra", fr: "Viande extra" }, price: 2.0 },
  ],
  menus: [
    { id: "queso", name: { es: "Queso", en: "Cheese", pt: "Queijo", fr: "Fromage" }, price: 1.0 },
    { id: "carne-extra", name: { es: "Carne extra", en: "Extra meat", pt: "Carne extra", fr: "Viande extra" }, price: 2.0 },
  ],
};

type Props = {
  product: MenuProduct;
  editingItem?: CartItem;
  editingCartItemId: string | null;
  onBack: () => void;
  onFinishAfterAdd?: () => void;
};

export default function LegacyProductCustomizer({ product, editingItem, editingCartItemId, onBack, onFinishAfterAdd }: Props) {
  const { addItem, updateItem } = useCart();
  const { t, tProduct } = useLanguage();

  const descriptionText = tProduct(product.description);
  const nameText = tProduct(product.name);

  const isDrink = isDrinkProduct(product);

  const effectiveVariants = useMemo(() => {
    if (isDrink) {
      return inferChoiceVariantsFromDescription(descriptionText) || inferChoiceVariantsFromDescription(nameText);
    }
    return resolveCustomerVariants(product, descriptionText, nameText);
  }, [product, descriptionText, nameText, isDrink]);

  const requiresVariant = effectiveVariants.length >= 2;
  const isMeatChoice = !isDrink && isMeatVariantSet(effectiveVariants);

  const ingredientOptions = useMemo(() => {
    if (isDrink) return [];
    const variantLabelKeys = new Set(effectiveVariants.map((v) => tProduct(v.name).toLowerCase()));
    const fromModifiers = (product.ingredients || []).filter(
      (ing) => !isMeatChoiceLabel(ing) && !variantLabelKeys.has(ing.toLowerCase()),
    );
    const fromDescription = parseRemovableIngredients(descriptionText, requiresVariant).filter(
      (ing) => !variantLabelKeys.has(ing.toLowerCase()),
    );
    const fromCategory = ingredientMap[product.category] || [];
    return mergeRemovableIngredients(fromModifiers, fromDescription, fromCategory);
  }, [product, descriptionText, requiresVariant, effectiveVariants, tProduct, isDrink]);

  const availableExtras = useMemo(
    () => product.extras ?? (extrasByCategory[product.category] || []),
    [product],
  );

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<Size | undefined>(undefined);
  const [selectedVariant, setSelectedVariant] = useState<Variant | undefined>(undefined);
  const [extras, setExtras] = useState<Map<string, number>>(new Map());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (editingItem) {
      setQuantity(editingItem.quantity);
      const matchSize = product.sizes?.find(
        (s) => editingItem.sizeName && tProduct(s.name) === tProduct(editingItem.sizeName),
      );
      setSelectedSize(matchSize ?? product.sizes?.[0]);
      const editedName = tProduct(editingItem.productName);
      const matchVariant = effectiveVariants.find((v) => editedName.includes(tProduct(v.name)));
      setSelectedVariant(matchVariant ?? effectiveVariants[0]);
      const extrasMap = new Map<string, number>();
      editingItem.extras.forEach((e) => {
        if (!e.id.startsWith("base-ing:")) extrasMap.set(e.id, e.quantity);
      });
      setExtras(extrasMap);
      setRemoved(new Set(editingItem.removedIngredients));
      setNote(editingItem.note ?? "");
    } else {
      setQuantity(1);
      setSelectedSize(product.sizes?.[0]);
      setSelectedVariant(requiresVariant ? undefined : effectiveVariants[0]);
      setExtras(new Map());
      setRemoved(new Set());
      setNote("");
    }
  }, [product.id, editingItem?.id, requiresVariant, effectiveVariants, tProduct]);

  const toggleExtra = (extra: Extra, qty: number) => {
    const next = new Map(extras);
    if (qty <= 0) next.delete(extra.id);
    else next.set(extra.id, qty);
    setExtras(next);
  };

  const extrasTotal = Array.from(extras.entries()).reduce((sum, [id, qty]) => {
    const extra = availableExtras.find((item) => item.id === id);
    return sum + (extra ? extra.price * qty : 0);
  }, 0);

  const basePrice = Number(product.price) || 0;

  const unitPrice = basePrice + (selectedSize?.priceAdd || 0) + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    if (requiresVariant && !selectedVariant) {
      toast.error(isMeatChoice ? t("errPickMeatBeforeAdd") : t("errPickDrinkBeforeAdd"));
      return;
    }

    const selectedExtras = Array.from(extras.entries())
      .map(([id, qty]) => {
        const extra = availableExtras.find((item) => item.id === id);
        if (!extra) return null;
        return { id: extra.id, name: extra.name, price: extra.price, quantity: qty };
      })
      .filter(Boolean) as { id: string; name: Record<string, string>; price: number; quantity: number }[];

    const variantSuffix = selectedVariant ? ` (${tProduct(selectedVariant.name)})` : "";
    const finalName = selectedVariant
      ? (Object.fromEntries(Object.entries(product.name).map(([k, v]) => [k, v + variantSuffix])) as Record<string, string>)
      : product.name;

    const basePayload = {
      productId: product.id,
      productName: finalName,
      productImage: product.image,
      basePrice,
      sizeName: selectedSize?.name || null,
      sizeAdd: selectedSize?.priceAdd || 0,
      extras: selectedExtras,
      removedIngredients: Array.from(removed),
      note: note.trim() || undefined,
      unitPrice,
    };

    if (editingCartItemId) {
      updateItem(editingCartItemId, { ...basePayload, quantity, totalPrice });
      onBack();
      return;
    }

    addItem({ ...basePayload, quantity, totalPrice });
    (onFinishAfterAdd ?? onBack)();
  };

  const { code: productCode, name: productCleanName } = parseProductCode(tProduct(product.name));

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-secondary/15 animate-fade-in">
      <ScreenHeader eyebrow={t("customizeProduct")} title={productCleanName} onBack={onBack} sticky />
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 px-4 pb-5 pt-4">
        <ProductSummaryCard
          imageUrl={product.image || "/placeholder.svg"}
          name={productCleanName}
          priceLabel={`${basePrice.toFixed(2)}€`}
          productCode={productCode}
          quantity={quantity}
          onQuantityChange={setQuantity}
          showQuantity={!editingItem}
        />
        {descriptionText && (
          <p className="px-1 text-sm leading-relaxed text-muted-foreground">{descriptionText}</p>
        )}
        {(effectiveVariants.length > 0 || product.sizes?.length) && (
          <section className="overflow-hidden rounded-[22px] border border-border/50 bg-card shadow-[0_8px_24px_-18px_rgba(0,0,0,0.22)]">
            {effectiveVariants.length > 0 && (
              <div className="p-3.5">
                <h3 className="mb-2.5 text-[15px] font-black uppercase tracking-[0.06em] text-foreground">
                  {requiresVariant
                    ? isMeatChoice
                      ? t("chooseOne")
                      : isDrink
                        ? t("chooseOne")
                        : t("choose")
                    : t("choose")}
                </h3>
                <div className="space-y-2">
                  {effectiveVariants.map((v) => {
                    const sel = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left ${
                          sel ? "border-primary bg-primary/[0.06]" : "border-border/60 bg-card"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            sel ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                          }`}
                        >
                          {sel ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="text-[15px] font-bold">{tProduct(v.name)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
        {ingredientOptions.length > 0 && (
          <section>
            <h3 className="text-[17px] font-black mb-2">Personaliza tu pedido</h3>
            <ul className="grid grid-cols-2 gap-2">
              {ingredientOptions.map((ingredient) => {
                const isRemoved = removed.has(ingredient);
                return (
                  <li key={ingredient}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(removed);
                        if (isRemoved) next.delete(ingredient);
                        else next.add(ingredient);
                        setRemoved(next);
                      }}
                      className={`w-full px-3 py-2.5 rounded-2xl border-2 text-left text-[13px] font-bold ${isRemoved ? "border-destructive bg-destructive/10 line-through text-destructive" : "border-success bg-success/10 text-success"}`}
                    >
                      {ingredient}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {availableExtras.length > 0 && (
          <section>
            <h3 className="text-[17px] font-black mb-2">Extras</h3>
            <ul className="divide-y rounded-2xl border bg-card">
              {availableExtras.map((extra) => {
                const qty = extras.get(extra.id) || 0;
                return (
                  <li key={extra.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <div className="flex-1">
                      <div className="font-semibold">{tProduct(extra.name)}</div>
                      <div className="text-xs text-muted-foreground">+{extra.price.toFixed(2)}€</div>
                    </div>
                    <button type="button" onClick={() => toggleExtra(extra, Math.max(0, qty - 1))} className="w-8 h-8 rounded-full border"><Minus className="w-3.5 h-3.5 mx-auto" /></button>
                    <span className="w-4 text-center font-bold">{qty}</span>
                    <button type="button" onClick={() => toggleExtra(extra, Math.min(5, qty + 1))} className="w-8 h-8 rounded-full bg-success text-white"><Plus className="w-3.5 h-3.5 mx-auto" /></button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <section className="shrink-0 border-t border-border/60 bg-card/95 px-4 pt-3 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleAdd}
          disabled={requiresVariant && !selectedVariant}
          className="flex h-14 w-full items-center justify-between gap-3 rounded-[18px] bg-gradient-primary px-5 text-primary-foreground shadow-primary transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <span className="text-[13px] font-black uppercase tracking-[0.08em]">{t("addToCartBtn")}</span>
          <span className="text-lg font-black tabular-nums">{totalPrice.toFixed(2)}€</span>
        </button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <Lock className="h-3 w-3 opacity-70" />
          {t("securePaymentHint")}
        </p>
      </section>
    </div>
  );
}
