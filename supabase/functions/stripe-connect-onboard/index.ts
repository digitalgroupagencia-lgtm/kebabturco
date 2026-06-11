import {
  CONNECT_HANDLER_VERSION,
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
        handlerVersion: CONNECT_HANDLER_VERSION,
        modes: [
          "save_and_sync_intake",
          "resync_intake_to_stripe",
          "activate_live",
          "embedded_onboarding",
          "platform_status",
          "sync_status",
          "public_link_info",
          "public_submit_intake",
          "public_mark_verification",
          "public_onboarding_session",
          "create_onboarding_link",
        ],
        stripeConfigured: Boolean(getStripeSecretKey()),
      }),
      { headers: { ...connectCorsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.ping === true || body?.health === true) {
      return new Response(
        JSON.stringify({
          ok: true,
          service: "stripe-connect-onboard",
          handlerVersion: CONNECT_HANDLER_VERSION,
          stripeConfigured: Boolean(getStripeSecretKey()),
        }),
        { headers: { ...connectCorsHeaders, "Content-Type": "application/json" } },
      );
    }
    return await handleStripeConnectRequest(req, body);
  } catch (e) {
    return connectErrorResponse(e);
  }
});
