import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeSecretKey } from "./stripeEnv.ts";
import {
  fetchConnectAccountStatus,
  persistConnectAccountStatus,
  syncConnectAccountById,
  type ConnectAccountStatus,
} from "./stripeConnectSync.ts";

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
};

export async function assertStoreAccess(
  service: SupabaseClient,
  userId: string,
  storeId: string,
): Promise<ConnectStoreRow> {
  const { data: store, error: storeErr } = await service
    .from("stores")
    .select("id, name, tenant_id, stripe_connect_account_id")
    .eq("id", storeId)
    .maybeSingle();

  if (storeErr || !store) {
    throw new ConnectError("Restaurante não encontrado.", 404);
  }

  const { data: roles, error: rolesErr } = await service
    .from("user_roles")
    .select("role, tenant_id, store_id")
    .eq("user_id", userId);

  if (rolesErr) {
    throw new ConnectError("Não foi possível verificar permissões.", 500);
  }

  const isAdminMaster = (roles ?? []).some((r) => r.role === "admin_master");
  const storeIds = (roles ?? []).map((r) => r.store_id).filter(Boolean) as string[];
  const tenantIds = (roles ?? []).map((r) => r.tenant_id).filter(Boolean) as string[];

  const ownsStore =
    isAdminMaster ||
    storeIds.includes(store.id) ||
    tenantIds.includes(store.tenant_id);

  if (!ownsStore) {
    throw new ConnectError("Sem permissão para gerir recebimentos deste restaurante.", 403);
  }

  return store as ConnectStoreRow;
}

export class ConnectError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function ensureConnectAccount(
  stripe: Stripe,
  service: SupabaseClient,
  store: ConnectStoreRow,
): Promise<string> {
  if (store.stripe_connect_account_id) return store.stripe_connect_account_id;

  const account = await stripe.accounts.create({
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
    },
    settings: {
      payouts: { schedule: { interval: "daily" } },
    },
  });

  const { error: updErr } = await service
    .from("stores")
    .update({
      stripe_connect_account_id: account.id,
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
    );
  }

  return account.id;
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
    throw new ConnectError("Não foi possível iniciar o formulário de recebimentos.", 502);
  }
  return session.client_secret;
}

export async function resolveAuthUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ConnectError("Sessão expirada — faça login novamente.", 401);
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user?.id) {
    throw new ConnectError("Sessão inválida — faça login novamente.", 401);
  }

  return userData.user.id;
}

function statusPayload(status: ConnectAccountStatus) {
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
  };
}

export async function handleStripeConnectRequest(
  req: Request,
  body: Record<string, unknown>,
): Promise<Response> {
  const stripeKey = getStripeSecretKey();
  if (!stripeKey) {
    return json(
      {
        error: "Recebimentos indisponíveis — configuração do servidor incompleta.",
        code: "stripe_secret_missing",
      },
      503,
    );
  }

  const storeId = typeof body.storeId === "string" ? body.storeId.trim() : "";
  if (!storeId) {
    return json({ error: "Restaurante em falta." }, 400);
  }

  const mode = typeof body.mode === "string" ? body.mode : "embedded_onboarding";

  const userId = await resolveAuthUserId(req);
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const store = await assertStoreAccess(service, userId, storeId);
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const accountId = await ensureConnectAccount(stripe, service, store);

  if (mode === "provision") {
    return json({ accountId, provisioned: true });
  }

  if (mode === "sync_status") {
    const status = await syncConnectAccountById(stripe, service, accountId);
    return json(statusPayload(status));
  }

  if (mode === "embedded_onboarding" || mode === "embedded_management" || mode === "account_session") {
    const sessionMode = mode === "account_session" ? "embedded_onboarding" : mode;
    const clientSecret = await createEmbeddedAccountSession(stripe, accountId, sessionMode);
    return json({ clientSecret, accountId, mode: sessionMode });
  }

  // Legacy redirect — apenas fallback de emergência
  const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl.trim() : "";
  if (!returnUrl) {
    return json({ error: "Modo inválido — use embedded_onboarding." }, 400);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return json({ url: link.url, accountId, legacy: true });
}

export function connectErrorResponse(e: unknown): Response {
  if (e instanceof ConnectError) {
    return json({ error: e.message, code: "connect_error" }, e.status);
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

export { syncConnectAccountById, persistConnectAccountStatus, fetchConnectAccountStatus };
