const MIN_CONNECT_VERSION = "2026-06-12-public-sync-v27";

export type StripeEdgeHealth = {
  service: string;
  handlerVersion: string | null;
  publicSync: boolean;
  ok: boolean;
};

export async function fetchStripeConnectEdgeHealth(): Promise<StripeEdgeHealth | null> {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  if (!base) return null;
  try {
    const res = await fetch(`${base}/functions/v1/stripe-connect-onboard`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      service?: string;
      handlerVersion?: string;
      publicSync?: boolean;
    };
    return {
      service: data.service ?? "stripe-connect-onboard",
      handlerVersion: data.handlerVersion ?? null,
      publicSync: data.publicSync === true,
      ok: data.ok === true,
    };
  } catch {
    return null;
  }
}

export function isStripeConnectEdgeUpToDate(health: StripeEdgeHealth | null): boolean {
  if (!health?.handlerVersion) return false;
  if (health.publicSync) return true;
  return health.handlerVersion >= MIN_CONNECT_VERSION;
}

export const STRIPE_EDGE_DEPLOY_HINT =
  "Na Lovable, no chat, escreva exactamente: Deploy all Supabase edge functions (stripe-connect-onboard and stripe-create-payment-intent). Depois Sync + Publish.";
