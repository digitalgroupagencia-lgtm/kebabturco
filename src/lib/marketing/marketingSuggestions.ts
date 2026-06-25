import type { CouponSuggestionTemplate } from "@/lib/marketing/couponSuggestions";
import { COUPON_SUGGESTIONS } from "@/lib/marketing/couponSuggestions";

export type MarketingSuggestionCard = {
  id: string;
  category: "delivery" | "combo" | "welcome" | "winback" | "seasonal" | "loyalty";
  icon: "truck" | "gift" | "sparkles" | "heart" | "sun" | "star";
  accent: string;
  title: { pt: string; es: string; en: string };
  subtitle: { pt: string; es: string; en: string };
  pushTitle: { pt: string; es: string; en: string };
  pushBody: { pt: string; es: string; en: string };
  coupon: CouponSuggestionTemplate;
  /** Liga a um preset de campanha existente, se houver */
  linkedPresetKey?: string;
  recommended?: boolean;
};

export const MARKETING_SUGGESTIONS: MarketingSuggestionCard[] = [
  {
    id: "suggest_free_delivery_20",
    category: "delivery",
    icon: "truck",
    accent: "from-sky-900/30 to-sky-700/10",
    title: {
      pt: "Entrega grátis acima de 20€",
      es: "Envío gratis desde 20€",
      en: "Free delivery over €20",
    },
    subtitle: {
      pt: "Ideal para aumentar o ticket médio em entregas",
      es: "Ideal para subir el ticket medio en delivery",
      en: "Boost average delivery order value",
    },
    pushTitle: {
      pt: "Entrega grátis hoje 🛵",
      es: "¡Envío gratis hoy! 🛵",
      en: "Free delivery today 🛵",
    },
    pushBody: {
      pt: "Pedidos a partir de 20€ — use {cupao_codigo} no checkout.",
      es: "Pedidos desde 20€ — usa {cupao_codigo} al pagar.",
      en: "Orders over €20 — use {cupao_codigo} at checkout.",
    },
    coupon: COUPON_SUGGESTIONS.find((c) => c.code === "ENTREGA20")!,
    linkedPresetKey: "promo_delivery_free",
    recommended: true,
  },
  {
    id: "suggest_kebab_combo",
    category: "combo",
    icon: "gift",
    accent: "from-orange-900/30 to-orange-700/10",
    title: {
      pt: "3 kebabs — o 3.º à metade",
      es: "3 kebabs — el 3.º a mitad",
      en: "3 kebabs — 3rd half price",
    },
    subtitle: {
      pt: "Combo no produto em destaque do cardápio",
      es: "Combo en el producto destacado del menú",
      en: "Combo on your featured menu item",
    },
    pushTitle: {
      pt: "Combo especial 🥙",
      es: "¡Combo especial! 🥙",
      en: "Special combo 🥙",
    },
    pushBody: {
      pt: "Peça 3 {produto_destaque} — o 3.º com 50% off. Código {cupao_codigo}.",
      es: "Pide 3 {produto_destaque} — el 3.º con 50% dto. Código {cupao_codigo}.",
      en: "Get 3 {produto_destaque} — 3rd 50% off. Code {cupao_codigo}.",
    },
    coupon: COUPON_SUGGESTIONS.find((c) => c.code === "KEBAB3X2")!,
    linkedPresetKey: "promo_combo_kebab",
    recommended: true,
  },
  {
    id: "suggest_winback",
    category: "winback",
    icon: "heart",
    accent: "from-rose-900/30 to-rose-700/10",
    title: {
      pt: "Volta a pedir — 10% off",
      es: "Vuelve a pedir — 10% dto.",
      en: "Come back — 10% off",
    },
    subtitle: {
      pt: "Para quem não pede há 30 dias",
      es: "Para quien no pide desde hace 30 días",
      en: "For customers inactive 30 days",
    },
    pushTitle: {
      pt: "Sentimos a sua falta",
      es: "Te echamos de menos",
      en: "We miss you",
    },
    pushBody: {
      pt: "Use {cupao_codigo} — {desconto} na próxima encomenda.",
      es: "Usa {cupao_codigo} — {desconto} en tu próximo pedido.",
      en: "Use {cupao_codigo} — {desconto} on your next order.",
    },
    coupon: COUPON_SUGGESTIONS.find((c) => c.code === "VOLTA10")!,
    linkedPresetKey: "winback_30d",
  },
  {
    id: "suggest_welcome",
    category: "welcome",
    icon: "sparkles",
    accent: "from-amber-900/30 to-amber-700/10",
    title: {
      pt: "Bem-vindo — 15% na 1.ª encomenda",
      es: "Bienvenido — 15% en el 1.er pedido",
      en: "Welcome — 15% off first order",
    },
    subtitle: {
      pt: "Converte novos clientes da app",
      es: "Convierte nuevos clientes de la app",
      en: "Convert new app customers",
    },
    pushTitle: {
      pt: "Oferta de boas-vindas",
      es: "Oferta de bienvenida",
      en: "Welcome offer",
    },
    pushBody: {
      pt: "Primeira encomenda com {desconto} — código {cupao_codigo}.",
      es: "Primer pedido con {desconto} — código {cupao_codigo}.",
      en: "First order {desconto} — code {cupao_codigo}.",
    },
    coupon: COUPON_SUGGESTIONS.find((c) => c.code === "BEMVINDO15")!,
    linkedPresetKey: "welcome_2d",
  },
  {
    id: "suggest_lunch",
    category: "seasonal",
    icon: "sun",
    accent: "from-lime-900/30 to-lime-700/10",
    title: {
      pt: "Almoço — 5€ de desconto",
      es: "Almuerzo — 5€ de descuento",
      en: "Lunch — €5 off",
    },
    subtitle: {
      pt: "Pedido mínimo 18€, dias úteis ao almoço",
      es: "Pedido mínimo 18€, días laborables al mediodía",
      en: "Min €18, weekdays at lunch",
    },
    pushTitle: {
      pt: "Oferta de almoço",
      es: "Oferta de almuerzo",
      en: "Lunch deal",
    },
    pushBody: {
      pt: "Hoje: 5€ off com {cupao_codigo} (mín. 18€).",
      es: "Hoy: 5€ dto. con {cupao_codigo} (mín. 18€).",
      en: "Today: €5 off with {cupao_codigo} (min €18).",
    },
    coupon: COUPON_SUGGESTIONS.find((c) => c.code === "ALMOCO5")!,
    linkedPresetKey: "promo_lunch",
  },
  {
    id: "suggest_weekend",
    category: "seasonal",
    icon: "star",
    accent: "from-violet-900/30 to-violet-700/10",
    title: {
      pt: "Fim de semana +10%",
      es: "Fin de semana +10%",
      en: "Weekend +10%",
    },
    subtitle: {
      pt: "Push automático sábado e domingo",
      es: "Push automático sábado y domingo",
      en: "Auto push Sat & Sun",
    },
    pushTitle: {
      pt: "Promo fim-de-semana",
      es: "Promo fin de semana",
      en: "Weekend promo",
    },
    pushBody: {
      pt: "Este fim-de-semana: {desconto} com {cupao_codigo}.",
      es: "Este fin de semana: {desconto} con {cupao_codigo}.",
      en: "This weekend: {desconto} with {cupao_codigo}.",
    },
    coupon: COUPON_SUGGESTIONS.find((c) => c.code === "FIMSEMANA10")!,
    linkedPresetKey: "promo_weekend",
  },
];
