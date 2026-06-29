import {
  CONNECT_HANDLER_VERSION,
  connectCorsHeaders,
  connectErrorResponse,
  handleStripeConnectRequest,
} from "../_shared/stripeConnectOnboard.ts";
import { getStripeSecretKey, getStripeSecretKeyTest } from "../_shared/stripeEnv.ts";
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
        "cleanup_duplicate_connect_accounts",
        "finance_snapshot",
        "sync_payouts",
        "enforce_payout_policy",
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

    if (mode === "enforce_payout_policy" || mode === "sync_payouts" || mode === "finance_snapshot") {
      const service = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: store } = await service
        .from("stores")
        .select("id, stripe_connect_account_id, stripe_connect_environment, stripe_iban_last4")
        .eq("id", storeId)
        .maybeSingle();

      const useTest = store?.stripe_connect_environment === "test";
      const secret =
        (useTest ? getStripeSecretKeyTest() : getStripeSecretKey()) ??
        getStripeSecretKey() ??
        getStripeSecretKeyTest();
      if (!secret) {
        return json({ error: "Stripe não configurada no servidor." }, 503);
      }

      const Stripe = (await import("https://esm.sh/stripe@14.21.0?target=deno")).default;
      const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });
      const { sanitizeStoredConnectAccount } = await import("../_shared/stripeConnectAccountGuard.ts");
      const { RESTAURANT_PAYOUT_WEEKDAY_LABEL_PT } = await import("../_shared/stripePayoutPolicy.ts");

      let accountId = store?.stripe_connect_account_id ?? null;
      if (store?.id && accountId) {
        const sanitized = await sanitizeStoredConnectAccount(stripe, service, {
          id: store.id,
          stripe_connect_account_id: accountId,
        });
        if (sanitized.cleared) accountId = null;
      }

      const { applyConnectPayoutPolicy } = await import("../_shared/stripePayoutPolicy.ts");

      if (mode === "enforce_payout_policy") {
        if (!accountId) {
          return json({
            ok: false,
            accountId: null,
            message: "Conta de recebimentos ainda não ligada.",
            handlerVersion: CONNECT_HANDLER_VERSION,
          });
        }
        try {
          const payoutPolicy = await applyConnectPayoutPolicy(stripe, accountId);
          return json({
            ok: true,
            accountId,
            payoutPolicy,
            handlerVersion: CONNECT_HANDLER_VERSION,
            message:
              "Plataforma em repasse manual; restaurante em repasse automático às quintas-feiras.",
          });
        } catch (e) {
          console.warn("[connect] enforce_payout_policy", e);
          return json({
            ok: false,
            accountId,
            message: "Não foi possível aplicar a política de repasses agora.",
            handlerVersion: CONNECT_HANDLER_VERSION,
          });
        }
      }

      if (mode === "finance_snapshot") {
        const ledgerNetCents = Number(body.ledgerNetCents) || 0;
        if (!accountId) {
          return json({
            availableCents: 0,
            pendingCents: 0,
            payoutInterval: "weekly",
            payoutWeekday: RESTAURANT_PAYOUT_WEEKDAY_LABEL_PT,
            nextPayoutDate: null,
            nextPayoutAmountCents: null,
            ibanLast4: store?.stripe_iban_last4 ?? null,
            simulated: true,
            liveDataUnavailable: true,
          });
        }
        try {
          const { buildRestaurantFinanceSnapshot } = await import("../_shared/stripeFinanceSnapshot.ts");
          const snapshot = await buildRestaurantFinanceSnapshot(stripe, accountId, { ledgerNetCents });
          return json(snapshot);
        } catch (e) {
          console.warn("[connect] finance_snapshot fast path", e);
          return json({
            availableCents: 0,
            pendingCents: 0,
            payoutInterval: "weekly",
            payoutWeekday: RESTAURANT_PAYOUT_WEEKDAY_LABEL_PT,
            nextPayoutDate: null,
            nextPayoutAmountCents: null,
            ibanLast4: store?.stripe_iban_last4 ?? null,
            simulated: false,
            liveDataUnavailable: true,
          });
        }
      }

      if (mode === "sync_payouts") {
        if (!accountId || !store?.id) {
          return json({ synced: 0, message: "Conta Stripe ainda não ligada." });
        }
        try {
          try {
            await applyConnectPayoutPolicy(stripe, accountId);
          } catch (e) {
            console.warn("[connect] payout policy (sync_payouts)", e);
          }
          const { syncStorePayoutsFromStripe } = await import("../_shared/stripePayoutActions.ts");
          const synced = await syncStorePayoutsFromStripe(stripe, service, store.id, accountId);
          return json({ synced, accountId, handlerVersion: CONNECT_HANDLER_VERSION });
        } catch (e) {
          console.warn("[connect] sync_payouts fast path", e);
          return json({ synced: 0, accountId, message: "Não foi possível sincronizar repasses agora." });
        }
      }
    }

    return await handleStripeConnectRequest(req, body);
  } catch (e) {
    return connectErrorResponse(e);
  }
});
