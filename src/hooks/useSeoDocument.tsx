import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import {
  buildPublicCanonicalUrl,
  buildRestaurantJsonLd,
  buildWebSiteJsonLd,
  isPublicIndexablePath,
  shouldNoindexPath,
} from "@/lib/seoSite";
import { brandingFromCompany } from "@/lib/siteBranding";
import type { Tables } from "@/integrations/supabase/types";

const JSON_LD_ID = "snaporder-restaurant-jsonld";

function upsertLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertJsonLd(payload: Record<string, unknown> | null) {
  const existing = document.getElementById(JSON_LD_ID);
  if (!payload) {
    existing?.remove();
    return;
  }
  const script = (existing ?? document.createElement("script")) as HTMLScriptElement;
  script.id = JSON_LD_ID;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(payload);
  if (!existing) document.head.appendChild(script);
}

/**
 * Canonical, robots e dados estruturados por rota, Google Search Console / SEO.
 */
export function SeoDocumentEffect() {
  const location = useLocation();
  const { storeId } = useResolvedStore();

  const brandingQuery = useQuery({
    queryKey: ["seo-branding", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("*")
        .eq("store_id", storeId!)
        .maybeSingle();
      return data as Tables<"company_settings"> | null;
    },
    staleTime: 60_000,
  });

  const storeQuery = useQuery({
    queryKey: ["seo-store", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("name, address, phone, latitude, longitude, image_url, short_description")
        .eq("id", storeId!)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const pathname = location.pathname;
    const search = location.search;
    const canonical = buildPublicCanonicalUrl(pathname);
    const noindex = shouldNoindexPath(pathname, search);

    upsertLink("canonical", canonical);
    upsertMeta("robots", noindex ? "noindex, nofollow" : "index, follow");

    const verification = (import.meta.env.VITE_GOOGLE_SITE_VERIFICATION as string | undefined)?.trim();
    if (verification) upsertMeta("google-site-verification", verification);

    if (noindex || !isPublicIndexablePath(pathname, search)) {
      upsertJsonLd(null);
      return;
    }

    const branding = brandingFromCompany(brandingQuery.data);
    const store = storeQuery.data;
    const siteUrl = canonical.replace(/\/$/, "") || canonical;

    const restaurant = buildRestaurantJsonLd({
      name: branding.displayName,
      description: branding.metaDescription,
      url: siteUrl,
      image: branding.ogImageUrl ?? store?.image_url,
      telephone: store?.phone,
      address: store?.address,
      latitude: store?.latitude,
      longitude: store?.longitude,
    });

    const website = buildWebSiteJsonLd(branding.displayName, siteUrl, branding.metaDescription);

    upsertJsonLd({
      "@context": "https://schema.org",
      "@graph": [website, restaurant],
    });
  }, [
    location.pathname,
    location.search,
    brandingQuery.data,
    storeQuery.data,
  ]);

  return null;
}
