import type { StoreFinancialProfile, StripePlatformStatus } from "@/services/orderService";
import { hasStripePublishableKey } from "@/lib/stripePublishableKey";

/** Estado Stripe inferido só com dados da loja, sem chamar o servidor. */
export function inferStripePlatformStatus(
  profile: StoreFinancialProfile | null | undefined,
): StripePlatformStatus {
  const testMode =
    profile?.stripe_connect_environment === "test" || Boolean(profile?.stripe_connect_test_simulated);
  const liveMode = profile?.stripe_connect_environment === "live";
  const hasTestPk = hasStripePublishableKey("test");
  const ready = Boolean(profile?.stripe_charges_enabled && profile?.stripe_onboarding_completed);

  if (liveMode && ready) {
    return {
      keyMode: "live",
      connectEnvironment: "live",
      connectLiveAllowed: true,
      platformProfileComplete: true,
      pendingVerification: false,
      productionBlocked: false,
      testKeysConfigured: hasTestPk,
      message: null,
      adminMessage: null,
      canUseEmbeddedTest: hasTestPk,
      canUseEmbeddedLive: true,
      hasConnectAccount: Boolean(profile?.stripe_connect_account_id),
    };
  }

  if (testMode && ready) {
    return {
      keyMode: "test",
      connectEnvironment: "test",
      connectLiveAllowed: false,
      platformProfileComplete: true,
      pendingVerification: false,
      productionBlocked: false,
      testKeysConfigured: hasTestPk,
      message: null,
      adminMessage: "Modo teste activo.",
      canUseEmbeddedTest: false,
      canUseEmbeddedLive: false,
    };
  }

  return {
    keyMode: "live",
    connectEnvironment: "live",
    connectLiveAllowed: false,
    platformProfileComplete: false,
    pendingVerification: true,
    productionBlocked: true,
    testKeysConfigured: hasTestPk,
    message: "Produção bloqueada até aprovação da Stripe.",
    adminMessage: "Produção bloqueada até aprovação da Stripe, use modo teste.",
    canUseEmbeddedTest: hasTestPk,
    canUseEmbeddedLive: false,
  };
}
