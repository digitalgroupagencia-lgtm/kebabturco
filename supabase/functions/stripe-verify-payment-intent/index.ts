import { corsHeaders, handleVerifyPaymentIntent } from "../_shared/stripePaymentActions.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    return handleVerifyPaymentIntent(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao confirmar pagamento";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
