import type Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { isSimulatedConnectAccountId } from "./stripeConnectSync.ts";

/** Repasses automáticos só nas contas Connect dos restaurantes (segundas-feiras). */
export const RESTAURANT_PAYOUT_SCHEDULE = {
  interval: "weekly" as const,
  weekly_anchor: "monday" as const,
};

export type PayoutPolicyResult = {
  platformInterval: string;
  platformUpdated: boolean;
  restaurantInterval: string | null;
  restaurantUpdated: boolean;
};

async function ensurePlatformManualPayouts(
  stripe: Stripe,
): Promise<{ interval: string; updated: boolean }> {
  const account = await stripe.accounts.retrieve();
  const interval = account.settings?.payouts?.schedule?.interval ?? "unknown";
  if (interval === "manual") {
    return { interval, updated: false };
  }
  await stripe.accounts.update(account.id, {
    settings: {
      payouts: {
        schedule: { interval: "manual" },
      },
    },
  });
  return { interval: "manual", updated: true };
}

async function ensureRestaurantWeeklyPayouts(
  stripe: Stripe,
  connectedAccountId: string,
): Promise<{ interval: string; updated: boolean }> {
  const account = await stripe.accounts.retrieve(connectedAccountId);
  const schedule = account.settings?.payouts?.schedule;
  const interval = schedule?.interval ?? "unknown";
  const anchor = schedule?.weekly_anchor ?? null;
  if (interval === "weekly" && anchor === "monday") {
    return { interval, updated: false };
  }
  await stripe.accounts.update(connectedAccountId, {
    settings: {
      payouts: {
        schedule: RESTAURANT_PAYOUT_SCHEDULE,
        debit_negative_balances: true,
      },
    },
  });
  return { interval: "weekly", updated: true };
}

/**
 * Plataforma (Euro Business Group): repasses MANUAIS — comissões ficam no saldo Stripe.
 * Restaurante (Connect): repasses AUTOMÁTICOS semanais para o IBAN do restaurante.
 */
export async function applyConnectPayoutPolicy(
  stripe: Stripe,
  connectedAccountId?: string | null,
): Promise<PayoutPolicyResult> {
  const platform = await ensurePlatformManualPayouts(stripe);
  let restaurantInterval: string | null = null;
  let restaurantUpdated = false;

  if (connectedAccountId && !isSimulatedConnectAccountId(connectedAccountId)) {
    const restaurant = await ensureRestaurantWeeklyPayouts(stripe, connectedAccountId);
    restaurantInterval = restaurant.interval;
    restaurantUpdated = restaurant.updated;
  }

  return {
    platformInterval: platform.interval,
    platformUpdated: platform.updated,
    restaurantInterval,
    restaurantUpdated,
  };
}
