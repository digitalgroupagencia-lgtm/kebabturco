import { useEffect } from "react";
import { useOrder } from "@/contexts/OrderContext";

const SplashScreen = () => {
  const { setScreen } = useOrder();

  useEffect(() => {
    const timer = setTimeout(() => setScreen("language"), 2000);
    return () => clearTimeout(timer);
  }, [setScreen]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background animate-fade-in">
      <div className="text-6xl mb-6">🍔</div>
      <h1 className="text-4xl font-black text-primary tracking-tight">KIOSK</h1>
      <p className="text-muted-foreground mt-2 text-lg">Self-Service</p>
      <div className="mt-8 w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default SplashScreen;
