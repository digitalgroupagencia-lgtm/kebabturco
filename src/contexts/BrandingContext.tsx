import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { bumpAppCache } from "@/lib/appCacheBust";

export type CompanySettings = Tables<"company_settings">;

interface BrandingContextType {
  settings: CompanySettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

function hexToHsl(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "0 0% 0%";
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(s: CompanySettings) {
  const root = document.documentElement;
  root.style.setProperty("--primary", hexToHsl(s.primary_color));
  root.style.setProperty("--ring", hexToHsl(s.primary_color));
  root.style.setProperty("--accent", hexToHsl(s.accent_color || s.secondary_color));
  root.style.setProperty("--success", hexToHsl(s.cta_color));
  root.style.setProperty("--background", hexToHsl(s.background_color));
  root.style.setProperty("--foreground", hexToHsl(s.text_color));
  root.style.setProperty("--card", hexToHsl(s.background_color));
  root.style.setProperty("--card-foreground", hexToHsl(s.text_color));

  // Cor personalizada da barra superior (header) — sólida, sem degradê
  const headerHex = (s as any).header_color || s.primary_color;
  const headerHsl = hexToHsl(headerHex);
  root.style.setProperty(
    "--gradient-header",
    `linear-gradient(180deg, hsl(${headerHsl}) 0%, hsl(${headerHsl}) 100%)`
  );
  root.style.setProperty("--shadow-header", `0 4px 18px -8px hsla(${headerHsl} / 0.4)`);

}

function applyDynamicManifest(s: CompanySettings) {
  try {
    const name = s.company_name || "App";
    const icon = (s as any).logo_main_url || "/icon-512.png";
    const themeColor = (s as any).header_color || s.primary_color || "#000000";
    const bgColor = s.background_color || "#FFFFFF";

    const manifest = {
      name,
      short_name: name.length > 12 ? name.slice(0, 12) : name,
      start_url: "/",
      display: "standalone",
      background_color: bgColor,
      theme_color: themeColor,
      orientation: "portrait",
      icons: [
        { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: icon, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const url = URL.createObjectURL(blob);
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    if (link.dataset.blobUrl) URL.revokeObjectURL(link.dataset.blobUrl);
    link.href = url;
    link.dataset.blobUrl = url;

    // Apple touch icon (iOS usa essa tag para o ícone da tela de início)
    if (icon) {
      let apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (!apple) {
        apple = document.createElement("link");
        apple.rel = "apple-touch-icon";
        document.head.appendChild(apple);
      }
      apple.href = icon;
    }

    // Título da janela (usado por alguns navegadores como sugestão de nome)
    const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.content = name;
    else {
      const m = document.createElement("meta");
      m.name = "apple-mobile-web-app-title";
      m.content = name;
      document.head.appendChild(m);
    }

    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
      m.content = themeColor;
    });

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
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    const { data } = await supabase
      .from("company_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();
    if (data) {
      setSettings(data);
      applyTheme(data);
      applyDynamicManifest(data);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    load();
    const channel = supabase
      .channel(`company_settings:${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_settings", filter: `store_id=eq.${storeId}` },
        () => {
          void load().then(() => bumpAppCache());
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, load]);

  return (
    <BrandingContext.Provider value={{ settings, loading, refresh: load }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
};
