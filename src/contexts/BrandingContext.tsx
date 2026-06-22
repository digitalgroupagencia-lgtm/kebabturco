import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import {
  applyBrandWineTokens,
  applyBrowserChromeColor,
  hexToHslParts,
  hslString,
  KEBAB_OFFICIAL_WINE_HEX,
  LEGACY_BRAND_RED_HEXES,
} from "@/lib/brandTokens";
import { bumpAppCache } from "@/lib/appCacheBust";
import { useTheme } from "@/contexts/ThemeContext";
import { isAdminPreviewMode, PREVIEW_MESSAGE_TYPE } from "@/lib/tenantPreview";

export type CompanySettings = Tables<"company_settings">;

interface BrandingContextType {
  settings: CompanySettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

function resolveBrandHex(hex: string | null | undefined): string {
  const normalized = hex?.trim().toUpperCase();
  if (!normalized || !/^#[0-9A-F]{6}$/.test(normalized)) return KEBAB_OFFICIAL_WINE_HEX;
  if (LEGACY_BRAND_RED_HEXES.has(normalized)) return KEBAB_OFFICIAL_WINE_HEX;
  return normalized;
}

function applyTheme(s: CompanySettings) {
  try {
    const root = document.documentElement;
    const headerHex = resolveBrandHex(
      (s as { header_color?: string }).header_color || s.primary_color,
    );

    applyBrandWineTokens(headerHex);

    const accentParts = hexToHslParts(s.accent_color || s.secondary_color);
    if (accentParts) root.style.setProperty("--accent", hslString(accentParts));

    const successParts = hexToHslParts(s.cta_color);
    if (successParts) root.style.setProperty("--success", hslString(successParts));

    const bgParts = hexToHslParts(s.background_color);
    if (bgParts) {
      root.style.setProperty("--background", hslString(bgParts));
      root.style.setProperty("--card", hslString(bgParts));
    }

    const fgParts = hexToHslParts(s.text_color);
    if (fgParts) {
      root.style.setProperty("--foreground", hslString(fgParts));
      root.style.setProperty("--card-foreground", hslString(fgParts));
    }
  } catch (err) {
    console.error("[BrandingContext] applyTheme failed", err);
  }
}

function applyInstallMeta(s: CompanySettings, theme: "light" | "dark" = "light") {
  try {
    const name = s.company_name || "Restaurante";
    const headerHex = resolveBrandHex(
      (s as { header_color?: string }).header_color || s.primary_color,
    );

    // Mantém manifest.json estático em /public — necessário para PWA Builder, TWA e Play Store.
    // Só actualiza meta tags dinâmicas (título e cor da barra).
    const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.content = name;
    else {
      const m = document.createElement("meta");
      m.name = "apple-mobile-web-app-title";
      m.content = name;
      document.head.appendChild(m);
    }

    applyBrowserChromeColor(headerHex, theme);
  } catch (_e) {
    // ignore
  }
}

export const BrandingProvider: React.FC<{ children: React.ReactNode; storeId?: string }> = ({
  children,
  storeId: storeIdProp,
}) => {
  const resolved = useResolvedStore();
  const storeId = storeIdProp ?? resolved.storeId ?? "";
  const { theme } = useTheme();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [draftOverride, setDraftOverride] = useState<Partial<CompanySettings> | null>(null);
  const [loading, setLoading] = useState(true);

  const effectiveSettings = useMemo(() => {
    if (!settings) return null;
    if (!draftOverride) return settings;
    return { ...settings, ...draftOverride };
  }, [settings, draftOverride]);

  useEffect(() => {
    if (!isAdminPreviewMode()) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== PREVIEW_MESSAGE_TYPE) return;
      setDraftOverride((event.data.payload as Partial<CompanySettings>) ?? null);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!effectiveSettings) {
      applyBrowserChromeColor(undefined, theme);
      return;
    }
    applyTheme(effectiveSettings);
    applyInstallMeta(effectiveSettings, theme);
    if (effectiveSettings.company_name) {
      document.title = effectiveSettings.company_name;
    }
  }, [effectiveSettings, theme]);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    const { data } = await supabase
      .from("company_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();
    if (data) {
      setSettings(data);
      setDraftOverride(null);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load();
    let bumpTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`company_settings:${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_settings", filter: `store_id=eq.${storeId}` },
        () => {
          void load().then(() => {
            if (bumpTimer) clearTimeout(bumpTimer);
            bumpTimer = setTimeout(() => bumpAppCache(), 2000);
          });
        }
      )
      .subscribe();
    return () => {
      if (bumpTimer) clearTimeout(bumpTimer);
      supabase.removeChannel(channel);
    };
  }, [storeId, load]);

  return (
    <BrandingContext.Provider value={{ settings: effectiveSettings, loading, refresh: load }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
};
