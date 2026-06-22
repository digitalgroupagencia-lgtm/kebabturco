import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { pickStripeSecretForEnvironment } from "./stripeEnv.ts";
import {
  loadStoreConnectPaymentRow,
  resolveStoreConnectEnvironment,
} from "./stripeStoreConnect.ts";

export type TerminalAddressInput = {
  line1?: string;
  city?: string;
  country?: string;
  postal_code?: string;
};

export type TerminalAddress = {
  line1: string;
  city: string;
  country: string;
  postal_code: string;
};

const DEFAULT_ADDRESS: TerminalAddress = {
  line1: "Calle Principal 1",
  city: "Gandia",
  country: "ES",
  postal_code: "46700",
};

/** Parse free-text store address into Stripe Terminal location fields. */
export function resolveTerminalAddress(
  storeAddress: string | null | undefined,
  override?: TerminalAddressInput | null,
): TerminalAddress {
  if (override?.line1?.trim() && override?.city?.trim() && override?.country?.trim() && override?.postal_code?.trim()) {
    return {
      line1: override.line1.trim().slice(0, 200),
      city: override.city.trim().slice(0, 100),
      country: override.country.trim().toUpperCase().slice(0, 2),
      postal_code: override.postal_code.trim().slice(0, 20),
    };
  }

  const raw = storeAddress?.trim();
  if (!raw) return { ...DEFAULT_ADDRESS };

  const postalMatch = raw.match(/\b(\d{5})\b/);
  const postal_code = postalMatch?.[1] ?? DEFAULT_ADDRESS.postal_code;

  const parts = raw.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const line1 = parts[0].slice(0, 200);
    const city = parts[parts.length - 1].replace(/\b\d{5}\b/g, "").trim().slice(0, 100) ||
      DEFAULT_ADDRESS.city;
    return {
      line1: line1 || DEFAULT_ADDRESS.line1,
      city: city || DEFAULT_ADDRESS.city,
      country: "ES",
      postal_code,
    };
  }

  return {
    line1: raw.slice(0, 200),
    city: DEFAULT_ADDRESS.city,
    country: "ES",
    postal_code,
  };
}

export async function createTerminalLocationForStore(
  service: SupabaseClient,
  storeId: string,
  options?: {
    displayName?: string;
    address?: TerminalAddressInput;
    force?: boolean;
  },
): Promise<{
  locationId: string;
  displayName: string;
  stripeConnectAccountId: string;
  created: boolean;
}> {
  const { data: storeRow, error: storeErr } = await service
    .from("stores")
    .select("id, name, address, stripe_business_name, stripe_terminal_location_id, stripe_connect_account_id, stripe_charges_enabled, stripe_connect_environment, stripe_connect_test_simulated")
    .eq("id", storeId)
    .maybeSingle();

  if (storeErr || !storeRow) {
    throw new Error("Loja não encontrada");
  }

  const loaded = await loadStoreConnectPaymentRow(service, storeId);
  const store = loaded.store ?? storeRow;

  if (!store.stripe_connect_account_id?.trim() || store.stripe_connect_account_id.startsWith("simulated-")) {
    throw new Error("Conta Stripe Connect inválida para Terminal");
  }
  if (!store.stripe_charges_enabled) {
    throw new Error("Recebimentos Stripe ainda não activos para esta loja");
  }

  const existing = store.stripe_terminal_location_id?.trim();
  if (existing && !options?.force) {
    return {
      locationId: existing,
      displayName: options?.displayName || store.stripe_business_name || store.name,
      stripeConnectAccountId: store.stripe_connect_account_id,
      created: false,
    };
  }

  const connectEnv = await resolveStoreConnectEnvironment(store);
  const stripeKey = pickStripeSecretForEnvironment(
    connectEnv === "test" || store.stripe_connect_test_simulated ? "test" : connectEnv,
  );
  if (!stripeKey) {
    throw new Error("Stripe não configurada no servidor");
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const displayName = (options?.displayName || store.stripe_business_name || store.name || "Restaurante")
    .trim()
    .slice(0, 100);
  const address = resolveTerminalAddress(store.address, options?.address);

  const location = await stripe.terminal.locations.create(
    {
      display_name: displayName,
      address,
    },
    { stripeAccount: store.stripe_connect_account_id },
  );

  const { error: updateErr } = await service
    .from("stores")
    .update({
      stripe_terminal_location_id: location.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);

  if (updateErr) {
    throw new Error(`Location criada (${location.id}) mas falhou ao guardar na BD: ${updateErr.message}`);
  }

  return {
    locationId: location.id,
    displayName,
    stripeConnectAccountId: store.stripe_connect_account_id,
    created: true,
  };
}
