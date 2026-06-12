import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  handleOperationalDiagnostics,
  handleVerifyPaymentIntent,
  computeApplicationFeeCents,
  computeCustomerTotalCents,
  computeOnlineServiceFeeCents,
  computeRestaurantPortionCents,
  PLATFORM_FEE_CENTS,
} from "../_shared/stripePaymentActions.ts";
import { estimatedStripeFeeInServiceFee } from "../_shared/stripeFees.ts";
import {
  getStripeSecretKey,
  getStripeSecretKeyTest,
  getStripePublishableKey,
  pickStripeSecretForEnvironment,
  stripeKeyMode,
} from "../_shared/stripeEnv.ts";
import { connectErrorResponse, handleStripeConnectRequest } from "../_shared/stripeConnectOnboard.ts";
import { buildLivePlatformStatus } from "../_shared/stripePlatform.ts";
import {
  loadStoreConnectPaymentRow,
  resolveStoreConnectEnvironment,
  type StoreConnectPaymentRow,
} from "../_shared/stripeStoreConnect.ts";
import { syncConnectAccountById } from "../_shared/stripeConnectSync.ts";
import {
  handleStaffCreateMember,
  handleStaffUpdateMember,
  handleStaffAuditPing,
} from "../_shared/staffMemberActions.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refreshLiveConnectStore(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
  store: StoreConnectPaymentRow,
): Promise<StoreConnectPaymentRow> {
  if (!store.stripe_connect_account_id || store.stripe_connect_test_simulated) return store;
  const liveKey = pickStripeSecretForEnvironment("live");
  if (!liveKey) return store;
  try {
    const stripe = new Stripe(liveKey, { apiVersion: "2023-10-16" });
    await syncConnectAccountById(stripe, supabase, store.stripe_connect_account_id, storeId);
    const reloaded = await loadStoreConnectPaymentRow(supabase, storeId);
    return reloaded.store ?? store;
  } catch (e) {
    console.warn("[checkout] live connect sync skipped", e);
    return store;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const stripeConfigured = Boolean(getStripeSecretKey());
    return json({
      ok: true,
      service: "stripe-create-payment-intent",
      stripeConfigured,
      platformFeeCents: PLATFORM_FEE_CENTS,
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    if (body?.health === true || body?.ping === true) {
      const stripeConfigured = Boolean(getStripeSecretKey());
      return json({
        ok: true,
        service: "stripe-create-payment-intent",
        stripeConfigured,
        platformFeeCents: PLATFORM_FEE_CENTS,
      });
    }

    if (body?.action === "diagnostics") {
      return handleOperationalDiagnostics(req, body);
    }

    if (body?.action === "verify") {
      return handleVerifyPaymentIntent(body);
    }

    if (body?.action === "connect_onboard") {
      try {
        return await handleStripeConnectRequest(req, body);
      } catch (e) {
        return connectErrorResponse(e);
      }
    }

    if (body?.action === "staff_update_member") {
      return handleStaffUpdateMember(req, body);
    }

    if (body?.action === "staff_audit_ping") {
      return handleStaffAuditPing(req, body);
    }

    if (body?.action === "staff_create_member") {
      return handleStaffCreateMember(req, body);
    }

    const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";

    if (
      (body?.action === "checkout_profile" ||
        body?.action === "sync_connect_status" ||
        body?.action === "enable_bizum") &&
      storeId
    ) {
      const supabaseProfile = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      if (body?.action === "sync_connect_status") {
        try {
          const { runStoreConnectStatusSync } = await import("../_shared/stripeConnectPublicSync.ts");
          return json(await runStoreConnectStatusSync(supabaseProfile, storeId));
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erro ao sincronizar recebimentos";
          return json({ error: msg, code: "sync_failed" }, 400);
        }
      }

      if (body?.action === "enable_bizum") {
        try {
          const { runStoreBizumEnable } = await import("../_shared/stripeConnectPublicSync.ts");
          return json(await runStoreBizumEnable(supabaseProfile, storeId));
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erro ao activar Bizum";
          return json({ error: msg, code: "bizum_enable_failed" }, 400);
        }
      }

      const loaded = await loadStoreConnectPaymentRow(supabaseProfile, storeId);
      if (loaded.error || !loaded.store) {
        return json({ error: "Loja não encontrada" }, 404);
      }
      const synced = await refreshLiveConnectStore(supabaseProfile, storeId, loaded.store);
      const { data: fullStore } = await supabaseProfile
        .from("stores")
        .select(
          "stripe_connect_account_id, stripe_connect_environment, stripe_connect_test_simulated, stripe_charges_enabled, stripe_onboarding_completed, stripe_payouts_enabled, stripe_iban_last4, stripe_business_name, stripe_payout_status, stripe_last_payout_at",
        )
        .eq("id", storeId)
        .eq("is_active", true)
        .maybeSingle();
      return json(fullStore ?? synced);
    }
    const subtotalCents = Number(body?.subtotalCents) || 0;
    const deliveryCents = Number(body?.deliveryCents) || 0;
    const discountCents = Number(body?.discountCents) || 0;
    const amountCentsDirect = Number(body?.amountCents) || 0;
    const looksLikePayment =
      body?.createPayment === true ||
      body?.intent === "payment" ||
      amountCentsDirect >= 50 ||
      subtotalCents >= 50;

    if (!looksLikePayment) {
      const stripeConfigured = Boolean(getStripeSecretKey()) || Boolean(getStripeSecretKeyTest());
      return json({
        ok: true,
        service: "stripe-create-payment-intent",
        stripeConfigured,
        platformFeeCents: PLATFORM_FEE_CENTS,
        message: stripeConfigured
          ? "Serviço activo — envie storeId e valores do pedido para criar pagamento."
          : "Stripe não configurada — adicione STRIPE_SECRET_KEY nos segredos Lovable Cloud.",
      });
    }

    const {
      orderType,
      metadata = {},
      paymentMethodType,
    } = body;

    const stripePaymentMethod =
      typeof paymentMethodType === "string" && paymentMethodType.trim().toLowerCase() === "bizum"
        ? "bizum"
        : "card";

    const restaurantPortionCents = computeRestaurantPortionCents(
      Number(subtotalCents) || 0,
      Number(deliveryCents) || 0,
      Number(discountCents) || 0,
    );
    const onlineServiceFeeCents = computeOnlineServiceFeeCents(restaurantPortionCents);
    const amountCents = computeCustomerTotalCents(restaurantPortionCents);
    const applicationFeeCents = computeApplicationFeeCents(restaurantPortionCents);
    const estimatedStripeFeeCents = estimatedStripeFeeInServiceFee(onlineServiceFeeCents);

    if (!storeId || restaurantPortionCents < 50 || amountCents < 50 || amountCents > 1_000_00 * 10) {
      return json({ error: "Parâmetros inválidos" }, 400);
    }

    const ALLOWED_META_KEYS = new Set(["order_id", "order_number", "table_number", "customer_name"]);
    const safeMeta: Record<string, string> = {};
    if (metadata && typeof metadata === "object") {
      for (const [k, v] of Object.entries(metadata)) {
        if (ALLOWED_META_KEYS.has(k) && typeof v === "string" && v.length <= 200) {
          safeMeta[k] = v;
        }
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const loadedStore = await loadStoreConnectPaymentRow(supabase, storeId);
    let store = loadedStore.store;
    const storeLoadErr = loadedStore.error;

    if (storeLoadErr || !store) {
      return json({ error: "Recebimentos online ainda não activos para esta loja" }, 400);
    }

    store = await refreshLiveConnectStore(supabase, storeId, store);

    const testSimulated = Boolean(store?.stripe_connect_test_simulated);

    if (
      !testSimulated &&
      (!store.stripe_connect_account_id || !store.stripe_charges_enabled || !store.stripe_onboarding_completed)
    ) {
      return json({ error: "Recebimentos online ainda não activos para esta loja" }, 400);
    }

    if (testSimulated && (!store.stripe_charges_enabled || !store.stripe_onboarding_completed)) {
      return json({ error: "Recebimentos online ainda não activos para esta loja" }, 400);
    }

    const connectEnv = await resolveStoreConnectEnvironment(store);
    const stripeKey = pickStripeSecretForEnvironment(connectEnv === "test" || testSimulated ? "test" : connectEnv);
    if (!stripeKey) {
      return json(
        {
          error:
            connectEnv === "test"
              ? "Pagamentos de teste indisponíveis — falta chave secreta de teste no servidor."
              : "Pagamentos online indisponíveis — falta chave secreta no servidor.",
          code: "stripe_secret_missing",
        },
        503,
      );
    }

    if (connectEnv === "live" && stripeKeyMode(stripeKey) === "live") {
      const livePlatform = await buildLivePlatformStatus();
      if (livePlatform?.productionBlocked) {
        return json(
          {
            error:
              "Produção bloqueada — plataforma pendente de verificação. Use modo teste ou aguarde aprovação.",
            code: "platform_pending_verification",
            productionBlocked: true,
          },
          503,
        );
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const baseMeta = {
      ...safeMeta,
      store_id: storeId,
      order_type: orderType || "dine_in",
      stripe_connect_account_id: store.stripe_connect_account_id ?? "",
      restaurant_portion_cents: String(restaurantPortionCents),
      online_service_fee_cents: String(onlineServiceFeeCents),
      platform_fee_cents: String(PLATFORM_FEE_CENTS),
      estimated_stripe_fee_cents: String(estimatedStripeFeeCents),
      subtotal_cents: String(subtotalCents),
      delivery_cents: String(deliveryCents),
      discount_cents: String(discountCents),
    };

    const intent = testSimulated
      ? await stripe.paymentIntents.create({
          amount: amountCents,
          currency: "eur",
          payment_method_types: [stripePaymentMethod],
          metadata: {
            ...baseMeta,
            test_simulated: "true",
            connect_mode: "test_simulated",
            checkout_payment_method: stripePaymentMethod,
          },
        })
      : await stripe.paymentIntents.create({
          amount: amountCents,
          currency: "eur",
          application_fee_amount: applicationFeeCents,
          transfer_data: { destination: store.stripe_connect_account_id! },
          on_behalf_of: store.stripe_connect_account_id!,
          ...(stripePaymentMethod === "card"
            ? { automatic_payment_methods: { enabled: true, allow_redirects: "never" as const } }
            : { payment_method_types: [stripePaymentMethod] }),
          metadata: {
            ...baseMeta,
            checkout_payment_method: stripePaymentMethod,
          },
        });

    const responseEnvironment = connectEnv === "test" || testSimulated ? "test" : "live";

    return json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amountCents,
      restaurantPortionCents,
      onlineServiceFeeCents,
      platformFeeCents: PLATFORM_FEE_CENTS,
      estimatedStripeFeeCents,
      stripeConnectAccountId: store.stripe_connect_account_id,
      connectEnvironment: responseEnvironment,
      publishableKey: getStripePublishableKey(responseEnvironment),
      testSimulated,
      checkoutPaymentMethod: stripePaymentMethod,
      paymentMethodTypes: intent.payment_method_types ?? [stripePaymentMethod],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao iniciar pagamento";
    return json({ error: msg }, 500);
  }
});
