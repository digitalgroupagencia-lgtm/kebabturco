import type { CustomIntakeRow } from "./stripeConnectCustomProvision.ts";

export type ParsedIntakeMeta = {
  ownerDob: string | null;
  businessMcc: string | null;
  businessType: "company" | "individual" | null;
  representativeId: string | null;
  linkAt: string | null;
  verifyAt: string | null;
};

export function parseIntakeNotes(notes: string | null | undefined): ParsedIntakeMeta {
  const out: ParsedIntakeMeta = {
    ownerDob: null,
    businessMcc: null,
    businessType: null,
    representativeId: null,
    linkAt: null,
    verifyAt: null,
  };
  if (!notes?.trim()) return out;
  for (const part of notes.split("|")) {
    const p = part.trim();
    if (p.startsWith("dob:")) out.ownerDob = p.slice(4).trim() || null;
    if (p.startsWith("mcc:")) out.businessMcc = p.slice(4).trim() || null;
    if (p.startsWith("biz:")) {
      const t = p.slice(4).trim();
      if (t === "company" || t === "individual") out.businessType = t;
    }
    if (p.startsWith("rep_id:")) out.representativeId = p.slice(7).trim() || null;
    if (p.startsWith("link_at:")) out.linkAt = p.slice(8).trim() || null;
    if (p.startsWith("verify_at:")) out.verifyAt = p.slice(10).trim() || null;
  }
  return out;
}

/** Mantém metadados existentes e acrescenta carimbos de actividade do link WhatsApp. */
export function mergeIntakeNotes(
  existing: string | null | undefined,
  patch: {
    ownerDob?: string;
    businessMcc?: string;
    businessType?: "company" | "individual";
    representativeId?: string;
    linkAt?: string;
    verifyAt?: string;
  },
): string | undefined {
  const meta = parseIntakeNotes(existing);
  const merged = {
    ownerDob: patch.ownerDob ?? meta.ownerDob ?? undefined,
    businessMcc: patch.businessMcc ?? meta.businessMcc ?? undefined,
    businessType: patch.businessType ?? meta.businessType ?? undefined,
    representativeId: patch.representativeId ?? meta.representativeId ?? undefined,
    linkAt: patch.linkAt ?? meta.linkAt ?? undefined,
    verifyAt: patch.verifyAt ?? meta.verifyAt ?? undefined,
  };
  const segments: string[] = [];
  if (merged.ownerDob) segments.push(`dob:${merged.ownerDob}`);
  if (merged.businessMcc) segments.push(`mcc:${merged.businessMcc}`);
  if (merged.businessType) segments.push(`biz:${merged.businessType}`);
  if (merged.representativeId) segments.push(`rep_id:${merged.representativeId}`);
  if (merged.linkAt) segments.push(`link_at:${merged.linkAt}`);
  if (merged.verifyAt) segments.push(`verify_at:${merged.verifyAt}`);
  return segments.length > 0 ? segments.join("|") : undefined;
}

export function buildIntakeNotes(parts: {
  ownerDob?: string;
  businessMcc?: string;
  businessType?: "company" | "individual";
  representativeId?: string;
}): string | undefined {
  const segments: string[] = [];
  if (parts.ownerDob?.trim()) segments.push(`dob:${parts.ownerDob.trim()}`);
  if (parts.businessMcc?.trim()) segments.push(`mcc:${parts.businessMcc.trim()}`);
  if (parts.businessType) segments.push(`biz:${parts.businessType}`);
  if (parts.representativeId?.trim()) segments.push(`rep_id:${parts.representativeId.trim()}`);
  return segments.length > 0 ? segments.join("|") : undefined;
}

/** Dados completos para API Stripe — sempre aceita termos em operações do servidor. */
export function buildServerStripeIntake(
  row: CustomIntakeRow & { notes?: string | null },
  extras?: {
    business_website?: string | null;
    owner_dob?: string | null;
    business_mcc?: string | null;
    business_type?: "company" | "individual" | null;
    representative_id?: string | null;
  },
): CustomIntakeRow {
  return enrichIntakeRow(row, {
    business_website: extras?.business_website ?? "https://kebabturco.net",
    owner_dob: extras?.owner_dob,
    business_mcc: extras?.business_mcc,
    business_type: extras?.business_type,
    representative_id: extras?.representative_id,
    accept_terms: true,
  });
}

export function intakeMissingFields(intake: CustomIntakeRow | null | undefined): string[] {
  const missing: string[] = [];
  if (!intake?.business_name?.trim()) missing.push("business_name");
  if (!intake?.owner_full_name?.trim()) missing.push("owner_full_name");
  if (!intake?.owner_email?.includes("@")) missing.push("owner_email");
  if (!intake?.owner_phone?.trim()) missing.push("owner_phone");
  if (!intake?.tax_id?.trim()) missing.push("tax_id");
  if (!intake?.business_address?.trim()) missing.push("business_address");
  if (!intake?.owner_dob?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(intake.owner_dob.trim())) {
    missing.push("owner_dob");
  }
  if (!intake?.business_mcc?.trim()) missing.push("business_mcc");
  if (!intake?.business_type) missing.push("business_type");
  const iban = intake?.iban?.replace(/\s/g, "").toUpperCase() ?? "";
  if (iban.length < 15) missing.push("iban");
  if (intake?.accept_terms !== true) missing.push("accept_terms");
  return missing;
}

export function enrichIntakeRow(
  row: CustomIntakeRow & { notes?: string | null },
  extras?: {
    business_website?: string | null;
    owner_dob?: string | null;
    business_mcc?: string | null;
    business_type?: "company" | "individual" | null;
    representative_id?: string | null;
    accept_terms?: boolean;
  },
): CustomIntakeRow {
  const meta = parseIntakeNotes(row.notes);
  return {
    ...row,
    business_website: extras?.business_website?.trim() || row.business_website?.trim() || null,
    owner_dob: extras?.owner_dob ?? meta.ownerDob ?? row.owner_dob ?? null,
    business_mcc: extras?.business_mcc ?? meta.businessMcc ?? row.business_mcc ?? "5814",
    business_type:
      extras?.business_type ?? meta.businessType ?? row.business_type ?? (row.tax_id ? "company" : "individual"),
    representative_id: extras?.representative_id ?? meta.representativeId ?? row.representative_id ?? null,
    accept_terms: extras?.accept_terms ?? row.accept_terms ?? false,
  };
}
