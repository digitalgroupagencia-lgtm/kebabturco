/**
 * Vendedor usa exactamente o mesmo fluxo do cliente.
 * `SellerModeProvider` faz com que o PaymentScreen substitua o checkout
 * por um form de registo de pedido (sem Stripe).
 */
import { lazy, Suspense } from "react";
import { useSellerContext } from "@/hooks/useSellerContext";
import { SellerModeProvider } from "@/contexts/SellerModeContext";
import PageSpinner from "@/components/PageSpinner";

const CustomerIndex = lazy(() => import("@/customer/Index"));

const SellerNewOrder = () => {
  const { userId, fullName } = useSellerContext();
  return (
    <SellerModeProvider sellerId={userId ?? null} sellerName={fullName ?? "Vendedor"}>
      <Suspense fallback={<PageSpinner />}>
        <CustomerIndex />
      </Suspense>
    </SellerModeProvider>
  );
};

export default SellerNewOrder;
