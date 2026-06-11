import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeSecretKey, getStripeSecretKeyTest, stripeKeyMode } from "./stripeEnv.ts";
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
import {
  accountNeedsEmbeddedCompletionStep,
  accountNeedsOwnerVerificationStep,
  createLiveCustomAccountFromIntake,
  DEFAULT_BUSINESS_WEBSITE,
  intakeComplete,
  isStripeAccountCriticallyIncomplete,
  syncLiveCustomAccountFromIntake,
  type CustomIntakeRow,
} from "./stripeConnectCustomProvision.ts";
import { buildIntakeNotes, enrichIntakeRow, mergeIntakeNotes, parseIntakeNotes } from "./stripeConnectIntakeMeta.ts";

/** Bump when edge deploy changes — visible em GET /stripe-connect-onboard para confirmar versão live. */
export const CONNECT_HANDLER_VERSION = "2026-06-11-custom-v15";
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

async function loadConnectContext(
  store: ConnectStoreRow,
  options?: { requireLive?: boolean },
): Promise<StripeConnectContext> {
  const env = (store.stripe_connect_environment as StripeKeyMode | null) ?? null;
  const requireLive = options?.requireLive ?? env === "live";
  return resolveStripeConnectContext(env, store.stripe_connect_account_id, { requireLive });
}

function extractStripeErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "";
}

type PayoutIntakeRow = {
  business_name: string;
  owner_full_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  iban: string;
  tax_id: string | null;
  business_address: string | null;
  notes: string | null;
};

function normalizeIban(iban: string): string {
  return iban.replace(/\s/g, "").toUpperCase();
}

function intakeTableMissingMessage(): string {
  return "A base de dados ainda não tem a tabela de dados bancários — peça na Lovable: Sync + Publish (migração store_payout_intake).";
}

async function loadStorePayoutIntake(
  service: SupabaseClient,
  storeId: string,
): Promise<PayoutIntakeRow | null> {
  const { data, error } = await service
    .from("store_payout_intake")
    .select(
      "business_name, owner_full_name, owner_email, owner_phone, iban, tax_id, business_address, notes",
    )
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    if (error.message?.includes("store_payout_intake") || error.code === "42P01") {
      throw new ConnectError(intakeTableMissingMessage(), 503, "intake_table_missing");
    }
    return null;
  }
  if (!data) return null;
  return data as PayoutIntakeRow;
}

