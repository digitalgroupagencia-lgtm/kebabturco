import type { Screen } from "@/contexts/OrderContext";

/** Ecrãs com menu fixo no rodapé (Inicio, Pedidos, Carrito, Cuenta). */
export const TAB_BAR_VISIBLE_SCREENS = new Set<Screen>(["home", "review", "account", "tracking"]);

/** Ecrãs iniciais — carrinho flutuante tapa bandeiras e opções. */
export const CART_BAR_HIDDEN_SCREENS = new Set<Screen>([
  "splash",
  "language",
  "storeSelect",
  "orderType",
  "home",
  "review",
  "payment",
  "confirmation",
  "product",
  "tracking",
  "account",
]);

/** Pedido activo — barra para reabrir acompanhamento após recarregar (não no ecrã de personalização). */
export const ACTIVE_ORDER_BAR_SCREENS = new Set<Screen>([
  "splash",
  "language",
  "storeSelect",
  "orderType",
  "home",
]);
