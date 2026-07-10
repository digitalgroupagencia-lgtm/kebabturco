import { useLayoutEffect } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  applyBrowserChromeColor,
  applyCustomerChromeMode,
  customerChromeModeForScreen,
  KEBAB_OFFICIAL_WINE_HEX,
  LEGACY_BRAND_RED_HEXES,
} from "@/lib/brandTokens";

function resolveHeaderHex(headerColor?: string | null, primaryColor?: string | null): string {
  const raw = headerColor || primaryColor;
  const normalized = raw?.trim().toUpperCase();
  if (!normalized || !/^#[0-9A-F]{6}$/.test(normalized)) return KEBAB_OFFICIAL_WINE_HEX;
  if (LEGACY_BRAND_RED_HEXES.has(normalized)) return KEBAB_OFFICIAL_WINE_HEX;
  return normalized;
}

/** Sincroniza barra Safari e fundo do canvas com o ecrã activo do cliente. */
export default function CustomerChromeEffect() {
  const { screen } = useOrder();
  const { settings } = useBranding();
  const { theme } = useTheme();

  useLayoutEffect(() => {
    const mode = customerChromeModeForScreen(screen);
    applyCustomerChromeMode(mode);
    const headerHex = resolveHeaderHex(
      (settings as { header_color?: string } | null)?.header_color,
      settings?.primary_color,
    );
    applyBrowserChromeColor(headerHex, theme);
  }, [screen, settings, theme]);

  return null;
}
