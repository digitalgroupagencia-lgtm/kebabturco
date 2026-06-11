import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import type { ConnectStoreRow } from "./stripeConnectOnboard.ts";

export const DEFAULT_BUSINESS_WEBSITE = "https://kebabturco.net";

export type CustomIntakeRow = {
  business_name: string;
  owner_full_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  owner_dob?: string | null;
  iban: string;
  tax_id: string | null;
  business_address: string | null;
  business_website?: string | null;
  business_mcc?: string | null;
  business_type?: "company" | "individual" | null;
  representative_id?: string | null;
  accept_terms?: boolean;
};

function parseOwnerDob(raw: string | null | undefined): Stripe.PersonCreateParams.Dob | undefined {
  if (!raw?.trim()) return undefined;
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  return { year: m[1], month: m[2], day: m[3] };
}

function normalizeIban(iban: string): string {
  return iban.replace(/\s/g, "").toUpperCase();
}

/** CIF/NIF espanhol sem prefixo país — Stripe Connect ES espera só o identificador. */
export function formatSpanishTaxId(taxId: string): string {
  const t = taxId.trim().toUpperCase().replace(/\s/g, "");
  if (t.startsWith("ES-")) return t.slice(3);
  if (t.startsWith("ES") && t.length > 2) return t.slice(2);
  return t;
}

