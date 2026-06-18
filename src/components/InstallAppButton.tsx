import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { isAdminPreviewMode } from "@/lib/tenantPreview";

/**
 * Links das lojas oficiais do Kebab Turco.
 * Atualize aqui se as URLs mudarem.
 */
const APP_STORE_URL =
  "https://apps.apple.com/app/kebab-turco/id6753089684";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=app.kebabturco.client";

const TEXT: Record<string, { appStore: string; playStore: string }> = {
  pt: { appStore: "App Store", playStore: "Google Play" },
  en: { appStore: "App Store", playStore: "Google Play" },
  es: { appStore: "App Store", playStore: "Google Play" },
  fr: { appStore: "App Store", playStore: "Google Play" },
};

interface Props {
  lang?: string;
  variant?: "primary" | "subtle";
}

/** Detecta se já estamos dentro do app nativo (Capacitor). */
function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  if (cap?.platform && cap.platform !== "web") return true;
  // Fallback por user-agent (Capacitor WebView injeta " kebabturco/" via plugin se configurado)
  return /CapacitorApp|kebabturco-native/i.test(navigator.userAgent || "");
}

const InstallAppButton = ({ lang = "es", variant = "primary" }: Props) => {
  const { isStandalone } = useInstallPrompt();
  const t = TEXT[lang] || TEXT.es;

  if (isAdminPreviewMode()) return null;
  // Já instalado (PWA standalone) ou já dentro do app nativo → não mostrar nada
  if (isStandalone) return null;
  if (isNativeApp()) return null;

  const isSubtle = variant === "subtle";

  return (
    <div className={`w-full max-w-md mx-auto flex items-center justify-center gap-2 ${isSubtle ? "" : ""}`}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.appStore}
        className={
          isSubtle
            ? "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border/35 bg-transparent text-muted-foreground text-xs font-medium active:scale-[0.98] transition-transform"
            : "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-black text-white shadow-[0_8px_22px_-10px_rgba(0,0,0,0.55)] active:scale-[0.97] transition-transform"
        }
      >
        <svg
          viewBox="0 0 384 512"
          aria-hidden
          className={isSubtle ? "w-4 h-4" : "w-5 h-5"}
          fill="currentColor"
        >
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM260.6 110.1c25.6-30.4 23.3-58 22.5-67.9-22.6 1.3-48.7 15.4-63.6 32.7-16.4 18.6-26 41.6-23.9 67.4 24.4 1.9 46.8-11.7 65-32.2z" />
        </svg>
        <div className="flex flex-col items-start leading-tight">
          <span className={isSubtle ? "text-[9px] uppercase opacity-70" : "text-[9px] uppercase opacity-80"}>
            Download
          </span>
          <span className={isSubtle ? "text-[11px] font-bold" : "text-sm font-bold"}>
            {t.appStore}
          </span>
        </div>
      </a>

      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.playStore}
        className={
          isSubtle
            ? "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border/35 bg-transparent text-muted-foreground text-xs font-medium active:scale-[0.98] transition-transform"
            : "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-black text-white shadow-[0_8px_22px_-10px_rgba(0,0,0,0.55)] active:scale-[0.97] transition-transform"
        }
      >
        <svg
          viewBox="0 0 512 512"
          aria-hidden
          className={isSubtle ? "w-4 h-4" : "w-5 h-5"}
        >
          <path fill="#34A853" d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1z" />
          <path fill="#FBBC04" d="m104.6 499 220.7-221.3-60.1-60.1L104.6 499z" />
          <path fill="#4285F4" d="m480.2 256.2-94.8-54.5-67.6 67.6 67.5 67.5 95-54.5c28.4-16.5 28.4-9.7-.1-26.1z" />
          <path fill="#EA4335" d="M104.6 13c-4.4 1.6-8.4 3.8-11.7 6.4l216.5 216.4L385.4 174.4 104.6 13z" />
        </svg>
        <div className="flex flex-col items-start leading-tight">
          <span className={isSubtle ? "text-[9px] uppercase opacity-70" : "text-[9px] uppercase opacity-80"}>
            Get it on
          </span>
          <span className={isSubtle ? "text-[11px] font-bold" : "text-sm font-bold"}>
            {t.playStore}
          </span>
        </div>
      </a>
    </div>
  );
};

export default InstallAppButton;
