import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import {
  getStripeSecretKey,
  getStripeSecretKeyTest,
  pickStripeSecretForEnvironment,
  stripeKeyMode,
  type StripeKeyMode,
} from "./stripeEnv.ts";

export type StripePlatformStatus = {
  keyMode: StripeKeyMode;
  connectLiveAllowed: boolean;
  platformProfileComplete: boolean;
  pendingVerification: boolean;
  productionBlocked: boolean;
  testKeysConfigured: boolean;
  message: string | null;
  adminMessage: string | null;
};

export function isPlatformProfileBlockedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("complete your platform profile") ||
    lower.includes("platform profile") ||
    lower.includes("must complete your platform")
  );
}

/** Stripe rejects Connect APIs when the target id is the platform account itself. */
export function isStripeOwnAccountError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("own account") ||
    lower.includes("própria conta") ||
    lower.includes("connected accounts") ||
    lower.includes("contas conectadas")
  );
}

export async function resolvePlatformAccountId(stripe: Stripe): Promise<string> {
  const platform = await stripe.accounts.retrieve();
  return platform.id;
}

export async function isPlatformConnectAccountId(
  stripe: Stripe,
  accountId: string | null | undefined,
): Promise<boolean> {
  if (!accountId || accountId.startsWith("simulated-")) return false;
  try {
    const platformId = await resolvePlatformAccountId(stripe);
    return accountId === platformId;
  } catch {
    return false;
  }
}

/** Verifica se contas Connect live podem ser criadas (sem guardar conta). */
async function probeLiveConnectAllowed(stripe: Stripe): Promise<boolean> {
  try {
    const probe = await stripe.accounts.create({
      type: "express",
      country: "ES",
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { platform_probe: "true", delete_me: "true" },
      business_profile: { name: "Probe" },
    });
    try {
      await stripe.accounts.del(probe.id);
    } catch {
      /* best effort cleanup */
    }
    return true;
  } catch (e) {
    if (isPlatformProfileBlockedError(e)) return false;
    throw e;
  }
}

export async function inspectPlatformConnectStatus(
  stripe: Stripe,
  keyMode: StripeKeyMode,
  options?: { probe?: boolean },
): Promise<StripePlatformStatus> {
  const testKeysConfigured = Boolean(getStripeSecretKeyTest());

  if (keyMode === "test") {
    return {
      keyMode: "test",
      connectLiveAllowed: false,
      platformProfileComplete: true,
      pendingVerification: false,
      productionBlocked: false,
      testKeysConfigured: true,
      message: null,
      adminMessage: "Modo teste, pagamentos simulados, sem dinheiro real.",
    };
  }

  let pendingVerification = false;
  try {
    const platform = await stripe.accounts.retrieve();
    const pending = platform.requirements?.pending_verification ?? [];
    if (pending.length > 0) pendingVerification = true;
  } catch {
    /* optional */
  }

  if (!options?.probe) {
    return {
      keyMode: "live",
      connectLiveAllowed: true,
      platformProfileComplete: !pendingVerification,
      pendingVerification,
      productionBlocked: false,
      testKeysConfigured,
      message: null,
      adminMessage: pendingVerification
        ? "Plataforma pode estar pendente de verificação, confirme no Estado do sistema."
        : null,
    };
  }

  const connectLiveAllowed = await probeLiveConnectAllowed(stripe);
  if (!connectLiveAllowed) pendingVerification = true;

  const productionBlocked = !connectLiveAllowed;
  const adminMessage = productionBlocked
    ? "Plataforma pendente de verificação, pagamentos reais e contas live bloqueados até a Stripe aprovar o perfil da plataforma."
    : null;

  return {
    keyMode: "live",
    connectLiveAllowed,
    platformProfileComplete: connectLiveAllowed,
    pendingVerification,
    productionBlocked,
    testKeysConfigured,
    message: productionBlocked ? adminMessage : null,
    adminMessage,
  };
}

