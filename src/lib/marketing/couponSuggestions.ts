export type CouponSuggestionType = "percent" | "fixed" | "free_delivery" | "combo_nth";

export type CouponSuggestionTemplate = {
  code: string;
  description: { pt: string; es: string; en: string };
  discountType: CouponSuggestionType;
  discountValue: number;
  minOrder: number;
  promoConfig?: Record<string, unknown>;
  /** Usar produto em destaque marketing se linkedProductId omitido */
  linkedProductId?: string | null;
  expiresInDays?: number;
};

export const COUPON_SUGGESTIONS: CouponSuggestionTemplate[] = [
  {
    code: "VOLTA10",
    description: {
      pt: "10% de desconto para clientes que voltam a pedir",
      es: "10% de descuento para clientes que vuelven",
      en: "10% off for returning customers",
    },
    discountType: "percent",
    discountValue: 10,
    minOrder: 0,
    expiresInDays: 30,
  },
  {
    code: "ENTREGA20",
    description: {
      pt: "Entrega grátis em pedidos a partir de 20€",
      es: "Envío gratis en pedidos desde 20€",
      en: "Free delivery on orders over €20",
    },
    discountType: "free_delivery",
    discountValue: 0,
    minOrder: 20,
    expiresInDays: 60,
  },
  {
    code: "KEBAB3X2",
    description: {
      pt: "Peça 3 kebabs iguais, o 3.º sai à metade do preço",
      es: "Pide 3 kebabs iguales, el 3.º a mitad de precio",
      en: "Order 3 same kebabs, 3rd half price",
    },
    discountType: "combo_nth",
    discountValue: 50,
    minOrder: 0,
    promoConfig: { min_items: 3, nth_discount_percent: 50 },
  },
  {
    code: "BEMVINDO15",
    description: {
      pt: "15% na primeira encomenda online",
      es: "15% en el primer pedido online",
      en: "15% off first online order",
    },
    discountType: "percent",
    discountValue: 15,
    minOrder: 12,
    expiresInDays: 14,
  },
  {
    code: "ALMOCO5",
    description: {
      pt: "5€ de desconto no almoço (pedido mín. 18€)",
      es: "5€ de descuento en el almuerzo (mín. 18€)",
      en: "€5 off lunch (min order €18)",
    },
    discountType: "fixed",
    discountValue: 5,
    minOrder: 18,
    expiresInDays: 30,
  },
  {
    code: "FIMSEMANA10",
    description: {
      pt: "10% extra no fim de semana",
      es: "10% extra el fin de semana",
      en: "10% extra on weekends",
    },
    discountType: "percent",
    discountValue: 10,
    minOrder: 15,
    expiresInDays: 90,
  },
];

export function getCouponSuggestion(code: string): CouponSuggestionTemplate | undefined {
  return COUPON_SUGGESTIONS.find((c) => c.code.toUpperCase() === code.toUpperCase());
}

export function getCouponSuggestionForPreset(presetKey: string): CouponSuggestionTemplate | undefined {
  const map: Record<string, string> = {
    winback_30d: "VOLTA10",
    winback_60d: "VOLTA10",
    welcome_2d: "BEMVINDO15",
    promo_weekend: "FIMSEMANA10",
    promo_lunch: "ALMOCO5",
    promo_delivery_free: "ENTREGA20",
    promo_combo_kebab: "KEBAB3X2",
  };
  const code = map[presetKey];
  return code ? getCouponSuggestion(code) : undefined;
}
