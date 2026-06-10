import type { CustomIntakeRow } from "./stripeConnectCustomProvision.ts";

export type ParsedIntakeMeta = {
  ownerDob: string | null;
  businessMcc: string | null;
  businessType: "company" | "individual" | null;
  representativeId: string | null;
};

export function parseIntakeNotes(notes: string | null | undefined): ParsedIntakeMeta {
  const out: ParsedIntakeMeta = {
    ownerDob: null,
    businessMcc: null,
    businessType: null,
    representativeId: null,
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
  }
  return out;
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
