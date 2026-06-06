// Edge function: testa configuração do gateway de uma loja.
// Verifica se campos obrigatórios estão presentes e atualiza last_test_*.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const REQUIRED: Record<string, string[]> = {
  redsys: ["merchant_code", "terminal", "secret_key", "currency"],
  bizum: ["merchant_code", "terminal", "secret_key"],
  stripe: [], // já existe gestão dedicada
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { storeId, gateway } = await req.json();
    if (!storeId || !gateway) return json({ error: "Parâmetros inválidos" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfg } = await supabase
      .from("store_payment_gateways")
      .select("*")
      .eq("store_id", storeId)
      .eq("gateway_code", gateway)
      .maybeSingle();

    if (!cfg) return json({ success: false, message: "Configuração inexistente" }, 404);

    const required = REQUIRED[gateway] ?? [];
    const missing = required.filter((f) => !((cfg as Record<string, unknown>)[f]));
    const ok = cfg.status !== "disabled" && missing.length === 0;
    const message = ok
      ? `Configuração válida (${cfg.status}).`
      : cfg.status === "disabled"
        ? "Gateway desativado."
        : `Campos obrigatórios em falta: ${missing.join(", ")}`;

    await supabase.from("store_payment_gateways").update({
      last_test_at: new Date().toISOString(),
      last_test_success: ok,
      last_test_message: message,
    }).eq("id", cfg.id);

    return json({ success: ok, message, missing });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
