import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import type { ConnectStoreRow } from "./stripeConnectOnboard.ts";

export type CustomIntakeRow = {
  business_name: string;
  owner_full_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  iban: string;
  tax_id: string | null;
  business_address: string | null;
};

function normalizeIban(iban: string): string {
  return iban.replace(/\s/g, "").toUpperCase();
}

/** Formato aceite na Espanha: ES-B25979048 */
export function formatSpanishTaxId(taxId: string): string {
  const t = taxId.trim().toUpperCase();
  if (t.startsWith("ES-")) return t;
  if (t.startsWith("ES") && t.length > 2) return t;
  return `ES-${t}`;
}

function statementDescriptorFromName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  return (clean || "KEBAB TURCO").slice(0, 22);
}

function splitOwnerName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { first_name: parts[0] || "Titular", last_name: "—" };
  }
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

/** Extrai código postal, cidade e província de moradas espanholas comuns. */
function parseSpanishAddress(raw: string | null): Stripe.AddressParam | undefined {
  if (!raw?.trim()) return undefined;
  const text = raw.trim();
  const postalMatch = text.match(/\b(\d{5})\b/);
  const postal_code = postalMatch?.[1];
  let working = text;
  if (postal_code) {
    working = working.replace(postal_code, " ").replace(/\s+/g, " ").trim();
  }
  const segments = working
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^(España|Espanha|Spain)$/i.test(s));
  const line1 = segments[0] || text;
  let city = "Gandia";
  let state: string | undefined;
  if (segments.length >= 3) {
    city = segments[segments.length - 2] || city;
    state = segments[segments.length - 1];
  } else if (segments.length === 2) {
    city = segments[1] || city;
  }
  return {
    line1,
    city: city || "Gandia",
    ...(state ? { state } : {}),
    ...(postal_code ? { postal_code } : {}),
    country: "ES",
  };
}

function intakeComplete(intake: CustomIntakeRow | null | undefined): intake is CustomIntakeRow {
  return Boolean(
    intake?.business_name?.trim() &&
      intake?.owner_full_name?.trim() &&
      intake?.owner_email?.includes("@") &&
      normalizeIban(intake.iban).length >= 15,
  );
}

/**
 * Cria conta Connect CUSTOM (sub-conta do restaurante na plataforma) com os dados
 * do formulário admin — não abre o ecrã Express «criar conta Stripe».
 */
export async function createLiveCustomAccountFromIntake(
  stripe: Stripe,
  store: ConnectStoreRow,
  intake: CustomIntakeRow,
  requestIp: string,
): Promise<string> {
  const { first_name, last_name } = splitOwnerName(intake.owner_full_name);
  const address = parseSpanishAddress(intake.business_address);
  const taxId = intake.tax_id?.trim() || null;
  const isCompany = Boolean(taxId);

  const params: Stripe.AccountCreateParams = {
    type: "custom",
    country: "ES",
    email: intake.owner_email!,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: intake.business_name,
      url: "https://kebabturco.net",
      mcc: "5814",
      ...(address ? { support_address: address } : {}),
    },
    tos_acceptance: {
      date: Math.floor(Date.now() / 1000),
      ip: requestIp || "127.0.0.1",
      service_agreement: "full",
    },
    metadata: {
      store_id: store.id,
      platform: "kebabturco",
      environment: "live",
      connect_role: "restaurant",
    },
    settings: {
      payouts: { schedule: { interval: "weekly", weekly_anchor: "monday" } },
      payments: {
        statement_descriptor: statementDescriptorFromName(intake.business_name),
      },
    },
  };

  if (isCompany) {
    params.business_type = "company";
    params.company = {
      name: intake.business_name,
      tax_id: formatSpanishTaxId(taxId!),
      ...(address ? { address } : {}),
    };
  } else {
    params.business_type = "individual";
    params.individual = {
      first_name,
      last_name,
      email: intake.owner_email!,
      phone: intake.owner_phone ?? undefined,
      ...(address ? { address } : {}),
    };
  }

  const account = await stripe.accounts.create(params);

  if (isCompany) {
    try {
      await stripe.accounts.createPerson(account.id, {
        first_name,
        last_name,
        email: intake.owner_email!,
        phone: intake.owner_phone ?? undefined,
        ...(address ? { address } : {}),
        relationship: {
          representative: true,
          executive: true,
          owner: true,
          title: "Representante legal",
        },
      });
    } catch (e) {
      console.warn("[connect] company representative person", e);
    }
  }

  const iban = normalizeIban(intake.iban);
  try {
    const existing = await stripe.accounts.listExternalAccounts(account.id, {
      object: "bank_account",
      limit: 5,
    });
    const last4 = iban.slice(-4);
    const hasBank = existing.data.some(
      (ba) => ba.object === "bank_account" && (ba as Stripe.BankAccount).last4 === last4,
    );
    if (!hasBank) {
      await stripe.accounts.createExternalAccount(account.id, {
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
  } catch (e) {
    console.warn("[connect] custom IBAN attach", e);
  }

  return account.id;
}

export { intakeComplete, normalizeIban as normalizeIntakeIban };
