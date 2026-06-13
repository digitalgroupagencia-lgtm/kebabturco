import { LEGAL_PATHS } from "@/lib/legalSite";
import { KEBAB_TURCO_PUBLIC_ORIGIN } from "@/lib/tenantUrls";

export const SEO_SITE_ORIGIN = KEBAB_TURCO_PUBLIC_ORIGIN;

export type SitemapEntry = {
  path: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
};

/** Páginas públicas indexáveis — fonte de verdade para sitemap.xml. */
export const PUBLIC_SITEMAP_ENTRIES: readonly SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/menu", changefreq: "weekly", priority: 0.9 },
  { path: "/cardapio", changefreq: "weekly", priority: 0.9 },
  { path: LEGAL_PATHS.privacy, changefreq: "monthly", priority: 0.5 },
  { path: LEGAL_PATHS.terms, changefreq: "monthly", priority: 0.5 },
  { path: LEGAL_PATHS.deleteAccount, changefreq: "monthly", priority: 0.4 },
  { path: LEGAL_PATHS.support, changefreq: "monthly", priority: 0.6 },
  { path: "/install", changefreq: "monthly", priority: 0.5 },
] as const;

/** Prefixos e rotas que não devem ser indexadas pelo Google. */
export const SEO_NOINDEX_PREFIXES = [
  "/admin",
  "/panel",
  "/auth",
  "/staff",
  "/seller",
  "/delivery",
  "/kds",
  "/cashier",
  "/painel",
  "/equipe",
  "/recibos/",
  "/ligar-conta/",
] as const;

export const SEO_NOINDEX_EXACT = new Set([
  "/checkout",
  "/pagamento",
  "/confirmacao",
  "/pedido-concluido",
  "/confirmation",
  "/acompanhar",
  "/acompanhar-pedido",
  "/tracking",
  "/meus-pedidos",
  "/pedidos",
  "/mesa",
  "/qr",
]);

const CUSTOMER_FLOW_SCREENS = new Set([
  "review",
  "payment",
  "cashPending",
  "confirmation",
  "tracking",
  "account",
  "product",
]);

export function normalizeSeoPathname(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export function buildPublicCanonicalUrl(pathname: string): string {
  const path = normalizeSeoPathname(pathname);
  if (path === "/") return `${SEO_SITE_ORIGIN}/`;
  return `${SEO_SITE_ORIGIN}${path}`;
}

export function shouldNoindexPath(pathname: string, search = ""): boolean {
  const path = normalizeSeoPathname(pathname);

  if (SEO_NOINDEX_EXACT.has(path)) return true;
  for (const prefix of SEO_NOINDEX_PREFIXES) {
    if (path === prefix.replace(/\/$/, "") || path.startsWith(prefix)) return true;
  }

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const screen = params.get("screen");
  if (screen && CUSTOMER_FLOW_SCREENS.has(screen)) return true;
  if (params.has("mode") && params.get("mode") === "table") return true;

  return false;
}

export function isPublicIndexablePath(pathname: string, search = ""): boolean {
  if (shouldNoindexPath(pathname, search)) return false;
  const path = normalizeSeoPathname(pathname);
  if (PUBLIC_SITEMAP_ENTRIES.some((entry) => entry.path === path)) return true;
  return path === "/";
}

export type RestaurantStructuredData = {
  name: string;
  description: string;
  url: string;
  image?: string | null;
  telephone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  servesCuisine?: string;
};

export function buildRestaurantJsonLd(data: RestaurantStructuredData): Record<string, unknown> {
  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: data.name,
    description: data.description,
    url: data.url,
    servesCuisine: data.servesCuisine ?? "Kebab",
    priceRange: "€€",
    potentialAction: {
      "@type": "OrderAction",
      target: data.url,
    },
  };

  if (data.image) json.image = data.image;
  if (data.telephone) json.telephone = data.telephone;

  if (data.address) {
    json.address = {
      "@type": "PostalAddress",
      streetAddress: data.address,
      addressCountry: "PT",
    };
  }

  if (data.latitude != null && data.longitude != null) {
    json.geo = {
      "@type": "GeoCoordinates",
      latitude: data.latitude,
      longitude: data.longitude,
    };
  }

  return json;
}

export function buildWebSiteJsonLd(name: string, url: string, description: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    inLanguage: ["pt-PT", "es-ES", "en-GB", "fr-FR"],
    publisher: {
      "@type": "Organization",
      name: "Euro Business Group",
    },
  };
}
