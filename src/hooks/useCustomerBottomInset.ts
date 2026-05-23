import { useCart } from "@/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { useActiveOrder } from "@/features/customer/useActiveOrder";
import { ACTIVE_ORDER_BAR_SCREENS, CART_BAR_HIDDEN_SCREENS } from "@/lib/customerBottomBars";

/** Espaço reservado em baixo para o dock não tapar conteúdo. */
export function useCustomerBottomInset(): number {
  const { screen } = useOrder();
  const { totalItems } = useCart();
  const { hasActiveOrder } = useActiveOrder();

  const showActiveOrder = hasActiveOrder && ACTIVE_ORDER_BAR_SCREENS.has(screen);
  const showCart = totalItems > 0 && !CART_BAR_HIDDEN_SCREENS.has(screen);

  let px = 16;
  if (showActiveOrder) px += 64;
  if (showCart) px += 64;
  if (showActiveOrder && showCart) px += 8;
  return px;
}