async function upsertStorePayoutIntakeDirect(
  service: SupabaseClient,
  storeId: string,
  fields: {
    businessName: string;
    ownerFullName: string;
    ownerEmail: string;
    ownerPhone?: string;
    taxId?: string;
    iban: string;
    businessAddress?: string;
    notes?: string;
  },
): Promise<void> {
  const { error } = await service.from("store_payout_intake").upsert(
    {
      store_id: storeId,
      business_name: fields.businessName.trim(),
      owner_full_name: fields.ownerFullName.trim(),
      owner_email: fields.ownerEmail.trim(),
      owner_phone: fields.ownerPhone?.trim() || null,
      tax_id: fields.taxId?.trim() || null,
      iban: normalizeIban(fields.iban),
      business_address: fields.businessAddress?.trim() || null,
      notes: fields.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id" },
  );
  if (error) {
    if (error.message?.includes("store_payout_intake") || error.code === "42P01") {
      throw new ConnectError(intakeTableMissingMessage(), 503, "intake_table_missing");
    }
    throw new ConnectError(error.message || "Não foi possível guardar os dados.", 500, "intake_save_failed");
  }
}

async function assertAdminMaster(service: SupabaseClient, userId: string): Promise<void> {
  const { data } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin_master")
    .limit(1);
  if (!data?.length) {
    throw new ConnectError("Apenas a administração pode guardar estes dados.", 403, "forbidden");
  }
}

async function syncIntakeToStripeConnect(
  stripe: Stripe,
  accountId: string,
  intake: PayoutIntakeRow,
  storeName: string | null,
): Promise<{ bankSynced: boolean; profileSynced: boolean; message: string }> {
  // Express accounts: e-mail, company e business_type só na criação ou no formulário
  // de verificação — a plataforma não pode alterá-los depois via API.
  let profileSynced = false;
  try {
    await stripe.accounts.update(accountId, {
      business_profile: {
        name: intake.business_name || storeName || "Restaurante",
        ...(intake.business_address
          ? { support_address: { line1: intake.business_address, country: "ES" } }
          : {}),
      },
    });
    profileSynced = true;
  } catch (e) {
    console.warn("[connect] profile sync", e);
  }

  const iban = normalizeIban(intake.iban);
  let bankSynced = false;
  if (iban.length >= 15) {
    try {
      const existing = await stripe.accounts.listExternalAccounts(accountId, {
        object: "bank_account",
        limit: 10,
      });
      const last4 = iban.slice(-4);
      const already = existing.data.some(
        (ba) => ba.object === "bank_account" && (ba as Stripe.BankAccount).last4 === last4,
      );
      if (!already) {
        const isCompany = Boolean(intake.tax_id?.trim());
        await stripe.accounts.createExternalAccount(accountId, {
          external_account: {
            object: "bank_account",
            country: "ES",
            currency: "eur",
            account_number: iban,
            account_holder_name: intake.business_name,
            account_holder_type: isCompany ? "company" : "individual",
          },
        });
      }
      bankSynced = true;
    } catch (e) {
      console.warn("[connect] IBAN sync", e);
    }
  }

  let message: string;
  if (profileSynced && bankSynced) {
    message = "Dados guardados e enviados para a conta de recebimentos.";
  } else if (profileSynced) {
    message =
      "Dados guardados. Carregue em «Ligar conta do restaurante» para confirmar e-mail e IBAN no formulário de verificação.";
  } else {
    message =
      "Dados guardados. Use o Passo 2 abaixo para concluir a ligação da conta.";
  }

  return { bankSynced, profileSynced, message };
}

async function persistConnectAccountId(
  service: SupabaseClient,
  storeId: string,
  accountId: string,
  environment: StripeKeyMode,
): Promise<void> {
  const { error: updErr } = await service
    .from("stores")
    .update({
      stripe_connect_account_id: accountId,
      stripe_connect_environment: environment,
      stripe_connect_created_at: new Date().toISOString(),
      stripe_payout_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);

  if (updErr) {
    console.error("[connect] store update", updErr);
    throw new ConnectError(
      "Conta de recebimentos criada mas não foi possível guardar — actualize a base de dados.",
      500,
      "store_update_failed",
    );
  }
}

/** Substitui contas Express ou Custom incompletas (sem site, NIF, IBAN, e-mail, termos). */
async function shouldReplaceStripeAccount(
  stripe: Stripe,
  accountId: string,
): Promise<boolean> {
  try {
    const acct = await stripe.accounts.retrieve(accountId);
    return isStripeAccountCriticallyIncomplete(acct);
  } catch {
    return false;
  }
}

export async function ensureConnectAccount(
  ctx: StripeConnectContext,
  service: SupabaseClient,
  store: ConnectStoreRow,
  intake?: PayoutIntakeRow | null,
  requestIp?: string,
): Promise<{ accountId: string; environment: StripeKeyMode; accountType: "custom" | "express" }> {
  const payoutIntakeRaw = intake ?? (await loadStorePayoutIntake(service, store.id));
  const payoutIntake: CustomIntakeRow | null = payoutIntakeRaw
    ? intake?.accept_terms
      ? (intake as CustomIntakeRow)
      : enrichIntakeRow(payoutIntakeRaw, {
          business_website: payoutIntakeRaw.business_website ?? DEFAULT_BUSINESS_WEBSITE,
        })
    : null;
  const useCustom = ctx.environment === "live" && intakeComplete(payoutIntake);
  let accountId = store.stripe_connect_account_id;

  if (accountId && useCustom) {
    const replaceAccount = await shouldReplaceStripeAccount(ctx.stripe, accountId);
    if (replaceAccount) {
      accountId = null;
      await service
        .from("stores")
        .update({
          stripe_connect_account_id: null,
          stripe_charges_enabled: false,
          stripe_payouts_enabled: false,
          stripe_onboarding_completed: false,
          stripe_payout_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", store.id);
    }
  }

  if (accountId) {
    if (payoutIntake && useCustom) {
      try {
        await syncLiveCustomAccountFromIntake(
          ctx.stripe,
          accountId,
          payoutIntake,
          requestIp ?? "127.0.0.1",
        );
      } catch (e) {
        console.warn("[connect] custom full sync on existing account", e);
        throw e;
      }
    } else if (payoutIntake) {
      try {
        await syncIntakeToStripeConnect(ctx.stripe, accountId, payoutIntake, store.name);
      } catch (e) {
        console.warn("[connect] intake sync on existing account", e);
      }
    }
    const acct = await ctx.stripe.accounts.retrieve(accountId);
    return {
      accountId,
      environment: (store.stripe_connect_environment as StripeKeyMode) ?? ctx.environment,
      accountType: acct.type === "custom" ? "custom" : "express",
    };
  }

  try {
    if (useCustom && payoutIntake) {
      const customId = await createLiveCustomAccountFromIntake(
        ctx.stripe,
        store,
        payoutIntake,
        requestIp ?? "127.0.0.1",
      );
      await persistConnectAccountId(service, store.id, customId, ctx.environment);
      return { accountId: customId, environment: ctx.environment, accountType: "custom" };
    }

    const account = await ctx.stripe.accounts.create({
      type: "express",
      country: "ES",
      email: payoutIntake?.owner_email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: payoutIntake?.business_name || store.name || "Restaurante",
        ...(payoutIntake?.business_address
          ? { support_address: { line1: payoutIntake.business_address, country: "ES" } }
          : {}),
      },
      metadata: {
        store_id: store.id,
        platform: "kebabturco",
        environment: ctx.environment,
        connect_role: "restaurant",
      },
      settings: {
        payouts: { schedule: { interval: "weekly", weekly_anchor: "monday" } },
      },
    });

    await persistConnectAccountId(service, store.id, account.id, ctx.environment);
    return { accountId: account.id, environment: ctx.environment, accountType: "express" };
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
      account_onboarding: {
        enabled: true,
        // IBAN já recolhido no formulário Kebab — o passo embutido foca documentos/identidade.
        features: { external_account_collection: false },
      },
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
  const mode = typeof body.mode === "string" ? body.mode : "embedded_onboarding";
  const publicModes = new Set([
    "public_link_info",
    "public_submit_intake",
    "public_mark_verification",
    "public_onboarding_session",
  ]);

  if (
    !publicModes.has(mode) &&
    !getStripeSecretKey() &&
    !getStripeSecretKeyTest()
  ) {
    return json(
      {
        error: "Recebimentos indisponíveis — configuração do servidor incompleta.",
        code: "stripe_secret_missing",
      },
      503,
    );
  }
  const storeId = typeof body.storeId === "string" ? body.storeId.trim() : "";
  const requestIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "127.0.0.1";

  async function resolvePublicLink(token: string) {
    const publicService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: link } = await publicService
      .from("store_onboarding_links")
      .select("store_id, environment, expires_at, revoked")
      .eq("token", token)
      .maybeSingle();

    if (!link || link.revoked || new Date(link.expires_at as string).getTime() < Date.now()) {
      return { error: json({ error: "Este enlace ha caducado o ya no es válido. Pide uno nuevo." }, 410) };
    }

    const { data: linkStore } = await publicService
      .from("stores")
      .select("id, name, tenant_id, stripe_connect_account_id, stripe_connect_environment")
      .eq("id", link.store_id)
      .maybeSingle();

    if (!linkStore) {
      return { error: json({ error: "Restaurante no encontrado." }, 404) };
    }

    return { publicService, linkStore: linkStore as ConnectStoreRow };
  }

  // Dono do restaurante preenche formulário Kebab (sem marca Stripe) via link WhatsApp.
  if (mode === "public_submit_intake") {
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) return json({ error: "Enlace no válido." }, 400);

    const resolved = await resolvePublicLink(token);
    if ("error" in resolved && resolved.error) return resolved.error;
    const { publicService, linkStore } = resolved;

    const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
    const ownerFullName = typeof body.ownerFullName === "string" ? body.ownerFullName.trim() : "";
    const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim() : "";
    const iban = typeof body.iban === "string" ? body.iban.trim() : "";
    const ownerPhone = typeof body.ownerPhone === "string" ? body.ownerPhone.trim() : "";
    const taxId = typeof body.taxId === "string" ? body.taxId.trim() : "";
    const businessAddress = typeof body.businessAddress === "string" ? body.businessAddress.trim() : "";
    const ownerDob = typeof body.ownerDob === "string" ? body.ownerDob.trim() : "";
    const businessWebsite =
      typeof body.businessWebsite === "string" && body.businessWebsite.trim()
        ? body.businessWebsite.trim()
        : DEFAULT_BUSINESS_WEBSITE;
    const businessMcc = typeof body.businessMcc === "string" ? body.businessMcc.trim() : "5814";
    const businessType =
      body.businessType === "individual" ? "individual" : ("company" as const);
    const acceptTerms = body.acceptTerms === true || body.acceptTerms === "true";
    const representativeId =
      typeof body.representativeId === "string" ? body.representativeId.trim() : "";

    if (businessName.length < 2) return json({ error: "El nombre del negocio es obligatorio." }, 400);
    if (ownerFullName.length < 2) return json({ error: "El nombre del titular es obligatorio." }, 400);
    if (!ownerEmail.includes("@")) return json({ error: "El correo electrónico es obligatorio." }, 400);
    if (ownerPhone.length < 6) return json({ error: "El teléfono es obligatorio." }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ownerDob)) {
      return json({ error: "La fecha de nacimiento es obligatoria (AAAA-MM-DD)." }, 400);
    }
    if (taxId.length < 2) return json({ error: "El NIF / CIF es obligatorio." }, 400);
    if (businessAddress.length < 5) return json({ error: "La dirección del negocio es obligatoria." }, 400);
    if (normalizeIban(iban).length < 15) return json({ error: "IBAN no válido." }, 400);
    if (!acceptTerms) {
      return json({ error: "Debes aceptar los términos del servicio de pagos." }, 400);
    }

    const priorIntake = await loadStorePayoutIntake(publicService, linkStore.id);
    const linkSubmittedAt = new Date().toISOString();
    const intakeNotes = mergeIntakeNotes(priorIntake?.notes, {
      ownerDob,
      businessMcc,
      businessType,
      representativeId: representativeId || undefined,
      linkAt: linkSubmittedAt,
    });

    await upsertStorePayoutIntakeDirect(publicService, linkStore.id, {
      businessName,
      ownerFullName,
      ownerEmail,
      ownerPhone,
      taxId,
      iban,
      businessAddress,
      notes: intakeNotes,
    });

    await publicService
      .from("store_payout_intake")
      .update({
        whatsapp_data_at: linkSubmittedAt,
        updated_at: linkSubmittedAt,
      })
      .eq("store_id", linkStore.id);

    const intake = enrichIntakeRow((await loadStorePayoutIntake(publicService, linkStore.id))!, {
      business_website: businessWebsite,
      owner_dob: ownerDob,
      business_mcc: businessMcc,
      business_type: businessType,
      representative_id: representativeId || null,
      accept_terms: acceptTerms,
    });
    intake.business_address = businessAddress;

    const linkCtx = await loadConnectContext(linkStore, { requireLive: true });
    let ensured: Awaited<ReturnType<typeof ensureConnectAccount>>;
    try {
      ensured = await ensureConnectAccount(
        linkCtx,
        publicService,
        linkStore,
        intake,
        requestIp,
      );
    } catch (e) {
      const stripeMsg = extractStripeErrorMessage(e);
      console.error("[connect] public_submit_intake ensure account", e);
      return json(
        {
          error: stripeMsg
            ? `No se pudo registrar en Stripe: ${stripeMsg}`
            : "No se pudo registrar en Stripe. Contacte administración.",
          code: "stripe_account_create_failed",
        },
        502,
      );
    }
    const status = await syncConnectAccountById(linkCtx.stripe, publicService, ensured.accountId);
    const acct = await linkCtx.stripe.accounts.retrieve(ensured.accountId);
    const requirementsDue = [
      ...(acct.requirements?.currently_due ?? []),
      ...(acct.requirements?.past_due ?? []),
    ];

    // Passo 2 obrigatório: componente Stripe recolhe documentos de identidade e o que faltar.
    const clientSecret = await createEmbeddedAccountSession(
      linkCtx.stripe,
      ensured.accountId,
      "embedded_onboarding",
    );

    return json({
      submitted: true,
      needsVerification: true,
      accountId: ensured.accountId,
      connectEnvironment: ensured.environment,
      requirementsDue,
      message:
        "Datos enviados. En el siguiente paso confirme su identidad (documento) si la ley lo exige.",
      clientSecret,
      ...statusPayload(status, ensured.environment),
    });
  }

  // Dono conclui passo 2 (documentos) no link público.
  if (mode === "public_mark_verification") {
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) return json({ error: "Enlace no válido." }, 400);

    const resolved = await resolvePublicLink(token);
    if ("error" in resolved && resolved.error) return resolved.error;
    const { publicService, linkStore } = resolved;

    const verifiedAt = new Date().toISOString();
    const intakeRow = await loadStorePayoutIntake(publicService, linkStore.id);
    const mergedNotes = mergeIntakeNotes(intakeRow?.notes, { verifyAt: verifiedAt });

    await publicService
      .from("store_payout_intake")
      .update({
        notes: mergedNotes ?? null,
        whatsapp_verified_at: verifiedAt,
        updated_at: verifiedAt,
      })
      .eq("store_id", linkStore.id);

    let status: ConnectAccountStatus | null = null;
    let connectEnvironment: StripeKeyMode = "live";
    if (linkStore.stripe_connect_account_id) {
      const linkCtx = await loadConnectContext(linkStore);
      connectEnvironment = linkCtx.environment;
      status = await syncConnectAccountById(
        linkCtx.stripe,
        publicService,
        linkStore.stripe_connect_account_id,
      );
    }

    return json({
      verified: true,
      verifiedAt,
      message: "Verificación registrada — la administración puede seguir el estado en Recebimentos.",
      ...(status ? statusPayload(status, connectEnvironment) : {}),
    });
  }

  if (mode === "public_link_info") {
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) return json({ error: "Enlace no válido." }, 400);
    const resolved = await resolvePublicLink(token);
    if ("error" in resolved && resolved.error) return resolved.error;
    const { publicService, linkStore } = resolved;
    let intake: PayoutIntakeRow | null = null;
    try {
      intake = await loadStorePayoutIntake(publicService, linkStore.id);
    } catch {
      intake = null;
    }
    const meta = intake ? parseIntakeNotes(intake.notes) : null;
    return json({
      valid: true,
      storeName: linkStore.name,
      prefill: intake
        ? {
            businessName: intake.business_name,
            ownerFullName: intake.owner_full_name,
            ownerEmail: intake.owner_email,
            ownerPhone: intake.owner_phone,
            taxId: intake.tax_id,
            iban: intake.iban,
            businessAddress: intake.business_address,
            ownerDob: meta?.ownerDob ?? null,
            businessMcc: meta?.businessMcc ?? "5814",
            businessType: meta?.businessType ?? "company",
            representativeId: meta?.representativeId ?? null,
          }
        : null,
    });
  }

  // Public, no-login onboarding via a shareable token (e.g. sent by WhatsApp).
  if (mode === "public_onboarding_session") {
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return json({ error: "Link inválido." }, 400);
    }
    const resolved = await resolvePublicLink(token);
    if ("error" in resolved && resolved.error) return resolved.error;
    const { publicService, linkStore } = resolved;

    const linkCtx = await loadConnectContext(linkStore);
    const linkIntake = await loadStorePayoutIntake(publicService, linkStore.id);
    const linkEnsured = await ensureConnectAccount(
      linkCtx,
      publicService,
      linkStore as ConnectStoreRow,
      linkIntake,
      requestIp,
    );
    const { accountId: linkAccountId, environment: linkEnv, accountType: linkAccountType } = linkEnsured;

    if (linkAccountType === "custom") {
      const status = await syncConnectAccountById(linkCtx.stripe, publicService, linkAccountId);
      return json({
        skipEmbedded: true,
        accountId: linkAccountId,
        accountType: "custom",
        connectEnvironment: linkEnv,
        message: "Conta Connect já registada — não precisa de novo registo.",
        ...statusPayload(status, linkEnv),
      });
    }

    const clientSecret = await createEmbeddedAccountSession(
      linkCtx.stripe,
      linkAccountId,
      "embedded_onboarding",
    );
    return json({ clientSecret, accountId: linkAccountId, connectEnvironment: linkEnv });
  }

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

  if (mode === "save_and_sync_intake") {
    await assertAdminMaster(service, userId);

    const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
    const ownerFullName = typeof body.ownerFullName === "string" ? body.ownerFullName.trim() : "";
    const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim() : "";
    const iban = typeof body.iban === "string" ? body.iban.trim() : "";
    const ownerPhone = typeof body.ownerPhone === "string" ? body.ownerPhone.trim() : "";
    const taxId = typeof body.taxId === "string" ? body.taxId.trim() : "";
    const businessAddress = typeof body.businessAddress === "string" ? body.businessAddress.trim() : "";
    const businessWebsite =
      typeof body.businessWebsite === "string" && body.businessWebsite.trim()
        ? body.businessWebsite.trim()
        : DEFAULT_BUSINESS_WEBSITE;
    if (businessName.length < 2) {
      throw new ConnectError("Nome do negócio é obrigatório.", 400, "validation");
    }
    if (ownerFullName.length < 2) {
      throw new ConnectError("Nome do titular é obrigatório.", 400, "validation");
    }
    if (!ownerEmail.includes("@")) {
      throw new ConnectError("E-mail do dono é obrigatório.", 400, "validation");
    }
    if (ownerPhone.length < 6) {
      throw new ConnectError("Telefone do dono é obrigatório para activar recebimentos.", 400, "validation");
    }
    if (taxId.length < 2) {
      throw new ConnectError("NIF / CIF da empresa é obrigatório para activar recebimentos.", 400, "validation");
    }
    if (normalizeIban(iban).length < 15) {
      throw new ConnectError("IBAN inválido.", 400, "validation");
    }
    if (!/^https?:\/\//i.test(businessWebsite)) {
      throw new ConnectError("Site do negócio inválido — use https://...", 400, "validation");
    }

    const ownerDob = typeof body.ownerDob === "string" ? body.ownerDob.trim() : "";
    const businessMcc = typeof body.businessMcc === "string" ? body.businessMcc.trim() : "5814";
    const businessType =
      body.businessType === "individual" ? "individual" : ("company" as const);
    const representativeId =
      typeof body.representativeId === "string" ? body.representativeId.trim() : "";

    if (ownerDob && !/^\d{4}-\d{2}-\d{2}$/.test(ownerDob)) {
      throw new ConnectError("Data de nascimento inválida (AAAA-MM-DD).", 400, "validation");
    }
    if (!businessAddress.trim()) {
      throw new ConnectError("Morada do negócio é obrigatória.", 400, "validation");
    }

    await upsertStorePayoutIntakeDirect(service, storeId, {
      businessName,
      ownerFullName,
      ownerEmail,
      ownerPhone,
      taxId,
      iban,
      businessAddress,
      notes: buildIntakeNotes({
        ownerDob: ownerDob || undefined,
        businessMcc,
        businessType,
        representativeId: representativeId || undefined,
      }),
    });

    const intakeRow2 = await loadStorePayoutIntake(service, storeId);
    if (!intakeRow2) {
      return json({
        saved: true,
        synced: false,
        message: "Dados guardados. Recarregue a página e tente de novo.",
      });
    }
    const intake = enrichIntakeRow(intakeRow2, {
      business_website: businessWebsite,
      owner_dob: ownerDob || parseIntakeNotes(intakeRow2.notes).ownerDob,
      business_mcc: businessMcc,
      business_type: businessType,
      representative_id: representativeId || null,
      accept_terms: true,
    });

    // Stripe sync is best-effort — dados do restaurante ficam sempre guardados.
    try {
      const needsLiveReset =
        store.stripe_connect_environment === "test" ||
        Boolean((store as { stripe_connect_test_simulated?: boolean }).stripe_connect_test_simulated) ||
        !store.stripe_connect_account_id ||
        store.stripe_connect_account_id.startsWith("simulated-");

      let workingStore = store;
      if (needsLiveReset) {
        const liveKey = getStripeSecretKey();
        if (!liveKey) {
          return json({
            saved: true,
            synced: false,
            message: "Dados guardados. Falta activar as chaves de produção no servidor.",
          });
        }
        const { error: liveUpdErr } = await service
          .from("stores")
          .update({
            stripe_connect_account_id: null,
            stripe_connect_environment: "live",
            stripe_connect_test_simulated: false,
            stripe_charges_enabled: false,
            stripe_payouts_enabled: false,
            stripe_onboarding_completed: false,
            stripe_payout_status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", store.id);
        if (liveUpdErr) {
          return json({
            saved: true,
            synced: false,
            message: "Dados guardados. Não foi possível preparar modo produção — tente Passo 2.",
          });
        }
        workingStore = {
          ...store,
          stripe_connect_account_id: null,
          stripe_connect_environment: "live",
        };
      }

      const ctx = await loadConnectContext(workingStore, { requireLive: true });
      const ensured = await ensureConnectAccount(ctx, service, workingStore, intake, requestIp);
      const status = await syncConnectAccountById(ctx.stripe, service, ensured.accountId);

      let message: string;
      let bankSynced = false;
      if (ensured.accountType === "custom") {
        message =
          status.chargesEnabled && status.onboardingCompleted
            ? "Dados guardados — restaurante pronto para receber pagamentos."
            : "Dados guardados — restaurante registado na plataforma (sem ecrã de novo registo).";
        bankSynced = true;
      } else {
        const syncResult = await syncIntakeToStripeConnect(
          ctx.stripe,
          ensured.accountId,
          intake,
          store.name,
        );
        message = syncResult.message;
        bankSynced = syncResult.bankSynced;
      }

      return json({
        saved: true,
        synced: true,
        accountId: ensured.accountId,
        accountType: ensured.accountType,
        connectEnvironment: ensured.environment,
        bankSynced,
        message,
        handlerVersion: CONNECT_HANDLER_VERSION,
        ...statusPayload(status, ensured.environment),
        ...connectMeta(ctx),
      });
    } catch (e) {
      console.error("[connect] save_and_sync_intake stripe", e);
      const stripeHint = extractStripeErrorMessage(e);
      if (e instanceof PlatformPendingError) {
        return json({
          saved: true,
          synced: false,
          message:
            "Dados guardados. A Stripe ainda não aprovou a plataforma para contas reais — complete o perfil Connect no painel Stripe.",
          stripeError: stripeHint || e.message,
          productionBlocked: true,
          handlerVersion: CONNECT_HANDLER_VERSION,
          platform: platformStatusPayload(e.platform, "live"),
        });
      }
      const friendly = stripeHint.includes("not authorized to edit")
        ? "Dados guardados — a conta antiga será substituída na próxima tentativa."
        : stripeHint
          ? `Dados guardados. Erro ao enviar para Stripe: ${stripeHint}`
          : "Dados guardados mas não foi possível criar a conta na Stripe — tente «Actualizar» ou guarde de novo.";
      return json({
        saved: true,
        synced: false,
        message: friendly,
        stripeError: stripeHint || undefined,
        handlerVersion: CONNECT_HANDLER_VERSION,
      });
    }
  }

  if (mode === "resync_intake_to_stripe") {
    await assertAdminMaster(service, userId);

    const intakeRow = await loadStorePayoutIntake(service, storeId);
    if (!intakeRow) {
      throw new ConnectError(
        "Não há dados do restaurante guardados — preencha o formulário primeiro.",
        400,
        "intake_missing",
      );
    }

    const intake = enrichIntakeRow(intakeRow, {
      business_website: DEFAULT_BUSINESS_WEBSITE,
      accept_terms: true,
    });

    const needsLiveReset =
      store.stripe_connect_environment === "test" ||
      Boolean((store as { stripe_connect_test_simulated?: boolean }).stripe_connect_test_simulated) ||
      !store.stripe_connect_account_id ||
      store.stripe_connect_account_id.startsWith("simulated-");

    let workingStore = store;
    if (needsLiveReset) {
      const liveKey = getStripeSecretKey();
      if (!liveKey || stripeKeyMode(liveKey) !== "live") {
        throw new ConnectError(
          "Falta a chave de produção no servidor.",
          503,
          "live_key_missing",
        );
      }
      const { error: liveUpdErr } = await service
        .from("stores")
        .update({
          stripe_connect_account_id: null,
          stripe_connect_environment: "live",
          stripe_connect_test_simulated: false,
          stripe_charges_enabled: false,
          stripe_payouts_enabled: false,
          stripe_onboarding_completed: false,
          stripe_payout_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", store.id);
      if (liveUpdErr) {
        throw new ConnectError("Não foi possível preparar modo produção.", 500, "store_update_failed");
      }
      workingStore = {
        ...store,
        stripe_connect_account_id: null,
        stripe_connect_environment: "live",
      };
    }

    const ctx = await loadConnectContext(workingStore, { requireLive: true });
    const ensured = await ensureConnectAccount(ctx, service, workingStore, intake, requestIp);
    const status = await syncConnectAccountById(ctx.stripe, service, ensured.accountId);

    return json({
      synced: true,
      accountId: ensured.accountId,
      accountType: ensured.accountType,
      connectEnvironment: ensured.environment,
      message:
        ensured.accountType === "custom"
          ? "Restaurante enviado para a Stripe em produção."
          : "Conta criada na Stripe — confirme verificação se for pedida.",
      handlerVersion: CONNECT_HANDLER_VERSION,
      ...statusPayload(status, ensured.environment),
      ...connectMeta(ctx),
    });
  }

  if (mode === "activate_live") {
    // Switching a store to real (live) receivables is a platform-admin action.
    const { data: adminRoles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin_master");
    if (!adminRoles || adminRoles.length === 0) {
      throw new ConnectError(
        "Apenas a administração pode activar recebimentos oficiais.",
        403,
        "forbidden",
      );
    }

    // Never reset a store that is already on a real (non-simulated) live account.
    if (
      store.stripe_connect_environment === "live" &&
      store.stripe_connect_account_id &&
      !store.stripe_connect_account_id.startsWith("simulated-")
    ) {
      return json({ activated: true, alreadyLive: true, connectEnvironment: "live" });
    }

    const liveKey = getStripeSecretKey();
    if (!liveKey || stripeKeyMode(liveKey) !== "live") {
      throw new ConnectError(
        "Falta a chave de produção no servidor. Publique as chaves live na Lovable e tente de novo.",
        503,
        "live_key_missing",
      );
    }

    const liveStripe = new Stripe(liveKey, { apiVersion: "2023-10-16" });
    let livePlatform;
    try {
      livePlatform = await inspectPlatformConnectStatus(liveStripe, "live", { probe: true });
    } catch (e) {
      if (isPlatformProfileBlockedError(e)) {
        throw new ConnectError(
          "A Stripe ainda não aprovou a produção da plataforma.",
          503,
          "live_not_allowed",
        );
      }
      throw e;
    }
    if (!livePlatform.connectLiveAllowed) {
      throw new ConnectError(
        "A Stripe ainda não aprovou a produção da plataforma.",
        503,
        "live_not_allowed",
      );
    }

    const { error: updErr } = await service
      .from("stores")
      .update({
        stripe_connect_account_id: null,
        stripe_connect_environment: "live",
        stripe_connect_test_simulated: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        stripe_onboarding_completed: false,
        stripe_payout_status: "pending",
        stripe_business_name: null,
        stripe_iban_last4: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id);
    if (updErr) {
      console.error("[connect] activate_live store update", updErr);
      throw new ConnectError("Não foi possível activar recebimentos oficiais.", 500, "store_update_failed");
    }

    return json({
      activated: true,
      connectEnvironment: "live",
      ...platformStatusPayload(livePlatform, "live"),
    });
  }

  if (mode === "create_onboarding_link") {
    const { data: adminRoles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin_master");
    if (!adminRoles || adminRoles.length === 0) {
      throw new ConnectError(
        "Apenas a administração pode gerar links de recebimentos.",
        403,
        "forbidden",
      );
    }

    const alreadyRealLive =
      store.stripe_connect_environment === "live" &&
      Boolean(store.stripe_connect_account_id) &&
      !store.stripe_connect_account_id!.startsWith("simulated-");

    if (!alreadyRealLive) {
      const liveKey = getStripeSecretKey();
      if (!liveKey || stripeKeyMode(liveKey) !== "live") {
        throw new ConnectError(
          "Falta a chave de produção no servidor. Publique as chaves live na Lovable e tente de novo.",
          503,
          "live_key_missing",
        );
      }
      const liveStripe = new Stripe(liveKey, { apiVersion: "2023-10-16" });
      try {
        const platform = await inspectPlatformConnectStatus(liveStripe, "live", { probe: true });
        if (!platform.connectLiveAllowed) {
          throw new ConnectError("A Stripe ainda não aprovou a produção da plataforma.", 503, "live_not_allowed");
        }
      } catch (e) {
        if (e instanceof ConnectError) throw e;
        if (isPlatformProfileBlockedError(e)) {
          throw new ConnectError("A Stripe ainda não aprovou a produção da plataforma.", 503, "live_not_allowed");
        }
        throw e;
      }

      await service
        .from("stores")
        .update({
          stripe_connect_account_id: null,
          stripe_connect_environment: "live",
          stripe_connect_test_simulated: false,
          stripe_charges_enabled: false,
          stripe_payouts_enabled: false,
          stripe_onboarding_completed: false,
          stripe_payout_status: "pending",
          stripe_business_name: null,
          stripe_iban_last4: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", store.id);
    }

    const tokenBytes = new Uint8Array(12);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: insErr } = await service.from("store_onboarding_links").insert({
      token,
      store_id: store.id,
      environment: "live",
      created_by: userId,
      expires_at: expiresAt,
      revoked: false,
    });
    if (insErr) {
      console.error("[connect] create_onboarding_link insert", insErr);
      throw new ConnectError("Não foi possível gerar o link.", 500, "link_create_failed");
    }
    return json({ token, expiresAt, path: `/recibos/registro-datos/${token}` });
  }

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

  const payoutIntake = await loadStorePayoutIntake(service, store.id);
  if (mode === "embedded_onboarding") {
    if (
      !payoutIntake?.owner_email?.trim() ||
      !payoutIntake?.iban?.trim() ||
      !payoutIntake?.business_name?.trim()
    ) {
      throw new ConnectError(
        "Preencha e guarde primeiro os dados do restaurante (nome, e-mail do dono e IBAN) no painel de administração.",
        400,
        "intake_required",
      );
    }
  }

  const ensured = await ensureConnectAccount(ctx, service, store, payoutIntake, requestIp);
  const { accountId, environment, accountType } = ensured;
  const stripe = ctx.stripe;
  const meta = connectMeta(ctx);

  if (mode === "embedded_onboarding" && accountType === "custom") {
    const status = await syncConnectAccountById(stripe, service, accountId);
    return json({
      skipEmbedded: true,
      accountId,
      accountType: "custom",
      message:
        "Conta Connect do restaurante já registada pela plataforma — não precisa de formulário externo.",
      ...statusPayload(status, environment),
      ...meta,
    });
  }

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
