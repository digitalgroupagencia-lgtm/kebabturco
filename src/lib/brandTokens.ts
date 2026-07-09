/**
 * Central brand color tokens, defaults for Kebab Turco premium wine identity.
 * White-label: BrandingContext overrides --brand-wine* CSS vars from company_settings.header_color.
 */

import { isCustomerStorefrontPath, isStaffAppPath } from "@/lib/appRouteKind";

/** Cor oficial Kebab Turco, substitui todos os vermelhos/vinhos anteriores. */
export const KEBAB_OFFICIAL_WINE_HEX = "#3A0205";
export const BRAND_WINE_HEX = KEBAB_OFFICIAL_WINE_HEX;
export const BRAND_WINE_DARK_HEX = KEBAB_OFFICIAL_WINE_HEX;
export const BRAND_WINE_LIGHT_HEX = "#5A0808";

/**
 * Cor usada na barra do sistema / Safari / Chrome (chrome do browser).
 */
export const BRAND_CHROME_HEX = KEBAB_OFFICIAL_WINE_HEX;

/** Cores antigas (vermelho fast-food ou vinhos anteriores), migrar para oficial. */
export const LEGACY_BRAND_RED_HEXES = new Set([
  "#8B1A1A",
  "#5C1419",
  "#5F0504",
  "#962E34",
  "#D62300",
  "#CC0000",
  "#E63946",
  "#910318",
]);

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
  return `hsl(${p.wineDark})`;
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

/** Converte HSL (parts) para hex, usado na cor da barra do sistema. */
export function hslPartsToHex(parts: HslParts): string {
  const h = parts.h / 360;
  const s = parts.s / 100;
  const l = parts.l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toByte = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

/** Vinho escuro do header, cor exacta para Safari / Android / PWA / TWA. */
export function chromeHexFromHeader(headerHex?: string): string {
  const base = headerHex || BRAND_WINE_HEX;
  const palette = winePaletteFromHex(base);
  const wineDarkParts = hexToHslParts(BRAND_CHROME_HEX) ?? { h: 357, s: 93, l: 12 };
  const derived = hexToHslParts(base);
  const parts: HslParts = derived
    ? { h: derived.h, s: Math.min(derived.s + 4, 72), l: Math.max(derived.l - 10, 22) }
    : wineDarkParts;
  return hslPartsToHex(parts);
}

function setOrCreateMeta(name: string, content: string, extra?: Record<string, string>): void {
  const selector = extra?.media
    ? `meta[name="${name}"][media="${extra.media}"]`
    : `meta[name="${name}"]:not([media])`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    if (extra?.media) el.media = extra.media;
    document.head.appendChild(el);
  }
  el.content = content;
}

/** Actualiza theme-color, safe-area e meta iOS, só no site do cliente (não admin/painel). */
export function applyBrowserChromeColor(headerHex?: string, theme: "light" | "dark" = "light"): void {
  if (typeof document === "undefined") return;

  if (isStaffAppPath()) {
    applyStaffAppChrome();
    return;
  }

  const root = document.documentElement;
  root.classList.remove("staff-app");

  const base = headerHex || BRAND_WINE_HEX;
  const palette = winePaletteFromHex(base);
  const chromeHex = chromeHexFromHeader(base);
  const isDark = theme === "dark";

  // NOTA: A cor da barra do Safari (theme-color) é controlada por
  // `setSafariTopBarColor` a partir do ecrã actual do cliente
  // (branco na entrada, cor primária a partir do cardápio).
  // Não escrevemos theme-color aqui para não forçar vinho na entrada.


  setOrCreateMeta("apple-mobile-web-app-capable", "yes");
  setOrCreateMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
  setOrCreateMeta("mobile-web-app-capable", "yes");

  root.style.setProperty("--browser-chrome-hex", chromeHex);
  root.style.setProperty("--customer-safe-top-bg", chromeHex);
  root.style.setProperty("--customer-browser-top-fill-bg", chromeHex);
  root.style.setProperty("--gradient-header", chromeHex);
  root.style.setProperty("--browser-chrome-bg", chromeHex);
  // Viewport/canvas seguem a cor da tela (background), não o vinho — o vinho
  // fica apenas na safe-area do topo via html::before.
  root.style.removeProperty("--customer-viewport-bg");
  root.style.removeProperty("--customer-canvas-bg");
  root.style.backgroundColor = "";
  document.body.style.backgroundColor = "";
  root.style.colorScheme = isDark ? "dark" : "light";

  const boot = document.getElementById("boot-fallback");
  if (boot) boot.style.background = chromeHex;


  if (window.matchMedia("(display-mode: standalone)").matches) {
    root.classList.add("pwa-standalone");
  } else {
    root.classList.remove("pwa-standalone");
  }
}

/** Chrome neutro para administração / painel, evita flash vinho e barra errada. */
export function applyStaffAppChrome(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("staff-app");
  root.classList.remove("pwa-standalone");
  root.style.setProperty("--browser-chrome-bg", "hsl(var(--background))");
  root.style.removeProperty("--browser-chrome-hex");
  root.style.removeProperty("--customer-safe-top-bg");
  root.style.removeProperty("--customer-browser-top-fill-bg");
  root.style.removeProperty("--customer-viewport-bg");
  root.style.removeProperty("--customer-canvas-bg");
  root.style.backgroundColor = "";
  document.body.style.backgroundColor = "";
  root.style.colorScheme = "light dark";

  setOrCreateMeta("theme-color", "#ffffff");
  setOrCreateMeta("apple-mobile-web-app-status-bar-style", "default");

  const boot = document.getElementById("boot-fallback");
  if (boot) boot.style.background = "hsl(var(--background, #ffffff))";
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
  root.style.setProperty("--gradient-header", chromeHexFromHeader(headerHex));
  root.style.setProperty("--gradient-primary", gradientPrimaryFromPalette(palette));
  root.style.setProperty("--shadow-primary", shadowPrimaryFromPalette(palette));
  root.style.setProperty("--shadow-header", shadowHeaderFromPalette(palette));
}

/** @deprecated use KEBAB_OFFICIAL_WINE_HEX */
export const LEGACY_RED_HEX = "#CC0000";
