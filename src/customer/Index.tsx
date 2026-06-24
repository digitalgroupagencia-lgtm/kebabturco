import { lazy, Suspense, useEffect } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/customer/contexts/CartContext";
import { OrderProvider, useOrder } from "@/contexts/OrderContext";
import CustomerBottomDock from "@/customer/components/CustomerBottomDock";
import CustomerTabBar from "@/customer/components/CustomerTabBar";
import SplashScreen from "@/customer/screens/SplashScreen";
import LanguageScreen from "@/customer/screens/LanguageScreen";
import StoreSelectionScreen from "@/customer/screens/StoreSelectionScreen";
import OrderTypeScreen from "@/customer/screens/OrderTypeScreen";
import CustomerScreenErrorBoundary from "@/customer/components/CustomerScreenErrorBoundary";
import DomainNotConfiguredScreen from "@/customer/screens/DomainNotConfiguredScreen";
import PageSpinner from "@/components/PageSpinner";
import InlineScreenSpinner from "@/components/InlineScreenSpinner";
import ProductScreen from "@/customer/screens/ProductScreen";
import HomeScreen from "@/customer/screens/HomeScreen";
import ReviewScreen from "@/customer/screens/ReviewScreen";
import PaymentScreen from "@/customer/screens/PaymentScreen";
import CashPendingScreen from "@/customer/screens/CashPendingScreen";
import ConfirmationScreen from "@/customer/screens/ConfirmationScreen";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { usePreviewBootstrap } from "@/hooks/usePreviewBootstrap";
import CustomerPushPromptHost from "@/customer/components/CustomerPushPromptHost";
import { useBranding } from "@/contexts/BrandingContext";
import { dismissBootShell } from "@/lib/bootShell";

const OrderTrackingScreen = lazy(() => import("@/customer/screens/OrderTrackingScreen"));
const CustomerAccountScreen = lazy(() => import("@/customer/screens/CustomerAccountScreen"));

const PreviewBootstrap = () => {
  const { storeId, loading } = useResolvedStore();
  usePreviewBootstrap(loading ? "" : storeId ?? "");
  return null;
};

const LazyScreen = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageSpinner />}>{children}</Suspense>
);

const LazyInlineScreen = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<InlineScreenSpinner />}>{children}</Suspense>
);

/** LanguageScreen dismisses its own boot overlay; other entry screens dismiss here. */
const CustomerBootDismiss = () => {
  const { screen } = useOrder();
  const { storeId, loading: storeLoading } = useResolvedStore();
  const { loading: brandingLoading } = useBranding();

  useEffect(() => {
    if (screen === "language") return;
    if (storeLoading || brandingLoading) return;
    if (!storeId && screen !== "splash") return;
    dismissBootShell();
  }, [screen, storeLoading, brandingLoading, storeId]);

  return null;
};

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
          <HomeScreen />
        </CustomerScreenErrorBoundary>
      );
    case "product":
      return (
        <CustomerScreenErrorBoundary scope="product">
          <ProductScreen />
        </CustomerScreenErrorBoundary>
      );
    case "review":
      return (
        <CustomerScreenErrorBoundary scope="checkout">
          <ReviewScreen />
        </CustomerScreenErrorBoundary>
      );
    case "payment":
      return (
        <CustomerScreenErrorBoundary scope="checkout">
          <PaymentScreen />
        </CustomerScreenErrorBoundary>
      );
    case "cashPending":
      return (
        <CustomerScreenErrorBoundary scope="checkout">
          <CashPendingScreen />
        </CustomerScreenErrorBoundary>
      );
    case "confirmation":
      return (
        <CustomerScreenErrorBoundary scope="checkout">
          <ConfirmationScreen />
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
    <div className="customer-shell relative mx-auto grid h-full min-h-0 w-full max-w-md md:max-w-none grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-background">
      <CustomerBootDismiss />
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <ScreenRouter />
      </div>
      <CustomerScreenErrorBoundary scope="bootstrap">
        <CustomerBottomDock />
        <CustomerTabBar />
        <CustomerPushPromptHost />
      </CustomerScreenErrorBoundary>
    </div>
);

// Kiosk Self-Service App
const Index = () => {
  return (
    <LanguageProvider>
      <CartProvider>
        <OrderProvider>
          <PreviewBootstrap />
          <CustomerShell />
        </OrderProvider>
      </CartProvider>
    </LanguageProvider>
  );
};

export default Index;

