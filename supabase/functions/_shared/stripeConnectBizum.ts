import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

export type BizumEnableResult = {
  enabled: boolean;
  configId: string | null;
  message: string;
};

const BIZUM_DISPLAY = {
  bizum: {
    display_preference: {
      preference: "on" as const,
    },
  },
};

async function pickConfigurationId(
  stripe: Stripe,
  accountId: string,
): Promise<string | null> {
  const listed = await stripe.paymentMethodConfigurations.list(
    { limit: 20 },
    { stripeAccount: accountId },
  );
  const preferred =
    listed.data.find((row) => row.active) ??
    listed.data.find((row) => row.is_default) ??
    listed.data[0];
  return preferred?.id ?? null;
}

/** Activa Bizum na conta Connect do restaurante (Espanha, EUR) via API Stripe. */
export async function ensureBizumEnabledOnConnectAccount(
  stripe: Stripe,
  accountId: string,
): Promise<BizumEnableResult> {
  if (!accountId || accountId.startsWith("simulated-")) {
    return {
      enabled: false,
      configId: null,
      message: "Conta simulada — Bizum não aplicável.",
    };
  }

  try {
    const existingId = await pickConfigurationId(stripe, accountId);

    if (existingId) {
      const updated = await stripe.paymentMethodConfigurations.update(
        existingId,
        BIZUM_DISPLAY,
        { stripeAccount: accountId },
      );
      const preference = updated.bizum?.display_preference?.preference;
      return {
        enabled: preference === "on",
        configId: updated.id,
        message:
          preference === "on"
            ? "Bizum activado na conta do restaurante."
            : "Configuração Bizum actualizada — confirme no painel Stripe.",
      };
    }

    const created = await stripe.paymentMethodConfigurations.create(
      BIZUM_DISPLAY,
      { stripeAccount: accountId },
    );
    return {
      enabled: created.bizum?.display_preference?.preference === "on",
      configId: created.id,
      message: "Bizum activado na conta do restaurante.",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[connect] enable bizum skipped", accountId, msg);
    return {
      enabled: false,
      configId: null,
      message: msg.includes("bizum")
        ? `Bizum ainda não disponível nesta conta: ${msg}`
        : `Não foi possível activar Bizum: ${msg}`,
    };
  }
}
