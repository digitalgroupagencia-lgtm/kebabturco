// Bizum reutiliza a mesma engine Redsys com paymethod "z".
// Esta function é apenas um atalho semântico — toda a lógica vive em redsys-create-payment.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signRedsysParams, redsysEnvironmentUrl } from "../_shared/redsysCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { storeId, orderId, amountCents } = await req.json();
    if (!storeId || !orderId || !amountCents) return json({ error: "Parâmetros inválidos" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfg } = await supabase
      .from("store_payment_gateways")
      .select("*")
      .eq("store_id", storeId)
      .eq("gateway_code", "bizum")
      .maybeSingle();

    if (!cfg || cfg.status === "disabled") return json({ error: "Bizum desativado" }, 403);
    if (!cfg.merchant_code || !cfg.terminal || !cfg.secret_key) {
      return json({ error: "Credenciais Bizum pendentes", gatewayReady: false }, 503);
    }

    const order = String(orderId).replace(/-/g, "").slice(0, 12);
    const signed = signRedsysParams({
      DS_MERCHANT_AMOUNT: String(amountCents),
      DS_MERCHANT_ORDER: order,
      DS_MERCHANT_MERCHANTCODE: cfg.merchant_code,
      DS_MERCHANT_CURRENCY: cfg.currency || "978",
      DS_MERCHANT_TRANSACTIONTYPE: cfg.transaction_type || "0",
      DS_MERCHANT_TERMINAL: cfg.terminal,
      DS_MERCHANT_MERCHANTURL: cfg.notification_url ?? undefined,
      DS_MERCHANT_URLOK: cfg.success_url ?? undefined,
      DS_MERCHANT_URLKO: cfg.failure_url ?? undefined,
      DS_MERCHANT_PAYMETHODS: "z",
      DS_MERCHANT_MERCHANTNAME: cfg.merchant_name ?? undefined,
      DS_MERCHANT_MERCHANTDATA: String(orderId),
    }, cfg.secret_key);

    const actionUrl = redsysEnvironmentUrl(cfg.status as "sandbox" | "production");

    await supabase.from("payment_gateway_transactions").insert({
      store_id: storeId, gateway_code: "bizum", order_id: orderId,
      external_reference: order, status: "pending",
      amount_cents: amountCents, currency: "EUR",
      raw_request: { actionUrl },
    });

    return json({ success: true, actionUrl, ...signed, externalReference: order });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
