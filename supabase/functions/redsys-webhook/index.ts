// Edge function: recebe notificação online Redsys/Bizum.
// Valida assinatura e atualiza pedido. verify_jwt = false (callback público).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyRedsysNotification } from "../_shared/redsysCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const rawBody = await req.text();
  let merchantParameters = "";
  let signature = "";
  let gatewayCode: "redsys" | "bizum" = "redsys";

  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      const j = JSON.parse(rawBody);
      merchantParameters = j.Ds_MerchantParameters ?? "";
      signature = j.Ds_Signature ?? "";
      gatewayCode = j.gateway === "bizum" ? "bizum" : "redsys";
    } else {
      const form = new URLSearchParams(rawBody);
      merchantParameters = form.get("Ds_MerchantParameters") ?? "";
      signature = form.get("Ds_Signature") ?? "";
      const url = new URL(req.url);
      if (url.searchParams.get("gateway") === "bizum") gatewayCode = "bizum";
    }
  } catch (_) { /* ignore */ }

  // Persistir webhook bruto sempre
  const webhookRow = await supabase.from("payment_gateway_webhooks").insert({
    gateway_code: gatewayCode,
    raw_headers: Object.fromEntries(req.headers.entries()),
    raw_body: rawBody,
    signature,
    processed: false,
  }).select("id").maybeSingle();

  if (!merchantParameters) {
    return new Response("missing parameters", { status: 400 });
  }

  // Decodifica para descobrir o Ds_Order e mapear loja
  let preParams: Record<string, string> = {};
  try {
    const decoded = atob(merchantParameters.replace(/-/g, "+").replace(/_/g, "/"));
    preParams = JSON.parse(decoded);
  } catch {/* ignore */}

  const order = preParams.Ds_Order ?? preParams.DS_ORDER ?? "";
  const merchantData = preParams.Ds_MerchantData ?? preParams.DS_MERCHANTDATA ?? "";

  let storeId: string | null = null;
  let secretKey: string | null = null;

  // Tentar localizar a transação correspondente
  const { data: tx } = await supabase
    .from("payment_gateway_transactions")
    .select("id, store_id, order_id")
    .eq("external_reference", order)
    .maybeSingle();

  if (tx) {
    storeId = tx.store_id;
    const { data: cfg } = await supabase
      .from("store_payment_gateways")
      .select("secret_key")
      .eq("store_id", tx.store_id)
      .eq("gateway_code", gatewayCode)
      .maybeSingle();
    secretKey = cfg?.secret_key ?? null;
  }

  let signatureValid = false;
  let parsed = preParams;
  if (secretKey) {
    const v = verifyRedsysNotification(merchantParameters, signature, secretKey);
    signatureValid = v.valid;
    parsed = v.params;
  }

  await supabase.from("payment_gateway_logs").insert({
    store_id: storeId,
    gateway_code: gatewayCode,
    order_id: tx?.order_id ?? null,
    direction: "webhook",
    response_payload: parsed,
    error_message: signatureValid ? null : "Assinatura inválida ou loja não encontrada",
  });

  if (webhookRow.data?.id) {
    await supabase.from("payment_gateway_webhooks").update({
      store_id: storeId,
      external_reference: order,
      signature_valid: signatureValid,
      processed: signatureValid,
      processing_error: signatureValid ? null : "Assinatura inválida ou loja não encontrada",
    }).eq("id", webhookRow.data.id);
  }

  if (signatureValid && tx) {
    const responseCode = Number(parsed.Ds_Response ?? "9999");
    const success = responseCode >= 0 && responseCode <= 99;
    await supabase.from("payment_gateway_transactions").update({
      status: success ? "succeeded" : "failed",
      authorization_code: parsed.Ds_AuthorisationCode ?? null,
      response_code: String(responseCode),
      signature_valid: true,
      raw_notification: parsed,
      error_message: success ? null : `Redsys recusou (cod ${responseCode})`,
    }).eq("id", tx.id);

    if (success && tx.order_id) {
      await supabase.from("orders").update({
        payment_status: "paid",
        payment_method: gatewayCode === "bizum" ? "bizum" : "card",
        updated_at: new Date().toISOString(),
      }).eq("id", tx.order_id);
    }
  }

  return new Response("OK", { status: 200 });
});
