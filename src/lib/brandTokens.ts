/**
 * Central brand color tokens — defaults for Kebab Turco premium wine identity.
 * White-label: BrandingContext overrides --brand-wine* CSS vars from company_settings.header_color.
 */

/** Premium burgundy — matches header / theme-color */
export const BRAND_WINE_HEX = "#8B1A1A";
export const BRAND_WINE_DARK_HEX = "#5C1419";
export const BRAND_WINE_LIGHT_HEX = "#962E34";

/** Legacy fallback replaced across static assets */
export const LEGACY_RED_HEX = "#CC0000";

export type HslParts = { h: number; s: number; l: number };

export function hexToHslParts(hex: string | null | undefined): HslParts | null {
  if (!hex || typeof hex !== "string") return null;
  const m = hex.replace("#", "").trim();
  if (m.length !== 6) return null;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslString(parts: HslParts): string {
  return `${parts.h} ${parts.s}% ${parts.l}%`;
}

/** Derive premium wine palette (light + dark surfaces) from a single brand hex. */
export function winePaletteFromHex(hex: string): {
  wine: string;
  wineDark: string;
  wineLight: string;
  wineMuted: string;
} {
  const base = hexToHslParts(hex) ?? hexToHslParts(BRAND_WINE_HEX)!;
  const capSat = (s: number, max: number) => Math.min(s, max);

  const wine = hslString({
    h: base.h,
    s: capSat(Math.max(base.s, 48), 68),
    l: Math.min(Math.max(base.l, 30), 38),
  });

  const wineDark = hslString({
    h: base.h,
    s: capSat(base.s + 4, 72),
    l: Math.max(base.l - 10, 22),
  });

  const wineLight = hslString({
    h: base.h,
    s: capSat(base.s - 6, 58),
    l: Math.min(base.l + 6, 44),
  });

  const wineMuted = hslString({
    h: base.h,
    s: capSat(base.s - 18, 48),
    l: Math.min(base.l + 12, 52),
  });

  return { wine, wineDark, wineLight, wineMuted };
}

export function gradientHeaderFromPalette(p: ReturnType<typeof winePaletteFromHex>): string {
  return `linear-gradient(180deg, hsl(${p.wineLight}) 0%, hsl(${p.wineDark}) 100%)`;
}

export function gradientPrimaryFromPalette(p: ReturnType<typeof winePaletteFromHex>): string {
  return `linear-gradient(180deg, hsl(${p.wineLight}) 0%, hsl(${p.wine}) 100%)`;
}

export function shadowPrimaryFromPalette(p: ReturnType<typeof winePaletteFromHex>): string {
  return `0 10px 28px -14px hsl(${p.wine} / 0.42)`;
}

export function shadowHeaderFromPalette(p: ReturnType<typeof winePaletteFromHex>): string {
  return `0 4px 18px -8px hsl(${p.wine} / 0.38)`;
}

/** Apply brand wine tokens to document root (used by BrandingContext). */
export function applyBrandWineTokens(headerHex: string): void {
  if (typeof document === "undefined") return;
  const palette = winePaletteFromHex(headerHex);
  const root = document.documentElement;
  root.style.setProperty("--brand-wine", palette.wine);
  root.style.setProperty("--brand-wine-dark", palette.wineDark);
  root.style.setProperty("--brand-wine-light", palette.wineLight);
  root.style.setProperty("--brand-wine-muted", palette.wineMuted);
  root.style.setProperty("--gradient-header", gradientHeaderFromPalette(palette));
  root.style.setProperty("--gradient-primary", gradientPrimaryFromPalette(palette));
  root.style.setProperty("--shadow-primary", shadowPrimaryFromPalette(palette));
  root.style.setProperty("--shadow-header", shadowHeaderFromPalette(palette));
}
