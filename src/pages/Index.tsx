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

const ScreenRouter = () => {
  const { screen } = useOrder();

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

// Kiosk Self-Service App
const Index = () => (
  <TotemErrorBoundary>
  <LanguageProvider>
    <CartProvider>
      <OrderProvider>
        <div className="max-w-md mx-auto min-h-screen min-h-[100dvh] md:h-full md:min-h-0 bg-background relative shadow-lg">
          <ScreenRouter />
          <CustomerBottomDock />
          <AppFooter />
        </div>
      </OrderProvider>
    </CartProvider>
  </LanguageProvider>
  </TotemErrorBoundary>
);

export default Index;
