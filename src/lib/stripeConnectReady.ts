import type { StoreFinancialProfile, StoreStripeSettings } from "@/services/orderService";

export function isStripeConnectReady(
  profile: StoreFinancialProfile | StoreStripeSettings | null | undefined,
): boolean {
  if (!profile) return false;
  const full = profile as StoreFinancialProfile;
  if (
    full.stripe_connect_test_simulated &&
    full.stripe_charges_enabled &&
    full.stripe_onboarding_completed
  ) {
    return true;
  }
  if (!profile.stripe_connect_account_id) return false;
  if (profile.stripe_charges_enabled) return true;
  if ("stripe_onboarding_completed" in full && full.stripe_onboarding_completed) return true;
  return false;
}

export function stripeConnectStatusLabel(
  profile: StoreFinancialProfile | null | undefined,
): "ready" | "pending" | "missing" {
  if (!profile?.stripe_connect_account_id) return "missing";
  if (isStripeConnectReady(profile)) return "ready";
  return "pending";
}

/** Explicação em português simples do que falta para os pagamentos online ficarem activos. */
export function stripeConnectSetupHint(
  profile: StoreFinancialProfile | StoreStripeSettings | null | undefined,
): { message: string; steps: string[] } {
  if (!profile) {
    return {
      message: "Ainda não há dados de recebimentos para esta loja.",
      steps: [
        "Admin → Recebimentos → preencha nome, e-mail e IBAN do restaurante",
        "Carregue em «Recriar conta Stripe agora»",
        "Depois «Sincronizar com Stripe»",
      ],
    };
  }
  if (!profile.stripe_connect_account_id) {
    return {
      message:
        "Os dados bancários estão guardados, mas ainda falta criar a conta Stripe Connect do restaurante.",
      steps: [
        "Admin → Recebimentos",
        "Carregue em «Recriar conta Stripe agora (apaga antigas)»",
        "Aguarde a confirmação e carregue em «Sincronizar com Stripe»",
        "Publish no Lovable se ainda não fez após a última actualização",
      ],
    };
  }
  if (!isStripeConnectReady(profile)) {
    return {
      message: "A conta Stripe existe mas o site ainda não a reconhece como activa.",
      steps: [
        "Admin → Recebimentos → «Sincronizar com Stripe»",
        "Se continuar pendente, abra o painel Stripe Connect e confirme que não há requisitos em falta",
        "Volte a Recebimentos e sincronize outra vez",
      ],
    };
  }
  return { message: "Recebimentos online activos.", steps: [] };
}