/** Controller obrigatório para contas Custom (evita Express com requirement_collection stripe). */
export function customConnectController(): Stripe.AccountCreateParams.Controller {
  return {
    stripe_dashboard: { type: "none" },
    losses: { payments: "application" },
    fees: { payer: "application" },
    requirement_collection: "application",
  };
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

function businessWebsite(intake: CustomIntakeRow): string {
  const raw = intake.business_website?.trim();
  if (raw && /^https?:\/\//i.test(raw)) return raw;
  return DEFAULT_BUSINESS_WEBSITE;
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
      intake?.owner_phone?.trim() &&
      intake?.tax_id?.trim() &&
      intake?.business_address?.trim() &&
      intake?.owner_dob?.trim() &&
      /^\d{4}-\d{2}-\d{2}$/.test(intake.owner_dob.trim()) &&
      intake?.business_mcc?.trim() &&
      intake?.business_type &&
      intake?.representative_id?.trim() &&
      normalizeIban(intake.iban).length >= 15 &&
      intake?.accept_terms === true,
  );
}

/** Conta Stripe incompleta — precisa recriar ou reparar (ex.: Gandia restrita sem IBAN/e-mail). */
export function isStripeAccountCriticallyIncomplete(acct: Stripe.Account): boolean {
  if (acct.type !== "custom") return true;
  if (!acct.email) return true;
  if (!acct.business_type) return true;
  if (!acct.business_profile?.url) return true;
  if (!acct.tos_acceptance?.date) return true;
  const due = [
    ...(acct.requirements?.currently_due ?? []),
    ...(acct.requirements?.past_due ?? []),
  ];
  return due.some(
    (field) =>
      field.includes("business_profile.url") ||
      field.includes("business_type") ||
      field.includes("external_account") ||
      field.includes("tos_acceptance") ||
      field.includes("company.tax_id") ||
      field.includes("company.address") ||
      field.includes("individual.email"),
  );
}

async function attachIbanToAccount(
  stripe: Stripe,
  accountId: string,
  intake: CustomIntakeRow,
  isCompany: boolean,
): Promise<void> {
  const iban = normalizeIban(intake.iban);
  if (iban.length < 15) return;
  const existing = await stripe.accounts.listExternalAccounts(accountId, {
    object: "bank_account",
    limit: 10,
  });
  const last4 = iban.slice(-4);
  const hasBank = existing.data.some(
    (ba) => ba.object === "bank_account" && (ba as Stripe.BankAccount).last4 === last4,
  );
  if (!hasBank) {
    await stripe.accounts.createExternalAccount(accountId, {
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
}

async function ensureCompanyRepresentative(
  stripe: Stripe,
  accountId: string,
  intake: CustomIntakeRow,
  address: Stripe.AddressParam | undefined,
): Promise<void> {
  const { first_name, last_name } = splitOwnerName(intake.owner_full_name);
  const dob = parseOwnerDob(intake.owner_dob);
  const persons = await stripe.accounts.listPersons(accountId, { limit: 5 });
  const existing = persons.data.find((p) => p.relationship?.representative);
  const repId = intake.representative_id?.trim().toUpperCase().replace(/\s/g, "");
  const personPayload = {
    first_name,
    last_name,
    email: intake.owner_email!,
    phone: intake.owner_phone ?? undefined,
    nationality: "ES",
    ...(dob ? { dob } : {}),
    ...(address ? { address } : {}),
    ...(repId ? { id_number: repId } : {}),
    relationship: {
      representative: true,
      executive: true,
      owner: true,
      title: "Representante legal",
      percent_ownership: 100,
    },
  };
  if (existing?.id) {
    await stripe.accounts.updatePerson(accountId, existing.id, personPayload);
    return;
  }
  await stripe.accounts.createPerson(accountId, personPayload);
}

/** Qualquer requisito Stripe ainda em falta — abre onboarding embutido no nosso site. */
export function accountNeedsEmbeddedCompletionStep(acct: Stripe.Account): boolean {
  const due = [
    ...(acct.requirements?.currently_due ?? []),
    ...(acct.requirements?.past_due ?? []),
  ];
  return due.length > 0;
}

/** @deprecated use accountNeedsEmbeddedCompletionStep */
export function accountNeedsOwnerVerificationStep(acct: Stripe.Account): boolean {
  return accountNeedsEmbeddedCompletionStep(acct);
}

function buildAccountCoreFields(
  intake: CustomIntakeRow,
  requestIp: string,
): {
  isCompany: boolean;
  address: Stripe.AddressParam | undefined;
  params: Pick<
    Stripe.AccountCreateParams,
    "email" | "business_profile" | "business_type" | "company" | "individual" | "tos_acceptance" | "settings"
  >;
} {
  const { first_name, last_name } = splitOwnerName(intake.owner_full_name);
  const address = parseSpanishAddress(intake.business_address);
  const taxId = intake.tax_id?.trim() || null;
  const isCompany =
    intake.business_type === "company" ||
    (intake.business_type !== "individual" && Boolean(taxId));
  const website = businessWebsite(intake);
  const mcc = intake.business_mcc?.trim() || "5814";

  const params: Pick<
    Stripe.AccountCreateParams,
    "email" | "business_profile" | "business_type" | "company" | "individual" | "tos_acceptance" | "settings"
  > = {
    email: intake.owner_email!,
    business_profile: {
      name: intake.business_name,
      url: website,
      mcc,
      product_description: "Restauración y comida para llevar",
      support_email: intake.owner_email!,
      support_phone: intake.owner_phone ?? undefined,
      ...(address ? { support_address: address } : {}),
    },
    tos_acceptance: intake.accept_terms
      ? {
          date: Math.floor(Date.now() / 1000),
          ip: requestIp || "127.0.0.1",
          service_agreement: "full",
        }
      : undefined,
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
      phone: intake.owner_phone ?? undefined,
      structure: "private_corporation",
      ...(address ? { address } : {}),
    };
  } else {
    const dob = parseOwnerDob(intake.owner_dob);
    params.business_type = "individual";
    params.individual = {
      first_name,
      last_name,
      email: intake.owner_email!,
      phone: intake.owner_phone ?? undefined,
      ...(dob ? { dob } : {}),
      ...(address ? { address } : {}),
    };
  }

  return { isCompany, address, params };
}

/**
 * Actualiza conta Custom existente com TODOS os campos obrigatórios Stripe Espanha.
 */
export async function syncLiveCustomAccountFromIntake(
  stripe: Stripe,
  accountId: string,
  intake: CustomIntakeRow,
  requestIp: string,
): Promise<void> {
  const { isCompany, address, params } = buildAccountCoreFields(intake, requestIp);

  await stripe.accounts.update(accountId, {
    ...params,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  if (!intake.accept_terms) {
    throw new Error("Términos de servicio no aceptados.");
  }

  if (isCompany) {
    await ensureCompanyRepresentative(stripe, accountId, intake, address);
  }

  await attachIbanToAccount(stripe, accountId, intake, isCompany);
}

/**
 * Cria conta Connect CUSTOM com todos os dados obrigatórios do formulário admin.
 */
export async function createLiveCustomAccountFromIntake(
  stripe: Stripe,
  store: ConnectStoreRow,
  intake: CustomIntakeRow,
  requestIp: string,
): Promise<string> {
  const { isCompany, address, params } = buildAccountCoreFields(intake, requestIp);

  const account = await stripe.accounts.create({
    type: "custom",
    country: "ES",
    controller: customConnectController(),
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      store_id: store.id,
      platform: "kebabturco",
      environment: "live",
      connect_role: "restaurant",
      account_type: "custom",
    },
    ...params,
  });

  if (!intake.accept_terms) {
    throw new Error("Términos de servicio no aceptados.");
  }

  if (isCompany) {
    await ensureCompanyRepresentative(stripe, account.id, intake, address);
  }

  await attachIbanToAccount(stripe, account.id, intake, isCompany);

  return account.id;
}

export { intakeComplete, normalizeIban as normalizeIntakeIban };
