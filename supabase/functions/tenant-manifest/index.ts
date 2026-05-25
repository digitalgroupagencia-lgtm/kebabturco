// Edge function: serve manifest.webmanifest dinâmico por Host.
// Público (verify_jwt = false). Cada domínio recebe o seu próprio manifest.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PLATFORM_HOSTS = new Set([
  "snaporder.digitalgroupsti.com",
  "admin.snaporder.es",
]);

const SNAPORDER_MANIFEST = {
  name: "SnapOrder",
  short_name: "SnapOrder",
  description: "Gestão white-label de restaurantes",
  lang: "pt",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#ffffff",
  theme_color: "#CC0000",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
  ],
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeHost(h: string): string {
  return h.replace(/^www\./i, "").toLowerCase().trim();
}

function pick(...vals: (string | null | undefined)[]): string | null {
  for (const v of vals) if (v && v.trim()) return v;
  return null;
}

function buildManifestForCompany(host: string, tenantName: string, settings: any) {
  const name = pick(settings?.company_name, tenantName) ?? "Restaurante";
  const shortName = pick(settings?.short_name, settings?.company_name, tenantName) ?? name;
  const themeColor =
    pick(settings?.header_color, settings?.primary_color) ?? "#CC0000";
  const bg = pick(settings?.background_color) ?? "#ffffff";
  const logo = pick(settings?.logo_main_url, settings?.logo_secondary_url);
  const icon192 = pick(settings?.icon_192_url, logo) ?? "/icon-192.png";
  const icon512 = pick(settings?.icon_512_url, logo) ?? "/icon-512.png";

  return {
    name,
    short_name: shortName.length > 12 ? shortName.slice(0, 12) : shortName,
    description:
      pick(settings?.meta_description) ?? `Peça online em ${name}`,
    lang: "pt",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: bg,
    theme_color: themeColor,
    icons: [
      { src: icon192, sizes: "192x192", type: "image/png" },
      { src: icon512, sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const url = new URL(req.url);
    // host real (browser) OU override por query (?host=)
    const rawHost = url.searchParams.get("host") ?? req.headers.get("host") ?? "";
    const host = normalizeHost(rawHost.split(":")[0]);
    const tenantSlugOverride = url.searchParams.get("tenant");

    const headers = {
      ...CORS,
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300, must-revalidate",
    };

    if (!tenantSlugOverride && (PLATFORM_HOSTS.has(host) || !host)) {
      return new Response(JSON.stringify(SNAPORDER_MANIFEST), { headers });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    let tenant: any = null;
    if (tenantSlugOverride) {
      const { data } = await sb
        .from("tenants")
        .select("id, name, slug")
        .eq("slug", tenantSlugOverride)
        .eq("is_active", true)
        .maybeSingle();
      tenant = data;
    }
    if (!tenant) {
      const { data } = await sb
        .from("tenants")
        .select("id, name, slug")
        .eq("custom_domain", host)
        .eq("is_active", true)
        .maybeSingle();
      tenant = data;
    }

    if (!tenant) {
      return new Response(JSON.stringify(SNAPORDER_MANIFEST), { headers });
    }

    const { data: store } = await sb
      .from("stores")
      .select("id")
      .eq("tenant_id", tenant.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    let settings: any = null;
    if (store?.id) {
      const { data } = await sb
        .from("company_settings")
        .select("*")
        .eq("store_id", store.id)
        .maybeSingle();
      settings = data;
    }

    const manifest = buildManifestForCompany(host, tenant.name, settings);
    return new Response(JSON.stringify(manifest), { headers });
  } catch (e) {
    console.error("[tenant-manifest]", e);
    return new Response(JSON.stringify(SNAPORDER_MANIFEST), {
      headers: { ...CORS, "Content-Type": "application/manifest+json" },
    });
  }
});
