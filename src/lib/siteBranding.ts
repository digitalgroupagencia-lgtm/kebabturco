/**
 * Contrato de branding por domínio (Fase 1 + preparação Fase 2 edge).
 * Fonte: platform_settings (SnapOrder) ou company_settings (tenant).
 */

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
  manifestUrl: string;
};

/** Valores neutros provisórios SnapOrder — nunca Kebab. */
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

/** Fase 1: aplica meta tags no documento (client-side). Fase 2: edge inject + manifest dinâmico. */
export function applySiteBrandingToDocument(_branding: SiteBranding): void {
  // Implementação Fase 1 — ver SiteBrandingProvider (próximo passo).
}
