import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CompanySettings = Tables<"company_settings">;

interface BrandingContextType {
  settings: CompanySettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);
const DEFAULT_STORE_ID = "b0000000-0000-0000-0000-000000000001";

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
}

export const BrandingProvider: React.FC<{ children: React.ReactNode; storeId?: string }> = ({
  children,
  storeId = DEFAULT_STORE_ID,
}) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("company_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();
    if (data) {
      setSettings(data);
      applyTheme(data);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`company_settings:${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_settings", filter: `store_id=eq.${storeId}` },
        () => load()
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
