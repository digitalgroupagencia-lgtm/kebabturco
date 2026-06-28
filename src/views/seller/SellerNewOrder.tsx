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
  const { userId, fullName, storeId, loading } = useSellerContext();

  if (loading || !userId || !storeId) {
    return <PageSpinner />;
  }

  return (
    <SellerModeProvider sellerId={userId} sellerName={fullName ?? "Vendedor"}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <Suspense fallback={<PageSpinner />}>
          <CustomerIndex />
        </Suspense>
      </div>
    </SellerModeProvider>
  );
};

export default SellerNewOrder;
