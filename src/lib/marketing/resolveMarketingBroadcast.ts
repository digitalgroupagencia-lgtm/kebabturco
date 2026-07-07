import type { StaffUiLang } from "@/components/StaffLanguageToggle";
import { staffT, type StaffI18nKey } from "@/lib/staffI18n";
import { supabase } from "@/integrations/supabase/client";
import { STORE_DEFAULTS } from "@/lib/storeHours";
import {
  resolveCampaignMessage,
  type MessageLocale,
  type TemplateContext,
} from "@/lib/marketing/campaignTemplateEngine";

const LOCALES: MessageLocale[] = ["pt", "es", "en"];

export type MarketingBroadcastI18n = Record<MessageLocale, string>;

export function buildMarketingBroadcastI18n(opts: {
  title: string;
  body: string;
  titleCatalogKey?: StaffI18nKey;
  bodyCatalogKey?: StaffI18nKey;
  editorLang?: StaffUiLang;
}): { titleI18n: MarketingBroadcastI18n; bodyI18n: MarketingBroadcastI18n } {
  const { title, body, titleCatalogKey, bodyCatalogKey, editorLang = "es" } = opts;

  const titleIsCatalogDefault =
    titleCatalogKey != null && title === staffT(editorLang, titleCatalogKey);
  const bodyIsCatalogDefault =
    bodyCatalogKey != null && body === staffT(editorLang, bodyCatalogKey);

  const titleI18n = Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      titleIsCatalogDefault && titleCatalogKey ? staffT(locale, titleCatalogKey) : title,
    ]),
  ) as MarketingBroadcastI18n;

  const bodyI18n = Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      bodyIsCatalogDefault && bodyCatalogKey ? staffT(locale, bodyCatalogKey) : body,
    ]),
  ) as MarketingBroadcastI18n;

  return { titleI18n, bodyI18n };
}

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
