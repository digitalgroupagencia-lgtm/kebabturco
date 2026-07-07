import { supabase } from "@/integrations/supabase/client";
import { STORE_DEFAULTS } from "@/lib/storeHours";
import {
  resolveCampaignMessage,
  type MessageLocale,
  type TemplateContext,
} from "@/lib/marketing/campaignTemplateEngine";

export async function resolveMarketingBroadcastCopy(
  storeId: string,
  title: string,
  body: string,
  locale: MessageLocale = "es",
): Promise<{ title: string; body: string }> {
  const { data: store } = await supabase
    .from("stores")
    .select("name")
    .eq("id", storeId)
    .maybeSingle();

  const ctx: TemplateContext = {
    storeName: store?.name?.trim() || "Kebab Turco",
    locale,
    weeklySchedule: STORE_DEFAULTS,
    timezone: "Europe/Madrid",
    menuUrl: "/",
  };

  return {
    title: resolveCampaignMessage(title, ctx),
    body: resolveCampaignMessage(body, ctx),
  };
}