export async function buildLivePlatformStatus(): Promise<StripePlatformStatus | null> {
  const liveKey = getStripeSecretKey();
  if (!liveKey || stripeKeyMode(liveKey) !== "live") return null;
  const stripe = new Stripe(liveKey, { apiVersion: "2023-10-16" });
  return inspectPlatformConnectStatus(stripe, "live", { probe: true });
}

export type StripeConnectContext = {
  stripe: Stripe;
  environment: StripeKeyMode;
  platform: StripePlatformStatus;
};

export async function resolveStripeConnectContext(
  storeEnvironment: StripeKeyMode | null,
  existingAccountId: string | null,
  options?: { requireLive?: boolean },
): Promise<StripeConnectContext> {
  const testKey = getStripeSecretKeyTest();
  const liveKey = getStripeSecretKey();

  // Conta já existente, usar o ambiente guardado
  if (existingAccountId && storeEnvironment) {
    const secret = pickStripeSecretForEnvironment(storeEnvironment);
    if (!secret) {
      throw new Error(
        storeEnvironment === "test"
          ? "Chave secreta de teste em falta no servidor."
          : "Chave secreta live em falta no servidor.",
      );
    }
    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });
    const platform = await inspectPlatformConnectStatus(stripe, storeEnvironment, { probe: false });
    return { stripe, environment: storeEnvironment, platform };
  }

  // Nova conta, tentar live com verificação real
  if (liveKey && stripeKeyMode(liveKey) === "live") {
    const liveStripe = new Stripe(liveKey, { apiVersion: "2023-10-16" });
    const livePlatform = await inspectPlatformConnectStatus(liveStripe, "live", { probe: true });
    if (livePlatform.connectLiveAllowed) {
      return { stripe: liveStripe, environment: "live", platform: livePlatform };
    }

    if (options?.requireLive) {
      throw new PlatformPendingError(livePlatform);
    }

    if (testKey) {
      const testStripe = new Stripe(testKey, { apiVersion: "2023-10-16" });
      const testPlatform = await inspectPlatformConnectStatus(testStripe, "test");
      return {
        stripe: testStripe,
        environment: "test",
        platform: {
          ...testPlatform,
          productionBlocked: true,
          pendingVerification: true,
          connectLiveAllowed: false,
          adminMessage:
            "Plataforma pendente de verificação, a usar modo TESTE. Pagamentos reais bloqueados até aprovação.",
          message:
            "Modo teste activo. Produção bloqueada até a Stripe aprovar o perfil da plataforma.",
        },
      };
    }

    throw new PlatformPendingError(livePlatform);
  }

  // Só teste configurado
  if (testKey) {
    const testStripe = new Stripe(testKey, { apiVersion: "2023-10-16" });
    const testPlatform = await inspectPlatformConnectStatus(testStripe, "test");
    return { stripe: testStripe, environment: "test", platform: testPlatform };
  }

  throw new Error("Nenhuma chave Stripe configurada no servidor.");
}

export class PlatformPendingError extends Error {
  platform: StripePlatformStatus;
  code = "platform_pending_verification";
  constructor(platform: StripePlatformStatus) {
    super(
      platform.adminMessage ??
        "Plataforma pendente de verificação, configure chaves de teste para experimentar o fluxo.",
    );
    this.platform = platform;
  }
}

export function platformStatusPayload(platform: StripePlatformStatus, environment: StripeKeyMode) {
  return {
    keyMode: platform.keyMode,
    connectEnvironment: environment,
    connectLiveAllowed: platform.connectLiveAllowed,
    platformProfileComplete: platform.platformProfileComplete,
    pendingVerification: platform.pendingVerification,
    productionBlocked: platform.productionBlocked,
    testKeysConfigured: platform.testKeysConfigured,
    message: platform.message,
    adminMessage: platform.adminMessage,
    canUseEmbeddedTest: platform.testKeysConfigured || environment === "test",
    canUseEmbeddedLive: platform.connectLiveAllowed && environment === "live",
  };
}
