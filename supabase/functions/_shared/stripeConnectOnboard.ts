import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeSecretKey, getStripeSecretKeyTest } from "./stripeEnv.ts";
import {
  fetchConnectAccountStatus,
  syncConnectAccountById,
  type ConnectAccountStatus,
} from "./stripeConnectSync.ts";
import {
  inspectPlatformConnectStatus,
  isPlatformProfileBlockedError,
  PlatformPendingError,
  platformStatusPayload,
  resolveStripeConnectContext,
  type StripeConnectContext,
} from "./stripePlatform.ts";
import { provisionTestConnectAccount } from "./stripeConnectTestProvision.ts";
import type { StripeKeyMode } from "./stripeEnv.ts";

export const connectCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...connectCorsHeaders, "Content-Type": "application/json" },
  });
}

export type ConnectStoreRow = {
  id: string;
  name: string | null;
  tenant_id: string;
  stripe_connect_account_id: string | null;
  stripe_connect_environment: StripeKeyMode | null;
};

export async function assertStoreAccess(
  service: SupabaseClient,
  userId: string,
  storeId: string,
): Promise<ConnectStoreRow> {
  const { data: store, error: storeErr } = await service
    .from("stores")
    .select("id, name, tenant_id, stripe_connect_account_id, stripe_connect_environment")
    .eq("id", storeId)
    .maybeSingle();

  if (storeErr || !store) {
    throw new ConnectError("Restaurante não encontrado.", 404, "store_not_found");
  }

  const { data: roles, error: rolesErr } = await service
    .from("user_roles")
    .select("role, tenant_id, store_id")
    .eq("user_id", userId);

  if (rolesErr) {
    throw new ConnectError("Não foi possível verificar permissões.", 500, "roles_error");
  }

  const isAdminMaster = (roles ?? []).some((r) => r.role === "admin_master");
  const storeIds = (roles ?? []).map((r) => r.store_id).filter(Boolean) as string[];
  const tenantIds = (roles ?? []).map((r) => r.tenant_id).filter(Boolean) as string[];

  const ownsStore =
    isAdminMaster ||
    storeIds.includes(store.id) ||
    tenantIds.includes(store.tenant_id);

  if (!ownsStore) {
    throw new ConnectError("Sem permissão para gerir recebimentos deste restaurante.", 403, "forbidden");
  }

  return store as ConnectStoreRow;
}

export class ConnectError extends Error {
  status: number;
  code: string;
  platform?: ReturnType<typeof platformStatusPayload>;
  constructor(message: string, status: number, code = "connect_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function loadConnectContext(store: ConnectStoreRow): Promise<StripeConnectContext> {
  const env = (store.stripe_connect_environment as StripeKeyMode | null) ?? null;
  return resolveStripeConnectContext(env, store.stripe_connect_account_id);
}

export async function ensureConnectAccount(
  ctx: StripeConnectContext,
  service: SupabaseClient,
  store: ConnectStoreRow,
): Promise<{ accountId: string; environment: StripeKeyMode }> {
  if (store.stripe_connect_account_id) {
    return {
      accountId: store.stripe_connect_account_id,
      environment: (store.stripe_connect_environment as StripeKeyMode) ?? ctx.environment,
    };
  }

  try {
    const account = await ctx.stripe.accounts.create({
      type: "express",
      country: "ES",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: store.name || "Restaurante",
      },
      metadata: {
        store_id: store.id,
        platform: "snaporder",
        environment: ctx.environment,
      },
      settings: {
        payouts: { schedule: { interval: "weekly", weekly_anchor: "monday" } },
      },
    });

    const { error: updErr } = await service
      .from("stores")
      .update({
        stripe_connect_account_id: account.id,
        stripe_connect_environment: ctx.environment,
        stripe_connect_created_at: new Date().toISOString(),
        stripe_payout_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id);

    if (updErr) {
      console.error("[connect] store update", updErr);
      throw new ConnectError(
        "Conta de recebimentos criada mas não foi possível guardar — actualize a base de dados.",
        500,
        "store_update_failed",
      );
    }

    return { accountId: account.id, environment: ctx.environment };
  } catch (e) {
    if (ctx.environment === "live" && isPlatformProfileBlockedError(e)) {
      throw new PlatformPendingError(ctx.platform);
    }
    throw e;
  }
}

function embeddedSessionComponents(mode: string): Stripe.AccountSessionCreateParams.Components {
  const notification = {
    enabled: true,
    features: { external_account_collection: true },
  };

  if (mode === "embedded_onboarding") {
    return {
      account_onboarding: { enabled: true },
      notification_banner: notification,
    };
  }

  return {
    account_management: {
      enabled: true,
      features: { external_account_collection: true },
    },
    payouts: { enabled: true },
    documents: { enabled: true },
    notification_banner: notification,
  };
}

export async function createEmbeddedAccountSession(
  stripe: Stripe,
  accountId: string,
  mode: string,
): Promise<string> {
  const session = await stripe.accountSessions.create({
    account: accountId,
    components: embeddedSessionComponents(mode),
  });
  if (!session.client_secret) {
    throw new ConnectError("Não foi possível iniciar o formulário de recebimentos.", 502, "session_failed");
  }
  return session.client_secret;
}

export async function resolveAuthUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ConnectError("Sessão expirada — faça login novamente.", 401, "unauthorized");
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user?.id) {
    throw new ConnectError("Sessão inválida — faça login novamente.", 401, "unauthorized");
  }

  return userData.user.id;
}

