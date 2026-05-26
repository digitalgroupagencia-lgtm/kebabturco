import {
  connectCorsHeaders,
  connectErrorResponse,
  handleStripeConnectRequest,
} from "../_shared/stripeConnectOnboard.ts";
import { getStripeSecretKey } from "../_shared/stripeEnv.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: connectCorsHeaders });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        service: "stripe-connect-onboard",
        stripeConfigured: Boolean(getStripeSecretKey()),
      }),
      { headers: { ...connectCorsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    return await handleStripeConnectRequest(req, body);
  } catch (e) {
    return connectErrorResponse(e);
  }
});
