import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeSecretKey } from "./stripeEnv.ts";

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
    throw new ConnectError("Loja não encontrada — verifique se a loja Kebab Turco está activa.", 404);
  }

  const { data: roles, error: rolesErr } = await service
    .from("user_roles")
    .select("role, tenant_id")
    .eq("user_id", userId);

  if (rolesErr) {
    throw new ConnectError("Não foi possível verificar permissões.", 500);
  }

  const isAdminMaster = (roles ?? []).some((r) => r.role === "admin_master");
  const tenantIds = (roles ?? []).map((r) => r.tenant_id).filter(Boolean) as string[];

  if (!isAdminMaster && !tenantIds.includes(store.tenant_id)) {
    throw new ConnectError("Sem permissão para gerir recebimentos desta loja.", 403);
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
      name: store.name || "Kebab Turco",
    },
    metadata: {
      store_id: store.id,
      platform: "kebabturco",
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
      "Conta Stripe criada mas não foi possível guardar na loja — aplique as actualizações da base de dados.",
      500,
    );
  }

  return account.id;
}

export function validateReturnUrl(returnUrl: string): void {
  try {
    const u = new URL(returnUrl);
    const host = u.hostname.toLowerCase();
    const allowedLocal = host === "localhost" || host === "127.0.0.1";
    const allowedPreview =
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovableproject.com") ||
      host === "lovable.app" ||
      host.endsWith(".kebabturco.net") ||
      host === "kebabturco.net";
    if (u.protocol === "https:") return;
    if (allowedLocal || allowedPreview) return;
    throw new Error("protocol");
  } catch {
    throw new ConnectError(
      "URL de retorno inválida — abra Recebimentos a partir do site publicado (https).",
      400,
    );
  }
}

export async function createOnboardingLink(
  stripe: Stripe,
  accountId: string,
  returnUrl: string,
): Promise<string> {
  validateReturnUrl(returnUrl);
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  if (!link.url) {
    throw new ConnectError("A Stripe não devolveu o link de onboarding.", 502);
  }
  return link.url;
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

export async function handleStripeConnectRequest(
  req: Request,
  body: Record<string, unknown>,
): Promise<Response> {
  const stripeKey = getStripeSecretKey();
  if (!stripeKey) {
    return json(
      {
        error: "Pagamentos indisponíveis — chave secreta Stripe em falta nos segredos do servidor.",
        code: "stripe_secret_missing",
      },
      503,
    );
  }

  const storeId = typeof body.storeId === "string" ? body.storeId.trim() : "";
  if (!storeId) {
    return json({ error: "Loja em falta (storeId)." }, 400);
  }

  const mode = typeof body.mode === "string" ? body.mode : "start_onboarding";
  const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl.trim() : "";

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

  if (mode === "account_session") {
    const session = await stripe.accountSessions.create({
      account: accountId,
      components: { account_onboarding: { enabled: true } },
    });
    return json({ clientSecret: session.client_secret, accountId });
  }

  // start_onboarding | onboarding_link | account_link — devolve URL Stripe numa só chamada
  if (!returnUrl) {
    return json({ error: "URL de retorno em falta." }, 400);
  }

  const url = await createOnboardingLink(stripe, accountId, returnUrl);
  return json({ url, accountId, provisioned: !store.stripe_connect_account_id });
}

export function connectErrorResponse(e: unknown): Response {
  if (e instanceof ConnectError) {
    return json({ error: e.message, code: "connect_error" }, e.status);
  }
  const stripeMsg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
  if (stripeMsg.includes("signed up for Connect")) {
    return json(
      {
        error: "A conta Stripe da plataforma ainda não tem Stripe Connect activo.",
        code: "connect_not_enabled",
      },
      503,
    );
  }
  const msg = e instanceof Error ? e.message : "Erro ao iniciar recebimentos";
  console.error("[stripe-connect]", e);
  return json({ error: msg, code: "connect_failed" }, 500);
}
