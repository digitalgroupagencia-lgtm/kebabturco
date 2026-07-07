import { useEffect, useRef } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import InstallAppButton from "@/components/InstallAppButton";
import CustomerSplashSkeleton from "@/customer/components/CustomerSplashSkeleton";
import { hasMesaQrInUrl } from "@/lib/customerSession";
import { isLovableEditorPreview } from "@/lib/lovablePreview";
import { useStaffLogoGesture } from "@/hooks/useStaffLogoGesture";
import {
  STOREFRONT_FOOTER_BOTTOM_CLASS,
  STOREFRONT_FOOTER_BOTTOM_STYLE,
} from "@/lib/storefrontFooter";

const SplashScreen = () => {
  const { setScreen } = useOrder();
  const { settings, loading: brandingLoading } = useBranding();
  const { activeLangs, t, lang } = useLanguage();
  const { theme } = useTheme();
  const logoGesture = useStaffLogoGesture();
  const bootTimerRef = useRef<number | null>(null);

  const isDark = theme === "dark";
  const logo =
    (isDark && (settings as { logo_main_dark_url?: string })?.logo_main_dark_url) ||
    settings?.logo_main_url ||
    "/placeholder.svg";
  const brandName = settings?.company_name || "Template Restaurant";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPreview = params.get("preview") === "1";
    if (isPreview || isLovableEditorPreview()) {
      setScreen((params.get("screen") || "language") as Parameters<typeof setScreen>[0]);
      return;
    }
    if (params.get("screen") === "language") {
      setScreen("language");
      return;
    }
    bootTimerRef.current = window.setTimeout(() => {
      const mesaQr = hasMesaQrInUrl();
      setScreen(mesaQr ? "orderType" : activeLangs.length > 1 ? "language" : "orderType");
    }, 900);
    return () => {
      if (bootTimerRef.current) window.clearTimeout(bootTimerRef.current);
    };
  }, [setScreen, activeLangs.length]);

  if (brandingLoading) {
    return <CustomerSplashSkeleton />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center animate-fade-in bg-background px-6 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0, transparent 40%), radial-gradient(circle at 80% 80%, hsl(var(--accent)) 0, transparent 40%)`,
      }} />

      <div
        className="flex flex-col items-center animate-scale-in min-h-[14rem] select-none touch-none cursor-pointer"
        {...logoGesture}
        role="presentation"
      >
        {logo && (
          <img
            src={logo}
            alt={brandName}
            className="w-40 h-40 object-contain drop-shadow-xl mb-6 pointer-events-none"
            draggable={false}
          />
        )}
        {brandName && (
          <h1 className="text-3xl font-black text-foreground tracking-[0.15em]">{brandName}</h1>
        )}
        <p className="text-muted-foreground mt-2 text-sm tracking-widest uppercase">{t("splashTagline")}</p>
      </div>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-secondary overflow-hidden">
        <div className="splash-shimmer absolute inset-0" />
      </div>

      <div
        className={`absolute left-0 right-0 px-4 ${STOREFRONT_FOOTER_BOTTOM_CLASS}`}
        style={STOREFRONT_FOOTER_BOTTOM_STYLE}
      >
        <InstallAppButton lang={lang} />
      </div>
    </div>
  );
};

export default SplashScreen;
