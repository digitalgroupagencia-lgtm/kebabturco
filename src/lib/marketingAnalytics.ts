import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const SESSION_KEY = "kt-marketing-session";

export type MarketingEventName =
  | "menu_view"
  | "product_view"
  | "cart_start"
  | "checkout_start"
  | "order_completed"
  | "account_open";

function sessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Evento de conversão — grava no Supabase e opcionalmente no Google Analytics. */
export async function trackMarketingEvent(
  eventName: MarketingEventName,
  opts?: {
    storeId?: string | null;
    customerPhone?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const sid = sessionId();
  const meta = opts?.metadata ?? {};

  try {
    if (opts?.storeId) {
      await supabase.rpc("track_marketing_event", {
        _store_id: opts.storeId,
        _event_name: eventName,
        _session_id: sid,
        _customer_phone: opts?.customerPhone ?? undefined,
        _metadata: meta as Json,
      });
    }
  } catch {
    /* offline / migration pendente */
  }

  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  if (gaId && typeof window.gtag === "function") {
    window.gtag("event", eventName, { session_id: sid, ...meta });
  }
}

export type MarketingFunnelStats = {
  menu_views: number;
  cart_starts: number;
  checkout_starts: number;
  orders_completed: number;
  abandon_rate_pct: number;
};

export async function fetchMarketingFunnel(
  storeId: string,
  sinceDays = 30,
): Promise<MarketingFunnelStats | null> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const { data, error } = await supabase.rpc("get_marketing_funnel_stats", {
    _store_id: storeId,
    _since: since.toISOString(),
  });
  if (error || !data) return null;
  return data as MarketingFunnelStats;
}
