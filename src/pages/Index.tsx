import { lazy, Suspense } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { OrderProvider, useOrder } from "@/contexts/OrderContext";
import CustomerBottomDock from "@/components/CustomerBottomDock";
import SplashScreen from "@/components/screens/SplashScreen";
import LanguageScreen from "@/components/screens/LanguageScreen";
import StoreSelectionScreen from "@/components/screens/StoreSelectionScreen";
import OrderTypeScreen from "@/components/screens/OrderTypeScreen";
import CustomerScreenErrorBoundary from "@/components/CustomerScreenErrorBoundary";
import DomainNotConfiguredScreen from "@/components/screens/DomainNotConfiguredScreen";
import PageSpinner from "@/components/PageSpinner";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { usePreviewBootstrap } from "@/hooks/usePreviewBootstrap";

const HomeScreen = lazy(() => import("@/components/screens/HomeScreen"));
const ProductScreen = lazy(() => import("@/components/screens/ProductScreen"));
const ReviewScreen = lazy(() => import("@/components/screens/ReviewScreen"));
const PaymentScreen = lazy(() => import("@/components/screens/PaymentScreen"));
const CashPendingScreen = lazy(() => import("@/components/screens/CashPendingScreen"));
const ConfirmationScreen = lazy(() => import("@/components/screens/ConfirmationScreen"));
const OrderTrackingScreen = lazy(() => import("@/components/screens/OrderTrackingScreen"));
const CustomerAccountScreen = lazy(() => import("@/components/screens/CustomerAccountScreen"));

const PreviewBootstrap = () => {
  const { storeId, loading } = useResolvedStore();
  usePreviewBootstrap(loading ? "" : storeId ?? "");
  return null;
};

const LazyScreen = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageSpinner />}>{children}</Suspense>
);

const ScreenRouter = () => {
  const { screen } = useOrder();
  const { storeId, loading } = useResolvedStore();

  if (!loading && !storeId) {
    return <DomainNotConfiguredScreen hostname={window.location.hostname} />;
  }

  switch (screen) {
    case "splash":
      return (
        <CustomerScreenErrorBoundary scope="bootstrap">
          <SplashScreen />
        </CustomerScreenErrorBoundary>
      );
    case "language":
      return (
        <CustomerScreenErrorBoundary scope="bootstrap">
          <LanguageScreen />
        </CustomerScreenErrorBoundary>
      );
    case "storeSelect":
      return (
        <CustomerScreenErrorBoundary scope="bootstrap">
          <StoreSelectionScreen />
        </CustomerScreenErrorBoundary>
      );
    case "orderType":
      return (
        <CustomerScreenErrorBoundary scope="bootstrap">
          <OrderTypeScreen />
        </CustomerScreenErrorBoundary>
      );
    case "home":
      return (
        <CustomerScreenErrorBoundary scope="home">
          <LazyScreen>
            <HomeScreen />
          </LazyScreen>
        </CustomerScreenErrorBoundary>
      );
    case "product":
      return (
        <CustomerScreenErrorBoundary scope="product">
          <LazyScreen>
            <ProductScreen />
          </LazyScreen>
        </CustomerScreenErrorBoundary>
      );
    case "review":
      return (
        <CustomerScreenErrorBoundary scope="checkout">
          <LazyScreen>
            <ReviewScreen />
          </LazyScreen>
        </CustomerScreenErrorBoundary>
      );
    case "payment":
      return (
        <CustomerScreenErrorBoundary scope="checkout">
          <LazyScreen>
            <PaymentScreen />
          </LazyScreen>
        </CustomerScreenErrorBoundary>
      );
    case "cashPending":
      return (
        <CustomerScreenErrorBoundary scope="checkout">
          <LazyScreen>
            <CashPendingScreen />
          </LazyScreen>
        </CustomerScreenErrorBoundary>
      );
    case "confirmation":
      return (
        <CustomerScreenErrorBoundary scope="checkout">
          <LazyScreen>
            <ConfirmationScreen />
          </LazyScreen>
        </CustomerScreenErrorBoundary>
      );
    case "tracking":
      return (
        <CustomerScreenErrorBoundary scope="checkout">
          <LazyScreen>
            <OrderTrackingScreen />
          </LazyScreen>
        </CustomerScreenErrorBoundary>
      );
    case "account":
      return (
        <CustomerScreenErrorBoundary scope="bootstrap">
          <LazyScreen>
            <CustomerAccountScreen />
          </LazyScreen>
        </CustomerScreenErrorBoundary>
      );
    default:
      return (
        <CustomerScreenErrorBoundary scope="bootstrap">
          <SplashScreen />
        </CustomerScreenErrorBoundary>
      );
  }
};

const CustomerShell = () => (
    <div className="customer-shell relative mx-auto flex h-full min-h-0 w-full max-w-md flex-col overflow-hidden bg-background md:shadow-lg">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="h-full min-h-0 flex-1">
          <ScreenRouter />
        </div>
      </div>
      <CustomerScreenErrorBoundary scope="bootstrap">
        <CustomerBottomDock />
      </CustomerScreenErrorBoundary>
    </div>
);

// Kiosk Self-Service App
const Index = () => (
  <LanguageProvider>
    <CartProvider>
      <OrderProvider>
        <PreviewBootstrap />
        <CustomerShell />
      </OrderProvider>
    </CartProvider>
  </LanguageProvider>
);

export default Index;
