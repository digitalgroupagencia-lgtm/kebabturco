import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { pickStripeSecretForEnvironment } from "./stripeEnv.ts";
import {
  loadStoreConnectPaymentRow,
  resolveStoreConnectEnvironment,
} from "./stripeStoreConnect.ts";
import { DEFAULT_BUSINESS_WEBSITE } from "./stripeConnectCustomProvision.ts";

export const DEFAULT_SUPPORT_EMAIL = "suporte@kebabturco.net";

export type BrandingInput = {
  storeId: string;
  businessName: string;
  brandColor: string;
  iconUrl: string | null;
  logoUrl: string | null;
  supportEmail: string;
  businessUrl: string;
  statementDescriptor: string;
  statementDescriptorPrefix: string;
};

export type BrandingConfigureResult = {
  success: boolean;
  storeId: string;
  stripeConnectAccountId: string;
  brandingConfigured: boolean;
  receiptsEnabled: boolean;
  message: string;
  iconFileId?: string | null;
  logoFileId?: string | null;
  warnings?: string[];
};

type CompanySettingsRow = {
  company_name: string | null;
  primary_color: string | null;
  header_color: string | null;
  logo_main_url: string | null;
  icon_512_url: string | null;
  icon_192_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
};

type StoreRow = {
  id: string;
  name: string;
  tenant_id: string;
  is_active: boolean;
  stripe_business_name: string | null;
};

function statementDescriptorFromName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  return (clean || "KEBAB TURCO").slice(0, 22);
}

function statementDescriptorPrefixFromName(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  const first = words[0] || "KEBAB";
  return first.toUpperCase().slice(0, 10);
}

/** Converte caminhos relativos (/icon-512.png) em URL absoluta para a Stripe conseguir descarregar. */
export function resolvePublicAssetUrl(url: string | null | undefined, baseUrl = DEFAULT_BUSINESS_WEBSITE): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return `${baseUrl.replace(/\/$/, "")}${trimmed}`;
  return trimmed;
}

function pickBrandColor(settings: CompanySettingsRow | null): string {
  const color = settings?.primary_color?.trim() || settings?.header_color?.trim();
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  return "#E63946";
}

function pickIconUrl(settings: CompanySettingsRow | null): string | null {
  return resolvePublicAssetUrl(
    settings?.icon_512_url || settings?.icon_192_url || settings?.favicon_url || settings?.logo_main_url,
  );
}

function pickLogoUrl(settings: CompanySettingsRow | null): string | null {
  return resolvePublicAssetUrl(settings?.logo_main_url || settings?.og_image_url || settings?.icon_512_url);
}

async function uploadBrandingFile(
  stripe: Stripe,
  url: string,
  purpose: "business_icon" | "business_logo",
  connectAccountId: string,
): Promise<{ fileId: string | null; warning?: string }> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { fileId: null, warning: `Não foi possível descarregar ${purpose} (${res.status})` };
    }
    const contentType = (res.headers.get("content-type") || "image/png").split(";")[0];
    const buffer = new Uint8Array(await res.arrayBuffer());
    const maxBytes = purpose === "business_icon" ? 512 * 1024 : 1024 * 1024;
    if (buffer.byteLength > maxBytes) {
      return {
        fileId: null,
        warning: `${purpose} excede ${Math.round(maxBytes / 1024)}KB — ignorado`,
      };
    }
    const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
    const file = await stripe.files.create(
      {
        purpose,
        file: {
          data: buffer,
          name: `${purpose}.${ext}`,
          type: contentType,
        },
      },
      { stripeAccount: connectAccountId },
    );
    return { fileId: file.id };
  } catch (err) {
    console.warn(`[branding] upload ${purpose} failed`, err);
    return { fileId: null, warning: `Upload Stripe falhou para ${purpose}` };
  }
}

export async function resolveBrandingInput(
  supabase: SupabaseClient,
  storeId: string,
  overrides: {
    businessName?: string;
    brandColor?: string;
    iconUrl?: string;
    logoUrl?: string;
    supportEmail?: string;
    businessUrl?: string;
  } = {},
): Promise<{ input: BrandingInput; store: StoreRow } | { error: string }> {
  const [{ data: store, error: storeErr }, { data: settings }] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, tenant_id, is_active, stripe_business_name")
      .eq("id", storeId)
      .maybeSingle(),
    supabase
      .from("company_settings")
      .select(
        "company_name, primary_color, header_color, logo_main_url, icon_512_url, icon_192_url, favicon_url, og_image_url",
      )
      .eq("store_id", storeId)
      .maybeSingle(),
  ]);

  if (storeErr || !store) {
    return { error: storeErr?.message ?? "Loja não encontrada" };
  }

  const company = settings as CompanySettingsRow | null;
  const businessName =
    overrides.businessName?.trim() ||
    store.stripe_business_name?.trim() ||
    company?.company_name?.trim() ||
    store.name?.trim() ||
    "Restaurante";

  const brandColor = overrides.brandColor?.trim() || pickBrandColor(company);
  const iconUrl = resolvePublicAssetUrl(overrides.iconUrl) || pickIconUrl(company);
  const logoUrl = resolvePublicAssetUrl(overrides.logoUrl) || pickLogoUrl(company);

  return {
    store: store as StoreRow,
    input: {
      storeId,
      businessName,
      brandColor,
      iconUrl,
      logoUrl,
      supportEmail: overrides.supportEmail?.trim() || DEFAULT_SUPPORT_EMAIL,
      businessUrl: overrides.businessUrl?.trim() || DEFAULT_BUSINESS_WEBSITE,
      statementDescriptor: statementDescriptorFromName(businessName),
      statementDescriptorPrefix: statementDescriptorPrefixFromName(businessName),
    },
  };
}

