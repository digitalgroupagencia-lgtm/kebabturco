import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { OrderProvider, useOrder } from "@/contexts/OrderContext";
import CartBar from "@/components/CartBar";
import SplashScreen from "@/components/screens/SplashScreen";
import OrderTypeScreen from "@/components/screens/OrderTypeScreen";
import HomeScreen from "@/components/screens/HomeScreen";
import ProductScreen from "@/components/screens/ProductScreen";
import ReviewScreen from "@/components/screens/ReviewScreen";
import PaymentScreen from "@/components/screens/PaymentScreen";
import ConfirmationScreen from "@/components/screens/ConfirmationScreen";

const ScreenRouter = () => {
  const { screen } = useOrder();

  switch (screen) {
    case "splash": return <SplashScreen />;
    case "orderType": return <OrderTypeScreen />;
    case "home": return <HomeScreen />;
    case "product": return <ProductScreen />;
    case "review": return <ReviewScreen />;
    case "payment": return <PaymentScreen />;
    case "confirmation": return <ConfirmationScreen />;
    default: return <SplashScreen />;
  }
};

const Index = () => (
  <LanguageProvider>
    <CartProvider>
      <OrderProvider>
        <div className="max-w-md mx-auto min-h-[100dvh] bg-background relative overflow-hidden shadow-lg">
          <ScreenRouter />
          <CartBar />
        </div>
      </OrderProvider>
    </CartProvider>
  </LanguageProvider>
);

export default Index;
