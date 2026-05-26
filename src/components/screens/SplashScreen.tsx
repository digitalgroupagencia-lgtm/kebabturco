import { useEffect, useRef, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useNavigate } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import InstallAppButton from "@/components/InstallAppButton";
import { hasMesaQrInUrl } from "@/lib/customerSession";
import { isLovableEditorPreview } from "@/lib/lovablePreview";
import { nav } from "@/lib/navPaths";

const SplashScreen = () => {
  const { setScreen } = useOrder();
  const { settings, loading: brandingLoading } = useBranding();
  const { activeLangs, t, lang } = useLanguage();
  const { theme } = useTheme();

  const navigate = useNavigate();
  const [tapCount, setTapCount] = useState(0);
  const longPressTimer = useRef<number | null>(null);

  const isDark = theme === "dark";
  const logo =
    (isDark && (settings as any)?.logo_main_dark_url) ||
    settings?.logo_main_url ||
    null;
  const brandName = settings?.company_name || "";


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPreview = params.get("preview") === "1";
    if (isPreview || isLovableEditorPreview()) {
      setScreen((params.get("screen") || "language") as Parameters<typeof setScreen>[0]);
      return;
    }
    const timer = setTimeout(() => {
      const mesaQr = hasMesaQrInUrl();
      setScreen(mesaQr ? "orderType" : activeLangs.length > 1 ? "language" : "orderType");
    }, 1800);
    return () => clearTimeout(timer);
  }, [setScreen, activeLangs.length]);

  useEffect(() => {
    if (tapCount >= 5) navigate(nav.staff());
    const reset = setTimeout(() => setTapCount(0), 2000);
    return () => clearTimeout(reset);
  }, [tapCount, navigate]);

  const openStaffArea = () => navigate(nav.staff());

  const handleLogoPressStart = () => {
    longPressTimer.current = window.setTimeout(openStaffArea, 900);
  };

  const handleLogoPressEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleLogoTap = () => {
    handleLogoPressEnd();
    setTapCount((c) => c + 1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center animate-fade-in bg-background px-6 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0, transparent 40%), radial-gradient(circle at 80% 80%, hsl(var(--accent)) 0, transparent 40%)`,
      }} />

      <div
        className="flex flex-col items-center animate-scale-in min-h-[14rem]"
        onClick={handleLogoTap}
        onTouchStart={handleLogoPressStart}
        onTouchEnd={handleLogoPressEnd}
        onMouseDown={handleLogoPressStart}
        onMouseUp={handleLogoPressEnd}
        onMouseLeave={handleLogoPressEnd}
        role="presentation"
      >
        {!brandingLoading && logo && (
          <img
            src={logo}
            alt={brandName}
            className="w-40 h-40 object-contain drop-shadow-xl mb-6"
          />
        )}
        {!brandingLoading && brandName && (
          <h1 className="text-3xl font-black text-foreground tracking-[0.15em]">{brandName}</h1>
        )}
        {!brandingLoading && (
          <p className="text-muted-foreground mt-2 text-sm tracking-widest uppercase">{t("splashTagline")}</p>
        )}
      </div>


      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-secondary overflow-hidden">
        <div className="splash-shimmer absolute inset-0" />
      </div>

      <div className="absolute bottom-4 left-0 right-0 px-6">
        <InstallAppButton lang={lang} />
      </div>
    </div>
  );
};

export default SplashScreen;
