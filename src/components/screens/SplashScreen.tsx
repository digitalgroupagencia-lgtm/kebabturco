import { useEffect, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const SplashScreen = () => {
  const { setScreen } = useOrder();
  const navigate = useNavigate();
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setScreen("orderType"), 1600);
    return () => clearTimeout(timer);
  }, [setScreen]);

  // 5 toques rápidos no canto superior direito para abrir login admin
  useEffect(() => {
    if (tapCount >= 5) {
      navigate("/auth");
    }
    const reset = setTimeout(() => setTapCount(0), 2000);
    return () => clearTimeout(reset);
  }, [tapCount, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background animate-fade-in px-6 relative">
      {/* Área invisível no canto superior direito - 5 toques para acessar painel */}
      <button
        aria-hidden
        tabIndex={-1}
        className="absolute top-0 right-0 w-16 h-16 z-50"
        onClick={() => setTapCount((c) => c + 1)}
        style={{ WebkitTapHighlightColor: "transparent", background: "transparent", border: "none" }}
      />
      <div className="w-24 h-24 rounded-[28px] bg-primary flex items-center justify-center shadow-lg mb-6">
        <span className="text-primary-foreground text-4xl font-black tracking-tight">ER</span>
      </div>
      <h1 className="text-4xl font-black text-foreground tracking-tight">EL REY</h1>
      <p className="text-muted-foreground mt-2 text-base">Kebab · Pizza · Burger</p>
      <Loader2 className="w-8 h-8 text-primary animate-spin mt-8" />
    </div>
  );
};

export default SplashScreen;
