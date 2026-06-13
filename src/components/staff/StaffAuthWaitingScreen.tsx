import { Loader2 } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  title: string;
  message?: string;
};

/** Ecrã de espera com marca do restaurante (login Google, validação, etc.). */
export default function StaffAuthWaitingScreen({ title, message }: Props) {
  const { settings } = useBranding();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const brandLogo =
    (isDark && (settings as { logo_main_dark_url?: string })?.logo_main_dark_url) ||
    settings?.logo_main_url ||
    null;
  const brandName = settings?.company_name || "Kebab Turco";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <main className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
        <div className="w-full max-w-sm text-center">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName}
              className="mx-auto mb-6 h-24 w-24 object-contain drop-shadow-lg"
            />
          ) : (
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-black text-primary">
              {brandName.slice(0, 1).toUpperCase()}
            </div>
          )}

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{brandName}</p>
          <h1 className="mt-3 text-xl font-bold text-foreground">{title}</h1>

          {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}

          <div className="mt-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      </main>
    </div>
  );
}
