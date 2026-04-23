import { useEffect, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useNavigate } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingContext";
import { useLanguage } from "@/contexts/LanguageContext";
import elreyLogo from "@/assets/elrey-logo.png";

const SplashScreen = () => {
  const { setScreen } = useOrder();
  const { settings } = useBranding();
  const { activeLangs } = useLanguage();
  const navigate = useNavigate();
  const [tapCount, setTapCount] = useState(0);

  const logo = settings?.logo_main_url || elreyLogo;
  const brandName = settings?.company_name || "EL REY";

  useEffect(() => {
    const timer = setTimeout(() => {
      // Se houver mais de 1 idioma ativo, abre seleção de idioma primeiro
      setScreen(activeLangs.length > 1 ? "language" : "orderType");
    }, 1800);
    return () => clearTimeout(timer);
  }, [setScreen, activeLangs.length]);

  useEffect(() => {
    if (tapCount >= 5) navigate("/auth");
    const reset = setTimeout(() => setTapCount(0), 2000);
    return () => clearTimeout(reset);
  }, [tapCount, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background animate-fade-in px-6 relative overflow-hidden">
      <button
        aria-hidden
        tabIndex={-1}
        className="absolute top-0 right-0 w-16 h-16 z-50"
        onClick={() => setTapCount((c) => c + 1)}
        style={{ WebkitTapHighlightColor: "transparent", background: "transparent", border: "none" }}
      />

      <div className="absolute inset-0 -z-10 opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0, transparent 40%), radial-gradient(circle at 80% 80%, hsl(var(--accent)) 0, transparent 40%)`,
      }} />

      <div className="flex flex-col items-center animate-scale-in">
        <img
          src={logo}
          alt={brandName}
          className="w-40 h-40 object-contain drop-shadow-xl mb-6"
        />
        <h1 className="text-3xl font-black text-foreground tracking-[0.15em]">{brandName}</h1>
        <p className="text-muted-foreground mt-2 text-sm tracking-widest uppercase">Kebab · Pizza · Burger</p>
      </div>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-secondary overflow-hidden">
        <div className="splash-shimmer absolute inset-0" />
      </div>
    </div>
  );
};

export default SplashScreen;
