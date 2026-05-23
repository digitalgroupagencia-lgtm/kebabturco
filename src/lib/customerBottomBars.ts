import type { Screen } from "@/contexts/OrderContext";

/** Ecrãs iniciais — carrinho flutuante tapa bandeiras e opções. */
export const CART_BAR_HIDDEN_SCREENS = new Set<Screen>([
  "splash",
  "language",
  "storeSelect",
  "orderType",
  "review",
  "payment",
  "confirmation",
  "product",
  "tracking",
  "account",
]);

/** Pedido activo — barra para reabrir acompanhamento após recarregar. */
export const ACTIVE_ORDER_BAR_SCREENS = new Set<Screen>([
  "splash",
  "language",
  "storeSelect",
  "orderType",
  "home",
  "product",
]);
