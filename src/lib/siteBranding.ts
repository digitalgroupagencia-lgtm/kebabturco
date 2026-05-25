/**
 * Branding visual por domínio — Fase 1 (client) + preparação Fase 2 (manifest edge).
 */

import type { Tables } from "@/integrations/supabase/types";
import { isPlatformAdminContext } from "@/lib/platformAdminContext";
import { isEmbeddedTenantPreview } from "@/lib/tenantPreview";

export type SiteBrandingScope = "platform" | "tenant" | "neutral";

export type SiteBranding = {
  scope: SiteBrandingScope;
  displayName: string;
  shortName: string;
  metaDescription: string;
  themeColor: string;
  backgroundColor: string;
  primaryColor: string;
  faviconUrl: string;
  icon192Url: string;
  icon512Url: string;
  appleTouchIconUrl: string;
  ogImageUrl: string | null;
  /** Fase 2: /manifest.json dinâmico por Host */
  manifestUrl: string;
};

type PlatformRow = Tables<"platform_settings"> & {
  display_name?: string | null;
  short_name?: string | null;
  meta_description?: string | null;
  theme_color?: string | null;
  background_color?: string | null;
  primary_color?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  icon_192_url?: string | null;
  icon_512_url?: string | null;
  apple_touch_icon_url?: string | null;
  og_image_url?: string | null;
};

type CompanyRow = Tables<"company_settings"> & {
  short_name?: string | null;
  meta_description?: string | null;
  favicon_url?: string | null;
  icon_192_url?: string | null;
  icon_512_url?: string | null;
  apple_touch_icon_url?: string | null;
  og_image_url?: string | null;
};

export const SNAPORDER_NEUTRAL_BRANDING: SiteBranding = {
  scope: "platform",
  displayName: "SnapOrder Platform",
  shortName: "SnapOrder",
  metaDescription: "Gestão white-label de restaurantes",
  themeColor: "#CC0000",
  backgroundColor: "#ffffff",
  primaryColor: "#CC0000",
  faviconUrl: "/favicon.ico",
  icon192Url: "/icon-192.png",
  icon512Url: "/icon-512.png",
  appleTouchIconUrl: "/apple-touch-icon.png",
  ogImageUrl: null,
  manifestUrl: "/manifest.json",
};

function pickIcon(...urls: (string | null | undefined)[]): string {
  for (const u of urls) {
    if (u && u.trim()) return u;
  }
  return SNAPORDER_NEUTRAL_BRANDING.faviconUrl;
}

export function brandingFromPlatform(row: PlatformRow | null | undefined): SiteBranding {
  if (!row) return { ...SNAPORDER_NEUTRAL_BRANDING };
  const logo = row.logo_url || null;
  return {
    scope: "platform",
    displayName: row.display_name || row.platform_name || "SnapOrder Platform",
    shortName: row.short_name || row.platform_name || "SnapOrder",
    metaDescription: row.meta_description || SNAPORDER_NEUTRAL_BRANDING.metaDescription,
    themeColor: row.theme_color || row.primary_color || "#CC0000",
    backgroundColor: row.background_color || "#ffffff",
    primaryColor: row.primary_color || "#CC0000",
    faviconUrl: pickIcon(row.favicon_url, logo),
    icon192Url: pickIcon(row.icon_192_url, logo),
    icon512Url: pickIcon(row.icon_512_url, logo),
    appleTouchIconUrl: pickIcon(row.apple_touch_icon_url, logo),
    ogImageUrl: row.og_image_url || logo,
    manifestUrl: "/manifest.json",
  };
}

export function brandingFromCompany(row: CompanyRow | null | undefined): SiteBranding {
  if (!row) return { ...SNAPORDER_NEUTRAL_BRANDING, scope: "neutral" };
  const logo = row.logo_main_url || row.logo_secondary_url || null;
  const header = (row as { header_color?: string }).header_color || row.primary_color;
  return {
    scope: "tenant",
    displayName: row.company_name || "Restaurante",
    shortName: row.short_name || row.company_name || "Restaurante",
    metaDescription:
      row.meta_description ||
      `Peça online em ${row.company_name || "nosso restaurante"}`,
    themeColor: header || "#CC0000",
    backgroundColor: row.background_color || "#ffffff",
    primaryColor: row.primary_color || "#CC0000",
    faviconUrl: pickIcon(row.favicon_url, logo),
    icon192Url: pickIcon(row.icon_192_url, logo),
    icon512Url: pickIcon(row.icon_512_url, logo),
    appleTouchIconUrl: pickIcon(row.apple_touch_icon_url, logo),
    ogImageUrl: row.og_image_url || row.banner_home_url || logo,
    manifestUrl: buildTenantManifestUrl(),
  };
}

/** URL da edge function que devolve manifest específico por Host. */
function buildTenantManifestUrl(): string {
  if (typeof window === "undefined") return "/manifest.json";
  const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  if (!supaUrl) return "/manifest.json";
  const host = window.location.hostname;
  return `${supaUrl}/functions/v1/tenant-manifest?host=${encodeURIComponent(host)}`;
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string, sizes?: string) {
  const selector = sizes
    ? `link[rel="${rel}"][sizes="${sizes}"]`
    : `link[rel="${rel}"]:not([sizes])`;
  let el = document.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    if (sizes) el.sizes = sizes;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Aplica título, meta tags e ícones no documento (Fase 1). */
export function applySiteBrandingToDocument(branding: SiteBranding): void {
  if (typeof document === "undefined") return;

  document.title = branding.displayName;

  setMeta("description", branding.metaDescription);
  setMeta("theme-color", branding.themeColor);
  setMeta("apple-mobile-web-app-title", branding.shortName);
  setMeta("application-name", branding.shortName);

  setMeta("og:title", branding.displayName, "property");
  setMeta("og:description", branding.metaDescription, "property");
  setMeta("og:type", "website", "property");
  if (branding.ogImageUrl) setMeta("og:image", branding.ogImageUrl, "property");

  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", branding.displayName);
  setMeta("twitter:description", branding.metaDescription);
  if (branding.ogImageUrl) setMeta("twitter:image", branding.ogImageUrl);

  setLink("icon", branding.faviconUrl);
  setLink("apple-touch-icon", branding.appleTouchIconUrl);

  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifestLink) manifestLink.href = branding.manifestUrl;
}

export function shouldApplyPlatformSiteBranding(): boolean {
  return isPlatformAdminContext();
}

export function shouldApplyTenantSiteBranding(): boolean {
  if (typeof window === "undefined") return false;
  return !isPlatformAdminContext() || isEmbeddedTenantPreview();
}
