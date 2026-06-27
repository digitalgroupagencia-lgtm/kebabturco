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
import { useSellerMode } from "@/contexts/SellerModeContext";
import { cn } from "@/lib/utils";
import { useCart } from "@/customer/contexts/CartContext";
import {
  resolveSellerInitialScreen,
  saveSellerSession,
  loadSellerSession,
} from "@/lib/sellerSession";

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

/** Em modo vendedor salta splash/idioma e restaura o ecrã guardado. */
const SellerCustomerBootstrap = () => {
  const seller = useSellerMode();
  const { screen, setScreen, setSelectedProductId, selectedProductId } = useOrder();
  const { storeId, loading } = useResolvedStore();

  useEffect(() => {
    if (!seller.active || loading || !storeId) return;

    const bootstrapScreens = new Set(["splash", "language", "storeSelect", "orderType"]);
    if (bootstrapScreens.has(screen)) {
      const next = resolveSellerInitialScreen(storeId);
      setScreen(next);
      const session = loadSellerSession();
      if (next === "product" && session?.selectedProductId && !selectedProductId) {
        setSelectedProductId(session.selectedProductId);
      }
    }
  }, [seller.active, loading, storeId, screen, setScreen, setSelectedProductId, selectedProductId]);

  return null;
};

/** Guarda ecrã e contexto do vendedor para recuperar após recarregar. */
const SellerSessionPersist = () => {
  const seller = useSellerMode();
  const { screen, selectedProductId, selectedCategory } = useOrder();
  const { storeId, loading } = useResolvedStore();

  useEffect(() => {
    if (!seller.active || loading || !storeId) return;
    if (!["home", "product", "review", "payment"].includes(screen)) return;
    saveSellerSession({
      screen,
      selectedProductId,
      selectedCategory,
      storeId,
    });
  }, [seller.active, loading, storeId, screen, selectedProductId, selectedCategory]);

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

const CustomerShell = () => {
  const seller = useSellerMode();

  return (
    <div
      className={cn(
        "customer-shell relative mx-auto h-full min-h-0 w-full max-w-md overflow-hidden bg-background md:max-w-none",
        seller.active
          ? "seller-menu-shell grid grid-rows-[minmax(0,1fr)_auto] md:flex md:flex-col md:overflow-y-auto md:overscroll-y-contain md:pb-16"
          : "grid grid-rows-[minmax(0,1fr)_auto]",
      )}
    >
      <SellerCustomerBootstrap />
      <SellerSessionPersist />
      <CustomerBootDismiss />
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden",
          seller.active && "md:h-auto md:min-h-min md:overflow-visible",
        )}
      >
        <ScreenRouter />
      </div>
      <CustomerScreenErrorBoundary scope="bootstrap">
        <CustomerBottomDock />
        {!seller.active && <CustomerTabBar />}
        {!seller.active && <CustomerPushPromptHost />}
      </CustomerScreenErrorBoundary>
    </div>
  );
};

// Kiosk Self-Service App
const Index = () => {
  return (
    <LanguageProvider>
      <CartProvider>
        <OrderProvider>
          <div className="flex h-full min-h-0 flex-col">
            <PreviewBootstrap />
            <CustomerShell />
          </div>
        </OrderProvider>
      </CartProvider>
    </LanguageProvider>
  );
};

export default Index;

