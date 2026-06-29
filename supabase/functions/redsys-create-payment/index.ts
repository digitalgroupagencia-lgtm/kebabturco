// Edge function: cria sessão de pagamento Redsys (cartão).
// SKELETON pronto — devolve formulário/URL Redsys quando as credenciais estiverem configuradas em store_payment_gateways.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signRedsysParams, redsysEnvironmentUrl } from "../_shared/redsysCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { storeId, orderId, amountCents, gateway = "redsys" } = await req.json();
    if (!storeId || !orderId || !amountCents) {
      return json({ error: "Parâmetros inválidos" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: cfg, error: cfgErr } = await supabase
      .from("store_payment_gateways")
      .select("*")
      .eq("store_id", storeId)
      .eq("gateway_code", gateway)
      .maybeSingle();

    if (cfgErr || !cfg) return json({ error: "Gateway não configurado" }, 404);
    if (cfg.status === "disabled") return json({ error: "Gateway desativado" }, 403);
    if (!cfg.merchant_code || !cfg.terminal || !cfg.secret_key) {
      // SKELETON: credenciais ainda não foram inseridas
      return json({
        error: "Credenciais do gateway pendentes",
        gatewayReady: false,
        nextStep: "Inserir merchant_code, terminal e secret_key em Admin > Pagamentos > " + gateway,
      }, 503);
    }

    const order = String(orderId).replace(/-/g, "").slice(0, 12);
    const params = {
      DS_MERCHANT_AMOUNT: String(amountCents),
      DS_MERCHANT_ORDER: order,
      DS_MERCHANT_MERCHANTCODE: cfg.merchant_code,
      DS_MERCHANT_CURRENCY: cfg.currency || "978",
      DS_MERCHANT_TRANSACTIONTYPE: cfg.transaction_type || "0",
      DS_MERCHANT_TERMINAL: cfg.terminal,
      DS_MERCHANT_MERCHANTURL: cfg.notification_url ?? undefined,
      DS_MERCHANT_URLOK: cfg.success_url ?? undefined,
      DS_MERCHANT_URLKO: cfg.failure_url ?? undefined,
      DS_MERCHANT_PAYMETHODS: gateway === "bizum" ? "z" : undefined,
      DS_MERCHANT_MERCHANTNAME: cfg.merchant_name ?? undefined,
      DS_MERCHANT_MERCHANTDATA: String(orderId),
    };

    const signed = signRedsysParams(params, cfg.secret_key);
    const actionUrl = redsysEnvironmentUrl(cfg.status as "sandbox" | "production");

    await supabase.from("payment_gateway_transactions").insert({
      store_id: storeId,
      gateway_code: gateway,
      order_id: orderId,
      external_reference: order,
      status: "pending",
      amount_cents: amountCents,
      currency: "EUR",
      raw_request: { params, actionUrl },
    });

    await supabase.from("payment_gateway_logs").insert({
      store_id: storeId,
      gateway_code: gateway,
      order_id: orderId,
      direction: "request",
      endpoint: actionUrl,
      request_payload: signed as unknown as Record<string, unknown>,
    });

    return json({ success: true, actionUrl, ...signed, externalReference: order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
