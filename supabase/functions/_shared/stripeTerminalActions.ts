import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { pickStripeSecretForEnvironment } from "./stripeEnv.ts";
import {
  loadStoreConnectPaymentRow,
  resolveStoreConnectEnvironment,
} from "./stripeStoreConnect.ts";
import { verifyTerminalLocationForStore } from "./stripeTerminalLocation.ts";

export async function assertStaffTerminalAccess(
  service: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: roles } = await service.from("user_roles").select("role").eq("user_id", userId);
  return (roles ?? []).some((r) =>
    ["admin_master", "restaurant_admin", "operator", "cashier", "seller"].includes(r.role as string),
  );
}

export async function authenticateStaffTerminalRequest(
  req: Request,
):
  | { ok: true; service: SupabaseClient }
  | { ok: false; error: string; status: number } {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, error: "Autenticação necessária", status: 401 };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Sessão inválida", status: 401 };
  }

  const service = createClient(supabaseUrl, serviceKey);
  if (!(await assertStaffTerminalAccess(service, userData.user.id))) {
    return { ok: false, error: "Sem permissão", status: 403 };
  }

  return { ok: true, service };
}

export async function createTerminalConnectionTokenPayload(
  service: SupabaseClient,
  storeId: string,
  stripeAccountParam = "",
): Promise<{
  secret: string;
  stripeConnectAccountId: string;
  stripeTerminalLocationId: string | null;
}> {
  const loaded = await loadStoreConnectPaymentRow(service, storeId);
  const store = loaded.store;
  if (!store?.stripe_connect_account_id || !store.stripe_charges_enabled) {
    throw new Error("Recebimentos Stripe ainda não activos para esta loja");
  }

  const connectAccountId = store.stripe_connect_account_id.trim();
  if (!connectAccountId || connectAccountId.startsWith("simulated-")) {
    throw new Error("Conta Stripe Connect inválida para Terminal");
  }

  if (stripeAccountParam && stripeAccountParam !== connectAccountId) {
    throw new Error("stripeAccount não corresponde à loja indicada");
  }

  const connectEnv = await resolveStoreConnectEnvironment(store);
  const stripeKey = pickStripeSecretForEnvironment(
    connectEnv === "test" || store.stripe_connect_test_simulated ? "test" : connectEnv,
  );
  if (!stripeKey) {
    throw new Error("Stripe não configurada no servidor");
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const connectionToken = await stripe.terminal.connectionTokens.create(
    {},
    { stripeAccount: connectAccountId },
  );

  return {
    secret: connectionToken.secret,
    stripeConnectAccountId: connectAccountId,
    stripeTerminalLocationId: store.stripe_terminal_location_id ?? null,
  };
}

export async function verifyTerminalLocationPayload(
  service: SupabaseClient,
  storeId: string,
) {
  return verifyTerminalLocationForStore(service, storeId);
}
