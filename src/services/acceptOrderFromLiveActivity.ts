import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { blocksOperationalProgressUntilPaid, orderReadyForKitchen } from "@/lib/orderKitchenRules";
import { validateAcceptPrepMinutes } from "@/features/ops/opsOrderUi";
import { endStaffOrderLiveActivity } from "@/services/staffLiveActivity";
import { toast } from "sonner";

const DEFAULT_PREP_MINUTES = 15;

export type AcceptOrderResult =
  | { ok: true; orderId: string; alreadyHandled?: boolean }
  | { ok: false; error: string; code?: string };

type OrderAcceptRow = {
  id: string;
  store_id: string;
  status: string | null;
  payment_status: string | null;
  order_type: string | null;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  table_validated: boolean | null;
};

async function buildAcceptedByPatch(): Promise<Record<string, unknown>> {
  const patch: Record<string, unknown> = {};
  try {
    const { data: u } = await supabase.auth.getUser();
    if (u?.user) {
      patch.accepted_by_user_id = u.user.id;
      patch.accepted_at = new Date().toISOString();
      let name: string | null = (u.user.user_metadata?.full_name as string | undefined) || null;
      if (!name) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", u.user.id)
          .maybeSingle();
        name = (prof?.full_name as string | null) || null;
      }
      patch.accepted_by_name = name || u.user.email || "Operador";
    }
  } catch {
    /* ignore */
  }
  return patch;
}

export async function acceptOrderViaEdgeToken(
  orderId: string,
  storeId: string,
  acceptToken: string,
  prepMinutes = DEFAULT_PREP_MINUTES,
): Promise<AcceptOrderResult> {
  const { data, error } = await supabase.functions.invoke("accept-order-from-live-activity", {
    body: {
      order_id: orderId,
      store_id: storeId,
      accept_token: acceptToken,
      prep_minutes: prepMinutes,
    },
  });

  if (error) {
    return { ok: false, error: error.message || "Falha ao aceitar pedido" };
  }

  const payload = data as { success?: boolean; error?: string; already_handled?: boolean; code?: string };
  if (payload?.success) {
    void endStaffOrderLiveActivity(orderId);
    return { ok: true, orderId, alreadyHandled: payload.already_handled };
  }

  return {
    ok: false,
    error: payload?.error || "Não foi possível aceitar",
    code: payload?.code,
  };
}

/** Aceita com sessão activa (deep link / app aberta). */
export async function acceptOrderWithSession(
  orderId: string,
  storeId: string,
  prepMinutes = DEFAULT_PREP_MINUTES,
): Promise<AcceptOrderResult> {
  if (!validateAcceptPrepMinutes(prepMinutes)) {
    return { ok: false, error: "Tempo estimado inválido" };
  }

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select(
      "id, store_id, status, payment_status, order_type, payment_method, stripe_payment_intent_id, table_validated",
    )
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (fetchError || !order) {
    return { ok: false, error: "Pedido não encontrado" };
  }

  const row = order as OrderAcceptRow;
  if (row.status !== "pending") {
    void endStaffOrderLiveActivity(orderId);
    return { ok: true, orderId, alreadyHandled: true };
  }

  if (blocksOperationalProgressUntilPaid(row)) {
    return { ok: false, error: "Confirme o pagamento no balcão primeiro", code: "payment_required" };
  }

  if (!orderReadyForKitchen(row)) {
    return { ok: false, error: "Pedido ainda não pode ir para cozinha", code: "not_ready" };
  }

  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + prepMinutes);

  const patch: Record<string, unknown> = {
    status: "preparing",
    estimated_ready_at: eta.toISOString(),
    ...(await buildAcceptedByPatch()),
  };

  const v2 = await supabase.rpc("update_order_status_v2", {
    _order_id: orderId,
    _patch: patch as Json,
  });

  if (v2.error || !v2.data) {
    return { ok: false, error: v2.error?.message || "Erro ao actualizar pedido" };
  }

  void endStaffOrderLiveActivity(orderId);
  return { ok: true, orderId };
}

export async function handleStaffLiveActivityDeepLink(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const isCustom = parsed.protocol === "kebabturco:";
  const isUniversal =
    parsed.hostname === "kebabturco.net" || parsed.hostname === "www.kebabturco.net";

  if (!isCustom && !isUniversal) return false;

  const path = parsed.pathname || "";
  const action = parsed.searchParams.get("action")?.trim();
  const openOnly = parsed.searchParams.get("open")?.trim() === "1";

  const orderMatch = path.match(/\/order\/([^/]+)/i) ?? path.match(/\/staff\/order\/([^/]+)/i);
  const orderId =
    orderMatch?.[1] ??
    parsed.searchParams.get("order")?.trim() ??
    parsed.searchParams.get("order_id")?.trim();
  const storeId = parsed.searchParams.get("store_id")?.trim();

  if (!orderId) return false;

  if (openOnly && action !== "accept") {
    if (typeof window !== "undefined") {
      const target = storeId
        ? `/panel/live?order=${encodeURIComponent(orderId)}`
        : `/?screen=tracking&order=${encodeURIComponent(orderId)}`;
      window.location.assign(target);
    }
    return true;
  }

  if (action !== "accept") return false;

  if (!storeId) return false;

  const etaRaw = Number(parsed.searchParams.get("eta") ?? DEFAULT_PREP_MINUTES);
  const prepMinutes = Number.isFinite(etaRaw) ? etaRaw : DEFAULT_PREP_MINUTES;

  const result = await acceptOrderWithSession(orderId, storeId, prepMinutes);
  if (result.ok) {
    toast.success(result.alreadyHandled ? "Pedido já estava aceite" : "Pedido aceite com sucesso");
    if (typeof window !== "undefined") {
      const target = `/panel/live?order=${encodeURIComponent(orderId)}`;
      if (window.location.pathname + window.location.search !== target) {
        window.location.assign(target);
      }
    }
    return true;
  }

  toast.error(result.error);
  return true;
}
