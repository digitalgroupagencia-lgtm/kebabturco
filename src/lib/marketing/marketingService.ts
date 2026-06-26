import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { CAMPAIGN_PRESETS } from "@/lib/marketing/campaignPresets";

export type MarketingCampaignRow = {
  id: string;
  store_id: string;
  name: string;
  campaign_type: string;
  message_template: string;
  is_active: boolean;
  trigger_days: number | null;
  trigger_event: string | null;
  title: string | null;
  push_url: string | null;
  last_run_at: string | null;
  preset_key: string | null;
  send_mode: string;
  audience_type: string;
  audience_config: Json | null;
  schedule_time: string | null;
  schedule_days: number[] | null;
  language_mode: string;
  linked_coupon_id: string | null;
  linked_product_id: string | null;
  quiet_hours_enabled: boolean;
  max_frequency_days: number;
  origin: string;
  only_when_open: boolean;
  title_pt: string | null;
  title_es: string | null;
  title_en: string | null;
  message_pt: string | null;
  message_es: string | null;
  message_en: string | null;
  created_at: string;
};

export type TenantMarketingSettings = {
  tenant_id: string;
  push_enabled: boolean;
  auto_campaigns_enabled: boolean;
  manual_broadcast_enabled: boolean;
  max_active_campaigns: number;
  max_sends_per_month: number;
  ai_suggestions_enabled: boolean;
  anti_spam_max_pushes: number;
  anti_spam_window_days: number;
  presets_installed: boolean;
};

export type CampaignSendLogEntry = {
  id: string;
  campaign_id: string | null;
  customer_phone: string;
  status: string;
  error_message: string | null;
  sent_at: string;
  resolved_title: string | null;
  resolved_body: string | null;
  message_locale: string | null;
};

export async function fetchTenantMarketingSettings(
  tenantId: string,
): Promise<TenantMarketingSettings | null> {
  const { data, error } = await supabase
    .from("tenant_marketing_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) return null;
  return data as TenantMarketingSettings | null;
}

export async function upsertTenantMarketingSettings(
  tenantId: string,
  patch: Partial<TenantMarketingSettings>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("tenant_marketing_settings").upsert(
    { tenant_id: tenantId, ...patch, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function installMarketingPresets(storeId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("install_marketing_presets", { _store_id: storeId });
  if (error) return { ok: false, error: error.message };
  return { ok: Boolean((data as { ok?: boolean })?.ok) };
}

export async function fetchMarketingCampaigns(storeId: string): Promise<MarketingCampaignRow[]> {
  const { data, error } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as MarketingCampaignRow[];
}

export async function toggleMarketingCampaign(
  campaignId: string,
  isActive: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("marketing_campaigns")
    .update({ is_active: isActive })
    .eq("id", campaignId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateMarketingCampaign(
  campaignId: string,
  patch: Partial<MarketingCampaignRow>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("marketing_campaigns").update(patch).eq("id", campaignId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function countMarketingSubscribers(storeId: string): Promise<number> {
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("customer_phone", "__marketing__");
  return count ?? 0;
}

export async function fetchCampaignSendHistory(
  storeId: string,
  limit = 50,
): Promise<CampaignSendLogEntry[]> {
  const { data, error } = await supabase
    .from("campaign_send_log")
    .select("id, campaign_id, customer_phone, status, error_message, sent_at, resolved_title, resolved_body, message_locale")
    .eq("store_id", storeId)
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as CampaignSendLogEntry[];
}

export async function countActiveCampaigns(storeId: string): Promise<number> {
  const { count } = await supabase
    .from("marketing_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_active", true);
  return count ?? 0;
}

export async function runMarketingCampaigns(opts: {
  storeId?: string;
  campaignId?: string;
  dryRun?: boolean;
  testSendTeam?: boolean;
  previewLocale?: string;
}) {
  const { data, error } = await supabase.functions.invoke("run-marketing-campaigns", {
    body: opts,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function sendCampaignTestToTeam(opts: {
  storeId: string;
  campaignId: string;
  previewLocale?: string;
}): Promise<{
  ok: boolean;
  sent?: number;
  title?: string;
  body?: string;
  locale?: string;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke("run-marketing-campaigns", {
    body: {
      storeId: opts.storeId,
      campaignId: opts.campaignId,
      testSendTeam: true,
      previewLocale: opts.previewLocale,
    },
  });
  if (error) return { ok: false, error: error.message };
  const payload = data as {
    ok?: boolean;
    sent?: number;
    title?: string;
    body?: string;
    locale?: string;
    error?: string;
    testSendTeam?: boolean;
  };
  return {
    ok: Boolean(payload.testSendTeam ? (payload.sent ?? 0) > 0 : payload.ok),
    sent: payload.sent,
    title: payload.title,
    body: payload.body,
    locale: payload.locale,
    error: payload.error,
  };
}

export function presetCatalogForUi() {
  return CAMPAIGN_PRESETS;
}