function statusPayload(status: ConnectAccountStatus, environment: StripeKeyMode) {
  return {
    accountId: status.accountId,
    chargesEnabled: status.chargesEnabled,
    payoutsEnabled: status.payoutsEnabled,
    onboardingCompleted: status.onboardingCompleted,
    payoutStatus: status.payoutStatus,
    businessName: status.businessName,
    ibanLast4: status.ibanLast4,
    requirementsDue: status.requirementsDue,
    ready: status.chargesEnabled && status.onboardingCompleted,
    connectEnvironment: environment,
  };
}

function connectMeta(ctx: StripeConnectContext) {
  return platformStatusPayload(ctx.platform, ctx.environment);
}

export async function handleStripeConnectRequest(
  req: Request,
  body: Record<string, unknown>,
): Promise<Response> {
  if (!getStripeSecretKey() && !getStripeSecretKeyTest()) {
    return json(
      {
        error: "Recebimentos indisponíveis — configuração do servidor incompleta.",
        code: "stripe_secret_missing",
      },
      503,
    );
  }

  const mode = typeof body.mode === "string" ? body.mode : "embedded_onboarding";
  const storeId = typeof body.storeId === "string" ? body.storeId.trim() : "";

  const userId = await resolveAuthUserId(req);
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (mode === "platform_status") {
    try {
      if (storeId) {
        const store = await assertStoreAccess(service, userId, storeId);
        const storeIsTest =
          store.stripe_connect_environment === "test" ||
          !store.stripe_connect_account_id ||
          store.stripe_connect_account_id.startsWith("simulated-");

        if (storeIsTest) {
          const testKey = getStripeSecretKeyTest();
          const testPlatform = testKey
            ? await inspectPlatformConnectStatus(
                new Stripe(testKey, { apiVersion: "2023-10-16" }),
                "test",
              )
            : {
                keyMode: "test" as const,
                connectLiveAllowed: false,
                platformProfileComplete: true,
                pendingVerification: true,
                productionBlocked: true,
                testKeysConfigured: false,
                message: null,
                adminMessage: "Modo teste — configure chaves de teste para checkout 4242.",
              };
          return json({
            ...platformStatusPayload({ ...testPlatform, productionBlocked: true }, "test"),
            hasConnectAccount: Boolean(store.stripe_connect_account_id),
          });
        }

        const ctx = await loadConnectContext(store);
        const probed = await inspectPlatformConnectStatus(
          ctx.stripe,
          ctx.environment === "test" ? "test" : "live",
          { probe: ctx.environment === "live" },
        );
        return json({
          ...platformStatusPayload({ ...ctx.platform, ...probed }, ctx.environment),
          hasConnectAccount: Boolean(store.stripe_connect_account_id),
        });
      }
      const testKey = getStripeSecretKeyTest();
      if (testKey) {
        const testStripe = new Stripe(testKey, { apiVersion: "2023-10-16" });
        const platform = await inspectPlatformConnectStatus(testStripe, "test");
        return json({
          ...platformStatusPayload(
            {
              ...platform,
              productionBlocked: true,
              pendingVerification: true,
              connectLiveAllowed: false,
              adminMessage: "Produção bloqueada até aprovação da Stripe — use modo teste.",
            },
            "test",
          ),
          hasConnectAccount: false,
        });
      }
      const liveKey = getStripeSecretKey();
      if (liveKey) {
        const liveStripe = new Stripe(liveKey, { apiVersion: "2023-10-16" });
        const platform = await inspectPlatformConnectStatus(liveStripe, "live", { probe: true });
        return json({
          ...platformStatusPayload(platform, "live"),
          hasConnectAccount: false,
        });
      }
      return json({ error: "Nenhuma chave Stripe configurada." }, 503);
    } catch (e) {
      if (e instanceof PlatformPendingError) {
        return json({
          ...platformStatusPayload(e.platform, "live"),
          hasConnectAccount: false,
          connectEnvironment: "live",
          productionBlocked: true,
        });
      }
      if (isPlatformProfileBlockedError(e)) {
        return json({
          keyMode: "live",
          connectEnvironment: "live",
          connectLiveAllowed: false,
          platformProfileComplete: false,
          pendingVerification: true,
          productionBlocked: true,
          testKeysConfigured: Boolean(getStripeSecretKeyTest()),
          message: "Produção bloqueada até aprovação da Stripe.",
          adminMessage: "Produção bloqueada até aprovação da Stripe — use modo teste.",
          hasConnectAccount: false,
        });
      }
      throw e;
    }
  }

  if (!storeId) {
    return json({ error: "Restaurante em falta." }, 400);
  }

  const store = await assertStoreAccess(service, userId, storeId);

  if (mode === "provision_test") {
    const result = await provisionTestConnectAccount(service, store);
    const testMeta = platformStatusPayload(
      {
        keyMode: "test",
        connectLiveAllowed: false,
        platformProfileComplete: true,
        pendingVerification: true,
        productionBlocked: true,
        testKeysConfigured: true,
        message: result.message,
        adminMessage: result.message,
      },
      "test",
    );
    return json({
      accountId: result.accountId,
      provisioned: true,
      simulated: result.simulated,
      ready: result.status.chargesEnabled && result.status.onboardingCompleted,
      connectEnvironment: "test",
      message: result.message,
      ...statusPayload(result.status, "test"),
      ...testMeta,
    });
  }

  let ctx: StripeConnectContext;
  try {
    ctx = await loadConnectContext(store);
  } catch (e) {
    if (e instanceof PlatformPendingError) {
      const err = new ConnectError(e.message, 503, e.code);
      err.platform = platformStatusPayload(e.platform, "live");
      throw err;
    }
    throw e;
  }

  const { accountId, environment } = await ensureConnectAccount(ctx, service, store);
  const stripe = ctx.stripe;
  const meta = connectMeta(ctx);

  if (mode === "provision") {
    return json({ accountId, provisioned: true, ...meta });
  }

  if (mode === "sync_status") {
    const status = await syncConnectAccountById(stripe, service, accountId);
    return json({ ...statusPayload(status, environment), ...meta });
  }

  if (mode === "embedded_onboarding" || mode === "embedded_management" || mode === "account_session") {
    const sessionMode = mode === "account_session" ? "embedded_onboarding" : mode;
    try {
      const clientSecret = await createEmbeddedAccountSession(stripe, accountId, sessionMode);
      return json({
        clientSecret,
        accountId,
        mode: sessionMode,
        connectEnvironment: environment,
        ...meta,
      });
    } catch (e) {
      if (environment === "test" || ctx.platform.productionBlocked) {
        return json(
          {
            error:
              "Formulário embutido indisponível em modo teste — use «Activar recebimentos de teste» para continuar.",
            code: "embedded_unavailable_use_test_provision",
            connectEnvironment: "test",
            useTestProvision: true,
            ...meta,
          },
          503,
        );
      }
      throw e;
    }
  }

  return json({ error: "Modo inválido — use embedded_onboarding." }, 400);
}

export function connectErrorResponse(e: unknown): Response {
  if (e instanceof ConnectError) {
    return json(
      {
        error: e.message,
        code: e.code,
        platform: e.platform ?? undefined,
      },
      e.status,
    );
  }
  if (e instanceof PlatformPendingError) {
    return json(
      {
        error: e.message,
        code: e.code,
        platform: platformStatusPayload(e.platform, "live"),
        productionBlocked: true,
      },
      503,
    );
  }
  if (isPlatformProfileBlockedError(e)) {
    return json(
      {
        error:
          "Plataforma pendente de verificação — pagamentos reais bloqueados até a Stripe aprovar o perfil da plataforma.",
        code: "platform_pending_verification",
        productionBlocked: true,
      },
      503,
    );
  }
  const stripeMsg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
  if (stripeMsg.includes("signed up for Connect")) {
    return json(
      {
        error: "Recebimentos online ainda não activos na plataforma.",
        code: "connect_not_enabled",
      },
      503,
    );
  }
  const msg = e instanceof Error ? e.message : "Erro ao iniciar recebimentos";
  console.error("[stripe-connect]", e);
  return json({ error: msg, code: "connect_failed" }, 500);
}

export { syncConnectAccountById };
