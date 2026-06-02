import { createContext, useContext, type ReactNode } from "react";

/**
 * Indica que o fluxo do cardápio está a ser usado por um vendedor autenticado,
 * não por um cliente. PaymentScreen verifica este contexto para substituir o
 * checkout (Stripe/cash) por um form de registo de pedido.
 *
 * `null` (default) → fluxo cliente normal. Não afecta o boundary do cliente.
 */
export interface SellerMode {
  active: boolean;
  sellerId: string | null;
  sellerName: string;
}

const Ctx = createContext<SellerMode>({ active: false, sellerId: null, sellerName: "" });

export const SellerModeProvider = ({
  children,
  sellerId,
  sellerName,
}: {
  children: ReactNode;
  sellerId: string | null;
  sellerName: string;
}) => (
  <Ctx.Provider value={{ active: true, sellerId, sellerName }}>{children}</Ctx.Provider>
);

export const useSellerMode = () => useContext(Ctx);
