import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { OrderProvider, useOrder } from "@/contexts/OrderContext";
import CustomerBottomDock from "@/components/CustomerBottomDock";
import AppFooter from "@/components/AppFooter";
import SplashScreen from "@/components/screens/SplashScreen";
import LanguageScreen from "@/components/screens/LanguageScreen";
import StoreSelectionScreen from "@/components/screens/StoreSelectionScreen";
import OrderTypeScreen from "@/components/screens/OrderTypeScreen";
import HomeScreen from "@/components/screens/HomeScreen";
import ProductScreen from "@/components/screens/ProductScreen";
import ReviewScreen from "@/components/screens/ReviewScreen";
import PaymentScreen from "@/components/screens/PaymentScreen";
import ConfirmationScreen from "@/components/screens/ConfirmationScreen";
import OrderTrackingScreen from "@/components/screens/OrderTrackingScreen";
import CustomerAccountScreen from "@/components/screens/CustomerAccountScreen";
import TotemErrorBoundary from "@/components/TotemErrorBoundary";
import DomainNotConfiguredScreen from "@/components/screens/DomainNotConfiguredScreen";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { isAdminPreviewMode } from "@/lib/tenantPreview";
import { usePreviewBootstrap } from "@/hooks/usePreviewBootstrap";

const PreviewBootstrap = () => {
  const { storeId, loading } = useResolvedStore();
  usePreviewBootstrap(loading ? "" : storeId ?? "");
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
      return <SplashScreen />;
    case "language":
      return <LanguageScreen />;
    case "storeSelect":
      return <StoreSelectionScreen />;
    case "orderType":
      return <OrderTypeScreen />;
    case "home":
      return <HomeScreen />;
    case "product":
      return <ProductScreen />;
    case "review":
      return <ReviewScreen />;
    case "payment":
      return <PaymentScreen />;
    case "confirmation":
      return <ConfirmationScreen />;
    case "tracking":
      return <OrderTrackingScreen />;
    case "account":
      return <CustomerAccountScreen />;
    default:
      return <SplashScreen />;
  }
};

const CustomerShell = () => {
  const showChrome = !isAdminPreviewMode();

  return (
    <div className="customer-shell relative mx-auto flex h-full min-h-0 w-full max-w-md flex-col overflow-hidden bg-background md:shadow-lg">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="h-full min-h-0 flex-1">
          <ScreenRouter />
        </div>
        {showChrome && <AppFooter />}
      </div>
      {showChrome && <CustomerBottomDock />}
    </div>
  );
};

// Kiosk Self-Service App
const Index = () => (
  <TotemErrorBoundary>
    <LanguageProvider>
      <CartProvider>
        <OrderProvider>
          <PreviewBootstrap />
          <CustomerShell />
        </OrderProvider>
      </CartProvider>
    </LanguageProvider>
  </TotemErrorBoundary>
);

export default Index;
