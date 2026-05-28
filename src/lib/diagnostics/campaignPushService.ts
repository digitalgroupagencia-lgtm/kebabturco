import { supabase } from "@/integrations/supabase/client";
import { getLocalPushSubscription } from "@/lib/push/getLocalPushSubscription";
import { translateServerVapidReason } from "@/lib/push/pushTestService";
import { campaignDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";
import { CUSTOMER_MARKETING_PUSH_TAG } from "@/lib/customerMarketingPush";

export type MarketingBroadcastResult = {
  ok: boolean;
  sent?: number;
  matched?: number;
  targeted?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
  userMessage?: string;
};

export type CampaignPreset = {
  key: string;
  name: string;
  triggerDays: number;
  title: string;
  message: string;
  triggerEvent: "first_order" | "inactive" | "promo_manual";
};

export const CAMPAIGN_PRESETS: CampaignPreset[] = [
  {
    key: "welcome-2d",
    name: "Boas-vindas +2 dias",
    triggerDays: 2,
    title: "Obrigado pela primeira encomenda!",
    message: "Volte em breve — temos novidades na carta.",
    triggerEvent: "first_order",
  },
  {
    key: "followup-5d",
    name: "Reforço +5 dias",
    triggerDays: 5,
    title: "Como foi a experiência?",
    message: "Peça de novo hoje com entrega rápida.",
    triggerEvent: "first_order",
  },
  {
    key: "winback-30d",
    name: "Winback +30 dias",
    triggerDays: 30,
    title: "Sentimos a sua falta",
    message: "Há tempo que não pede — volte hoje!",
    triggerEvent: "first_order",
  },
];

export type CampaignRow = {
  id: string;
  name: string;
  campaign_type: string;
  message_template: string;
  is_active: boolean;
  trigger_days: number | null;
  trigger_event?: string | null;
  title?: string | null;
  push_url?: string | null;
  last_run_at?: string | null;
};

export type CampaignSendLogRow = {
  id: string;
  campaign_id: string | null;
  customer_phone: string;
  status: string;
  error_message: string | null;
  sent_at: string;
};

function log(stage: string, level: "info" | "warn" | "error", message: string, details?: Record<string, unknown>) {
  campaignDiagnosticLogger.log({ stage, level, message, context: "campaign", details });
}

export async function countMarketingSubscribers(storeId: string): Promise<number> {
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("customer_phone", CUSTOMER_MARKETING_PUSH_TAG);
  return count ?? 0;
}

export async function sendMarketingBroadcast(opts: {
  storeId: string;
  title: string;
  body: string;
  url?: string;
  target: "all" | "this_device";
}): Promise<MarketingBroadcastResult> {
  const { storeId, title, body, url = "/", target } = opts;

  log("broadcast", "info", target === "all" ? "Envio a todos os clientes" : "Envio a este dispositivo", {
    storeId,
    title,
  });

  const bodyPayload: Record<string, unknown> = {
    storeId,
    title,
    body,
    tag: `marketing-${storeId}-${Date.now()}`,
    url,
  };

  if (target === "all") {
    bodyPayload.audience = "marketing";
  } else {
    const directSubscription = await getLocalPushSubscription();
    if (!directSubscription) {
      const userMessage = "Registe push de cliente neste browser primeiro (tab Push).";
      log("broadcast", "warn", userMessage);
      return { ok: false, userMessage };
    }
    bodyPayload.testDirect = true;
    bodyPayload.directSubscription = directSubscription;
    bodyPayload.audience = "marketing";
  }

  try {
    const { data, error } = await supabase.functions.invoke("send-push-notification", { body: bodyPayload });
    if (error) {
      log("broadcast", "error", error.message);
      return { ok: false, error: error.message, userMessage: "Erro ao contactar servidor" };
    }

    const payload = data as {
      sent?: number;
      matched?: number;
      targeted?: number;
      skipped?: boolean;
      reason?: string;
      error?: string;
    };

    if (payload.error) {
      log("broadcast", "error", payload.error);
      return { ok: false, error: payload.error };
    }
    if (payload.skipped) {
      const userMessage = translateServerVapidReason(payload.reason);
      log("broadcast", "warn", userMessage);
      return { ok: false, skipped: true, reason: payload.reason, userMessage };
    }

    const sent = payload.sent ?? 0;
    log("broadcast", sent > 0 ? "info" : "warn", `Enviado para ${sent} dispositivo(s)`, payload);
    return { ok: sent > 0, ...payload };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("broadcast", "error", message);
    return { ok: false, error: message };
  }
}

export async function fetchStoreCampaigns(storeId: string): Promise<CampaignRow[]> {
  const { data, error } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    log("fetch", "error", error.message);
    return [];
  }
  return (data ?? []) as CampaignRow[];
}

export async function upsertCampaignPreset(storeId: string, preset: CampaignPreset): Promise<{ ok: boolean; error?: string }> {
  const { data: existing } = await supabase
    .from("marketing_campaigns")
    .select("id")
    .eq("store_id", storeId)
    .eq("name", preset.name)
    .maybeSingle();

  const row = {
    store_id: storeId,
    name: preset.name,
    campaign_type: "winback",
    message_template: preset.message,
    trigger_days: preset.triggerDays,
    trigger_event: preset.triggerEvent,
    title: preset.title,
    push_url: "/",
    is_active: true,
  };

  if (existing?.id) {
    const { error } = await supabase.from("marketing_campaigns").update(row).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("marketing_campaigns").insert(row);
    if (error) return { ok: false, error: error.message };
  }

  log("save", "info", `Campanha guardada: ${preset.name}`, preset);
  return { ok: true };
}

export async function fetchCampaignSendLog(storeId: string, limit = 20): Promise<CampaignSendLogRow[]> {
  const { data, error } = await supabase
    .from("campaign_send_log")
    .select("id, campaign_id, customer_phone, status, error_message, sent_at")
    .eq("store_id", storeId)
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.includes("campaign_send_log")) {
      log("fetch", "warn", "Tabela campaign_send_log ainda não aplicada — faça Sync + migrations na Lovable");
      return [];
    }
    log("fetch", "error", error.message);
    return [];
  }
  return (data ?? []) as CampaignSendLogRow[];
}

export async function simulateCampaignRun(storeId: string, campaignId?: string, dryRun = true) {
  log("simulate", "info", dryRun ? "Simulação (dry-run)" : "Execução manual", { storeId, campaignId });
  const { data, error } = await supabase.functions.invoke("run-marketing-campaigns", {
    body: { storeId, campaignId, dryRun, simulate: true },
  });
  if (error) {
    log("simulate", "error", error.message);
    return { ok: false, error: error.message };
  }
  log("simulate", "info", "Motor de campanhas respondeu", data as Record<string, unknown>);
  return { ok: true, data };
}
