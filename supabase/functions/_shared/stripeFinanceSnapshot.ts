import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { isSimulatedConnectAccountId } from "./stripeConnectSync.ts";

export type FinanceSnapshotPayload = {
  availableCents: number;
  pendingCents: number;
  payoutInterval: "daily" | "weekly" | "monthly" | "manual";
  payoutWeekday: string | null;
  nextPayoutDate: string | null;
  nextPayoutAmountCents: number | null;
  ibanLast4: string | null;
  simulated: boolean;
};

function weekdayLabel(anchor: string | undefined): string | null {
  const map: Record<string, string> = {
    monday: "segunda-feira",
    tuesday: "terça-feira",
    wednesday: "quarta-feira",
    thursday: "quinta-feira",
    friday: "sexta-feira",
    saturday: "sábado",
    sunday: "domingo",
  };
  return anchor ? map[anchor] ?? anchor : null;
}

function nextMondayIso(from = new Date()): string {
  const d = new Date(from);
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().slice(0, 10);
}

export async function buildRestaurantFinanceSnapshot(
  stripe: Stripe,
  accountId: string,
  options?: { ledgerNetCents?: number },
): Promise<FinanceSnapshotPayload> {
  if (isSimulatedConnectAccountId(accountId)) {
    const net = Math.max(0, options?.ledgerNetCents ?? 0);
    return {
      availableCents: net,
      pendingCents: 0,
      payoutInterval: "weekly",
      payoutWeekday: "segunda-feira",
      nextPayoutDate: nextMondayIso(),
      nextPayoutAmountCents: net > 0 ? net : null,
      ibanLast4: "0000",
      simulated: true,
    };
  }

  const account = await stripe.accounts.retrieve(accountId);
  const schedule = account.settings?.payouts?.schedule;
  const interval = (schedule?.interval as FinanceSnapshotPayload["payoutInterval"]) ?? "weekly";
  const payoutWeekday = weekdayLabel(schedule?.weekly_anchor);

  let ibanLast4: string | null = null;
  try {
    const external = await stripe.accounts.listExternalAccounts(accountId, {
      object: "bank_account",
      limit: 1,
    });
    const bank = external.data[0] as Stripe.BankAccount | undefined;
    if (bank?.last4) ibanLast4 = bank.last4;
  } catch {
    /* optional */
  }

  const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId });
  const availableCents = balance.available.find((b) => b.currency === "eur")?.amount ?? 0;
  const pendingCents = balance.pending.find((b) => b.currency === "eur")?.amount ?? 0;

  let nextPayoutDate: string | null = null;
  let nextPayoutAmountCents: number | null = null;
  try {
    const upcoming = await stripe.payouts.list(
      { status: "pending", limit: 3 },
      { stripeAccount: accountId },
    );
    const next = upcoming.data[0];
    if (next) {
      nextPayoutAmountCents = next.amount;
      if (next.arrival_date) {
        nextPayoutDate = new Date(next.arrival_date * 1000).toISOString().slice(0, 10);
      }
    }
  } catch {
    /* optional */
  }

  if (!nextPayoutDate && interval === "weekly" && availableCents > 0) {
    nextPayoutDate = nextMondayIso();
    nextPayoutAmountCents = availableCents;
  }

  return {
    availableCents,
    pendingCents,
    payoutInterval: interval,
    payoutWeekday,
    nextPayoutDate,
    nextPayoutAmountCents,
    ibanLast4,
    simulated: false,
  };
}
