import { useEffect } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { Loader2 } from "lucide-react";

const SplashScreen = () => {
  const { setScreen } = useOrder();

  useEffect(() => {
    const timer = setTimeout(() => setScreen("language"), 1600);
    return () => clearTimeout(timer);
  }, [setScreen]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background animate-fade-in px-6">
      <div className="w-24 h-24 rounded-[28px] bg-primary flex items-center justify-center shadow-lg mb-6">
        <span className="text-primary-foreground text-5xl font-black tracking-tight">K</span>
      </div>
      <h1 className="text-4xl font-black text-foreground tracking-tight">Kiosk</h1>
      <p className="text-muted-foreground mt-2 text-base">Fast food self-service</p>
      <Loader2 className="w-8 h-8 text-primary animate-spin mt-8" />
    </div>
  );
};

export default SplashScreen;
