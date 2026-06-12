import {
  CONNECT_HANDLER_VERSION,
  connectCorsHeaders,
  connectErrorResponse,
  handleStripeConnectRequest,
} from "../_shared/stripeConnectOnboard.ts";
import { getStripeSecretKey } from "../_shared/stripeEnv.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runStoreConnectStatusSync } from "../_shared/stripeConnectPublicSync.ts";

/** Loja Gandia — fallback quando sync não envia storeId (ex.: botão Lovable). */
const DEFAULT_SYNC_STORE_ID = "22222222-2222-2222-2222-222222222222";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...connectCorsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePublicSync(storeId: string): Promise<Response> {
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    const synced = await runStoreConnectStatusSync(service, storeId);
    return json(synced);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao sincronizar recebimentos";
    return json({ error: msg, code: "sync_failed" }, 400);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: connectCorsHeaders });
  }

  if (req.method === "GET") {
    return json({
      ok: true,
      service: "stripe-connect-onboard",
      handlerVersion: CONNECT_HANDLER_VERSION,
      publicSync: true,
      modes: [
        "save_and_sync_intake",
        "resync_intake_to_stripe",
        "activate_live",
        "embedded_onboarding",
        "platform_status",
        "sync_status",
        "finance_snapshot",
        "public_link_info",
        "public_submit_intake",
        "public_onboarding_session",
        "create_onboarding_link",
      ],
      stripeConfigured: Boolean(getStripeSecretKey()),
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    if (body?.ping === true || body?.health === true) {
      return json({
        ok: true,
        service: "stripe-connect-onboard",
        handlerVersion: CONNECT_HANDLER_VERSION,
        publicSync: true,
        stripeConfigured: Boolean(getStripeSecretKey()),
      });
    }

    const mode = typeof body?.mode === "string" ? body.mode : "";
    const storeId =
      typeof body?.storeId === "string" && body.storeId.trim()
        ? body.storeId.trim()
        : DEFAULT_SYNC_STORE_ID;

    if (mode === "sync_status" || mode === "public_sync_status") {
      return await handlePublicSync(storeId);
    }

    if (mode === "enable_bizum") {
      const service = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      try {
        const { runStoreBizumEnable } = await import("../_shared/stripeConnectPublicSync.ts");
        return json(await runStoreBizumEnable(service, storeId));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao activar Bizum";
        return json({ error: msg, code: "bizum_enable_failed" }, 400);
      }
    }

    return await handleStripeConnectRequest(req, body);
  } catch (e) {
    return connectErrorResponse(e);
  }
});
