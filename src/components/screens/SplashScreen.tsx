import { useEffect } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { Loader2 } from "lucide-react";

const SplashScreen = () => {
  const { setScreen } = useOrder();

  useEffect(() => {
    const timer = setTimeout(() => setScreen("orderType"), 2000);
    return () => clearTimeout(timer);
  }, [setScreen]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background animate-fade-in">
      <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-6">
        <span className="text-3xl font-black text-primary-foreground">K</span>
      </div>
      <h1 className="text-3xl font-black text-foreground tracking-tight">KIOSK</h1>
      <p className="text-muted-foreground mt-1 text-base">Self-Service</p>
      <Loader2 className="w-8 h-8 text-primary animate-spin mt-8" />
    </div>
  );
};

export default SplashScreen;
