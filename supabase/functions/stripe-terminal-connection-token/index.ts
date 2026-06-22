import { corsHeaders } from "../_shared/stripePaymentActions.ts";
import {
  authenticateStaffTerminalRequest,
  createTerminalConnectionTokenPayload,
  verifyTerminalLocationPayload,
} from "../_shared/stripeTerminalActions.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const storeId = typeof body?.storeId === "string" ? body.storeId : null;
    const action = typeof body?.action === "string" ? body.action.trim() : "";
    const stripeAccountParam =
      typeof body?.stripeAccount === "string" ? body.stripeAccount.trim() : "";
    if (!storeId) {
      return json({ error: "storeId é obrigatório" }, 400);
    }

    const auth = await authenticateStaffTerminalRequest(req);
    if (!auth.ok) {
      return json({ error: auth.error }, auth.status);
    }

    if (action === "verifyLocation") {
      const outcome = await verifyTerminalLocationPayload(auth.service, storeId);
      return json(outcome, outcome.ok ? 200 : 404);
    }

    const payload = await createTerminalConnectionTokenPayload(
      auth.service,
      storeId,
      stripeAccountParam,
    );
    return json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar token Terminal";
    return json({ error: msg }, 500);
  }
});