export async function configureStoreStripeBranding(
  stripe: Stripe,
  connectAccountId: string,
  input: Omit<BrandingInput, "storeId">,
): Promise<BrandingConfigureResult> {
  const warnings: string[] = [];
  let iconFileId: string | null = null;
  let logoFileId: string | null = null;

  if (input.iconUrl) {
    const uploaded = await uploadBrandingFile(stripe, input.iconUrl, "business_icon", connectAccountId);
    iconFileId = uploaded.fileId;
    if (uploaded.warning) warnings.push(uploaded.warning);
  } else {
    warnings.push("Sem URL de ícone — branding sem ícone");
  }

  if (input.logoUrl) {
    const uploaded = await uploadBrandingFile(stripe, input.logoUrl, "business_logo", connectAccountId);
    logoFileId = uploaded.fileId;
    if (uploaded.warning) warnings.push(uploaded.warning);
  }

  const branding: Stripe.AccountUpdateParams.Settings.Branding = {
    primary_color: input.brandColor,
  };
  if (iconFileId) branding.icon = iconFileId;
  if (logoFileId) branding.logo = logoFileId;

  await stripe.accounts.update(connectAccountId, {
    business_profile: {
      name: input.businessName,
      support_email: input.supportEmail,
      url: input.businessUrl,
    },
    settings: {
      branding,
      payments: {
        statement_descriptor: input.statementDescriptor,
      },
      card_payments: {
        statement_descriptor_prefix: input.statementDescriptorPrefix,
      },
    },
  });

  return {
    success: true,
    storeId: "",
    stripeConnectAccountId: connectAccountId,
    brandingConfigured: true,
    receiptsEnabled: true,
    message: "Branding e recibos configurados com sucesso",
    iconFileId,
    logoFileId,
    ...(warnings.length ? { warnings } : {}),
  };
}

export async function configureStoreBrandingById(
  supabase: SupabaseClient,
  storeId: string,
  overrides: {
    businessName?: string;
    brandColor?: string;
    iconUrl?: string;
    logoUrl?: string;
    supportEmail?: string;
    businessUrl?: string;
  } = {},
): Promise<BrandingConfigureResult | { error: string; status?: number }> {
  const resolved = await resolveBrandingInput(supabase, storeId, overrides);
  if ("error" in resolved) {
    return { error: resolved.error, status: 404 };
  }

  const loaded = await loadStoreConnectPaymentRow(supabase, storeId);
  const connectRow = loaded.store;
  if (!connectRow?.stripe_connect_account_id) {
    return { error: "Loja sem conta Stripe Connect", status: 400 };
  }
  const connectAccountId = connectRow.stripe_connect_account_id.trim();
  if (!connectAccountId || connectAccountId.startsWith("simulated-")) {
    return { error: "Conta Stripe Connect inválida", status: 400 };
  }

  const connectEnv = await resolveStoreConnectEnvironment(connectRow);
  const stripeKey = pickStripeSecretForEnvironment(
    connectEnv === "test" || connectRow.stripe_connect_test_simulated ? "test" : connectEnv,
  );
  if (!stripeKey) {
    return { error: "Stripe não configurada no servidor", status: 503 };
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const { storeId: _s, ...brandingInput } = resolved.input;

  try {
    const result = await configureStoreStripeBranding(stripe, connectAccountId, brandingInput);
    return { ...result, storeId };
  } catch (err) {
    console.error("[branding] configure failed", err);
    const message = err instanceof Error ? err.message : "Erro ao configurar branding Stripe";
    return { error: message, status: 502 };
  }
}

export async function configureAllActiveStoresBranding(
  supabase: SupabaseClient,
): Promise<{
  success: boolean;
  configured: number;
  failed: number;
  results: BrandingConfigureResult[];
  errors: Array<{ storeId: string; error: string }>;
}> {
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id")
    .eq("is_active", true)
    .not("stripe_connect_account_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const results: BrandingConfigureResult[] = [];
  const errors: Array<{ storeId: string; error: string }> = [];

  for (const row of stores ?? []) {
    const storeId = row.id as string;
    const outcome = await configureStoreBrandingById(supabase, storeId);
    if ("error" in outcome) {
      errors.push({ storeId, error: outcome.error });
    } else {
      results.push(outcome);
    }
  }

  return {
    success: errors.length === 0,
    configured: results.length,
    failed: errors.length,
    results,
    errors,
  };
}
